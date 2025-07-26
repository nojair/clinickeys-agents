// packages/core/src/application/services/KommoService.ts

import { KommoContactCustomFieldDefinition, KommoLeadCustomFieldDefinition } from '@clinickeys-agents/core/infrastructure/integrations/kommo';
import { KommoCustomFieldExistence } from '@clinickeys-agents/core/application/services/types';
import { Logger } from '@clinickeys-agents/core/infrastructure/external';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import {
  getKommoMapFields,
  getKommoRelevantFields,
  buildCustomFieldsValues,
  getCustomFieldValue,
  shouldLambdaContinue
} from '@clinickeys-agents/core/utils';

import type { NotificationDTO, NotificationPayload } from '@clinickeys-agents/core/domain/notification/';
import type { IPatientRepository } from '@clinickeys-agents/core/domain/patient/IPatientRepository';
import type { BotConfigDTO } from '@clinickeys-agents/core/domain/botConfig';
import type { profiles } from '@clinickeys-agents/core/utils';
import type { CountryCode } from 'libphonenumber-js';
import type { IKommoRepository } from '@clinickeys-agents/core/domain/crm';
import type { LeadMap, ContactMap } from "@clinickeys-agents/core/infrastructure/integrations/kommo";

interface EnsureLeadParams {
  botConfig: BotConfigDTO;
  notification: NotificationDTO;
}

export class KommoService {
  private kommoRepository: IKommoRepository;
  private patientRepository: IPatientRepository;
  private customFieldMappingsCache: { leadMap: LeadMap; contactMap: ContactMap } | null = null;

  constructor(kommoRepository: IKommoRepository, patientRepository: IPatientRepository) {
    this.kommoRepository = kommoRepository;
    this.patientRepository = patientRepository;
  }

  private async loadCustomFieldMappings() {
    if (this.customFieldMappingsCache) return this.customFieldMappingsCache;
    const [leadFields, contactFields] = await Promise.all([
      this.kommoRepository.fetchCustomFields('leads'),
      this.kommoRepository.fetchCustomFields('contacts')
    ]);
    const leadMap = getKommoMapFields<KommoLeadCustomFieldDefinition>(leadFields);
    const contactMap = getKommoMapFields<KommoContactCustomFieldDefinition>(contactFields);
    this.customFieldMappingsCache = { leadMap, contactMap };
    return this.customFieldMappingsCache;
  }

  async ensureLead({ botConfig, notification }: EnsureLeadParams): Promise<string> {
    const payload: NotificationPayload | undefined = notification.payload;
    if (!payload) throw new Error('Notification payload is required');

    const phoneIntl = (() => {
      const p = parsePhoneNumberFromString(payload.patient_phone ?? '', botConfig.defaultCountry as CountryCode);
      const num = p ? p.number : payload.patient_phone;
      Logger.info('[ensureLead] teléfono normalizado', { original: payload.patient_phone, normalizado: num });
      return num;
    })();

    // PASO 1: Consultar kommoLeadId guardado en BD
    let kommoLeadIdEnBD: string | undefined;
    try {
      kommoLeadIdEnBD = await this.patientRepository.getKommoLeadId(payload.patientId);
      Logger.info('[KommoService.ensureLead] lead ID en BD', { bd_lead_id: kommoLeadIdEnBD });
    } catch (e: any) {
      Logger.error('[KommoService.ensureLead][ERROR] al consultar kommoLeadId en patientRepository', { error: e.message, stack: e.stack });
    }

    if (kommoLeadIdEnBD) {
      // PASO 2: Verificar que el lead exista en Kommo
      Logger.info('[KommoService.ensureLead] verificando existencia del lead en Kommo…');
      const okLead = await this.kommoRepository.getLeadById({ leadId: kommoLeadIdEnBD });
      if (okLead) {
        Logger.info('[KommoService.ensureLead] lead válido en Kommo — FIN', { leadId: kommoLeadIdEnBD });
        return kommoLeadIdEnBD;
      }
      Logger.info('[KommoService.ensureLead] lead NO existe en Kommo — se recreará');
    }

    // PASO 3: Buscar contacto por teléfono en Kommo
    let contactId: string | undefined;
    let leadId: string | undefined;
    const found = await this.kommoRepository.searchContactByPhone({ phone: phoneIntl });
    if (found && found._embedded?.contacts?.length) {
      const contact = found._embedded.contacts[0];
      contactId = contact.id;
      if (contact._embedded?.leads?.length) {
        leadId = contact._embedded.leads[0].id;
      }
      Logger.info('[KommoService.ensureLead] contacto EXISTENTE', { contactId, leadId });
    } else {
      Logger.info('[KommoService.ensureLead] contacto NO encontrado');
    }

    const { leadMap, contactMap } = await this.loadCustomFieldMappings();
    const { addingKommoContactFields, kommoLeadCustomFields } = getKommoRelevantFields(botConfig.fieldsProfile as keyof typeof profiles);

    // PASO 4: Crear contacto si no existe
    if (!contactId) {
      const contactPayload = [
        {
          name: `${payload.patientFirstName} ${payload.patientLastName}`,
          custom_fields_values: buildCustomFieldsValues({
            fields: addingKommoContactFields,
            fieldMap: contactMap,
            notification,
            payload,
            type: 'contact'
          })
        },
      ];
      let contactRes;
      try {
        contactRes = await this.kommoRepository.createContact({ body: contactPayload });
      } catch (e: any) {
        Logger.error('[KommoService.ensureLead][ERROR] Fallo creando contacto', { error: e.message, stack: e.stack });
        throw e;
      }
      contactId = contactRes?._embedded?.contacts?.[0]?.id;
      if (!contactId) {
        throw new Error('[KommoService.ensureLead] No se pudo obtener el contactId después de crear el contacto');
      }
      Logger.info('[KommoService.ensureLead] contacto creado', { contactId });
    }

    // PASO 5: Crear lead si no existe
    if (!leadId) {
      const leadPayload = [
        {
          name: `${payload.patientFirstName} ${payload.patientLastName}`,
          _embedded: { contacts: [{ id: contactId, is_main: true }] },
          custom_fields_values: buildCustomFieldsValues({
            fields: kommoLeadCustomFields,
            fieldMap: leadMap,
            notification,
            payload,
            type: 'lead'
          })
        },
      ];
      let leadRes;
      try {
        leadRes = await this.kommoRepository.createLead({ body: leadPayload });
      } catch (e: any) {
        Logger.error('[KommoService.ensureLead][ERROR] Fallo creando lead', { error: e.message, stack: e.stack });
        throw e;
      }
      leadId = leadRes?._embedded?.leads?.[0]?.id;
      if (!leadId) {
        throw new Error('[KommoService.ensureLead] No se pudo obtener el leadId después de crear el lead');
      }
      Logger.info('[KommoService.ensureLead] lead creado', { leadId });
    }

    try {
      await this.patientRepository.updateKommoLeadId(payload.patientId, leadId!);
      Logger.info('[KommoService.ensureLead] BD actualizada con nuevo leadId', { leadId });
    } catch (e: any) {
      Logger.error('[KommoService.ensureLead][ERROR] Fallo al actualizar la BD', { error: e.message, stack: e.stack });
    }

    Logger.info('[KommoService.ensureLead] <<< FIN OK', { leadId });
    return leadId!;
  }

  async updateLeadCustomFields({
    botConfig,
    leadId,
    notification
  }: {
    botConfig: BotConfigDTO,
    leadId: string,
    notification: NotificationDTO
  }): Promise<void> {
    const { leadMap } = await this.loadCustomFieldMappings();
    const { kommoLeadCustomFields } = getKommoRelevantFields(botConfig.fieldsProfile as keyof typeof profiles);
    if (!notification.payload) {
      throw new Error('Notification payload is required');
    }
    const payload: NotificationPayload = notification.payload;
    const custom_fields_values = buildCustomFieldsValues({
      fields: kommoLeadCustomFields,
      fieldMap: leadMap,
      notification,
      payload,
      type: 'lead'
    });
    if (custom_fields_values.length > 0) {
      await this.kommoRepository.patchLead({
        leadId,
        payload: { custom_fields_values },
      });
    }
  }

  async getKommoLeadsCustomFields(configFields: string[]): Promise<KommoCustomFieldExistence[]> {
    const fetchedFields: KommoLeadCustomFieldDefinition[] = await this.kommoRepository.fetchCustomFields('leads');
    const namesSet = new Set(fetchedFields.map((field) => field.name));
    return configFields.map((name) => ({ field_name: name, exists: namesSet.has(name) }));
  }

  public async replyToLead({
    leadId,
    customFields,
    mergedCustomFields,
    delayMs = 10000,
    salesbotId
  }: {
    botConfig: BotConfigDTO;
    leadId: string;
    notification: NotificationDTO;
    customFields: Record<string, string>;
    mergedCustomFields: { id: string | number; name: string; value: string }[];
    delayMs?: number;
    salesbotId: number;
  }) {
    // 1. Obtener el lead actual
    const latestLead = await this.kommoRepository.getLeadById({ leadId });
    if (!latestLead) {
      throw new Error('latestLead is null');
    }
    const initialUserMessage = getCustomFieldValue(latestLead.custom_fields_values || [], 'patientMessage');

    // 2. Esperar y verificar si el mensaje sigue igual
    const shouldProceed = await shouldLambdaContinue({
      latestLead,
      initialValue: initialUserMessage,
      fieldName: 'patientMessage',
      delayMs
    });
    if (!shouldProceed) {
      Logger.info(`[replyToLead] Abortado para lead ${leadId}: patientMessage cambió`);
      return { aborted: true };
    }

    // 3. Armar payload patch de lead (solo campos actualizados)
    const custom_fields_values = mergedCustomFields
      .map((cf) => {
        if (!(cf.name in customFields)) return null;
        return {
          field_id: cf.id,
          values: [{ value: customFields[cf.name] }],
        };
      })
      .filter(Boolean);

    Logger.info('[replyToLead] custom_fields_values:', custom_fields_values);

    // 4. PATCH lead en Kommo
    await this.kommoRepository.patchLead({
      leadId,
      payload: { custom_fields_values }
    });

    // 5. Ejecutar salesbot
    await this.kommoRepository.runSalesbot({
      leadId: leadId,
      botId: salesbotId
    });

    return { success: true };
  }
}
