// packages/core/src/application/services/KommoService.ts

import { formatVisitDate, formatVisitTime, getKommoMapFields, getKommoRelevantFields, PAYLOAD_FIELD_MAP } from '@clinickeys-agents/core/utils';
import { KommoCustomFieldExistence } from '@clinickeys-agents/core/application/services/types/KommoCustomFieldExistence';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import {
  KommoApiGateway,
  getLeadFieldId,
  getContactFieldData,
  KommoContactCustomFieldDefinition,
  KommoLeadCustomFieldDefinition,
} from '@clinickeys-agents/core/infrastructure/integrations/kommo';

import type { NotificationDTO, NotificationPayload } from '@clinickeys-agents/core/domain/notification/dtos';
import type { BotConfigDTO } from '@clinickeys-agents/core/domain/botConfig';
import type { profiles } from '@clinickeys-agents/core/utils';
import type { CountryCode } from 'libphonenumber-js';
import type { LeadMap, ContactMap } from '@clinickeys-agents/core/infrastructure/integrations/kommo/Mappers';
import type { ContactFieldConfig, LeadFieldConfig } from '@clinickeys-agents/core/utils/helpers';
import type { IPatientRepository } from '@clinickeys-agents/core/domain/patient/IPatientRepository';

interface EnsureLeadParams {
  botConfig: BotConfigDTO;
  notification: NotificationDTO;
}

export class KommoService {
  private gateway: KommoApiGateway;
  private patientRepository: IPatientRepository;
  private clinicFieldCache: { leadMap: LeadMap; contactMap: ContactMap } | null = null;

  constructor(gateway: KommoApiGateway, patientRepository: IPatientRepository) {
    this.gateway = gateway;
    this.patientRepository = patientRepository;
  }

  private async loadClinicFieldMappings(botConfig: BotConfigDTO) {
    if (this.clinicFieldCache) return this.clinicFieldCache;
    const [leadFields, contactFields] = await Promise.all([
      this.gateway.fetchCustomFields('leads'),
      this.gateway.fetchCustomFields('contacts')
    ]);
    const leadMap = getKommoMapFields<KommoLeadCustomFieldDefinition>(leadFields);
    const contactMap = getKommoMapFields<KommoContactCustomFieldDefinition>(contactFields);
    this.clinicFieldCache = { leadMap, contactMap };
    return this.clinicFieldCache;
  }

  public async getClinicFieldMappings(botConfig: BotConfigDTO): Promise<{ leadMap: LeadMap; contactMap: ContactMap }> {
    return this.loadClinicFieldMappings(botConfig);
  }

  async ensureLead({ botConfig, notification }: EnsureLeadParams): Promise<string> {
    const payload: NotificationPayload | undefined = notification.payload;
    if (!payload) {
      throw new Error('Notification payload is required');
    }

    const phoneIntl = (() => {
      const p = parsePhoneNumberFromString(payload.patient_phone ?? '', botConfig.default_country as CountryCode);
      const num = p ? p.number : payload.patient_phone;
      console.log('[ensureLead] teléfono normalizado', { original: payload.patient_phone, normalizado: num });
      return num;
    })();
    console.log('[KommoService.ensureLead] teléfono normalizado', { original: payload.patient_phone, normalizado: phoneIntl });

    // Aquí deberías tener un método en PatientRepository para obtener el kommo_lead_id (puedes implementarlo si lo necesitas).
    // Por simplicidad, aquí se omite y solo se actualiza cuando hay nuevo lead.

    let contactId: string | undefined;
    let leadId: string | undefined;

    const found = await this.gateway.searchContactByPhone({ phone: phoneIntl });
    if (found && found._embedded?.contacts?.length) {
      const contact = found._embedded.contacts[0];
      contactId = contact.id;
      if (contact._embedded?.leads?.length) {
        leadId = contact._embedded.leads[0].id;
      }
      console.log('[KommoService.ensureLead] contacto EXISTENTE', { contactId, leadId });
    } else {
      console.log('[KommoService.ensureLead] contacto NO encontrado');
    }

    const { leadMap, contactMap } = await this.loadClinicFieldMappings(botConfig);
    const { addingKommoContactFields, kommoLeadCustomFields } = getKommoRelevantFields(botConfig.fields_profile as keyof typeof profiles);

    if (!contactId) {
      const contactPayload = [
        {
          name: `${payload.patient_first_name} ${payload.patient_last_name}`,
          custom_fields_values: addingKommoContactFields.map((f: ContactFieldConfig) => {
            const fieldData = getContactFieldData(contactMap, f);
            if (!fieldData) return undefined;
            return {
              field_id: fieldData.field_id,
              values: [{ value: phoneIntl, enum_id: fieldData.enum_id }]
            };
          }).filter(Boolean),
        },
      ];
      let contactRes;
      try {
        contactRes = await this.gateway.createContact({ body: contactPayload });
      } catch (e: any) {
        console.error('[KommoService.ensureLead][ERROR] Fallo creando contacto', { error: e.message, stack: e.stack });
        throw e;
      }
      contactId = contactRes?._embedded?.contacts?.[0]?.id;
      if (!contactId) {
        throw new Error('[KommoService.ensureLead] No se pudo obtener el contactId después de crear el contacto');
      }
      console.log('[KommoService.ensureLead] contacto creado', { contactId });
    }

    if (!leadId) {
      const leadPayload = [
        {
          name: `${payload.patient_first_name} ${payload.patient_last_name}`,
          _embedded: { contacts: [{ id: contactId, is_main: true }] },
          custom_fields_values: kommoLeadCustomFields.map((f: LeadFieldConfig) => {
            const field_id = getLeadFieldId(leadMap, f);
            if (!field_id) return undefined;
            let value = '';
            if (f.field_name === 'appointmentMessage') value = `${notification.mensaje}`;
            else if (f.field_name === 'idNotification') value = `${notification.id_notificacion}`;
            else if (PAYLOAD_FIELD_MAP[f.field_name] && payload && payload[PAYLOAD_FIELD_MAP[f.field_name]] !== undefined) {
              let raw = payload[PAYLOAD_FIELD_MAP[f.field_name]];
              if (f.field_name === 'appointmentDate') value = formatVisitDate(raw);
              else if (f.field_name === 'appointmentStartTime') value = formatVisitTime(raw);
              else if (f.field_name === 'appointmentEndTime') value = formatVisitTime(raw);
              else value = `${raw}`;
            } else return undefined;
            return { field_id, values: [{ value }] };
          }).filter(Boolean),
        },
      ];
      let leadRes;
      try {
        leadRes = await this.gateway.createLead({ body: leadPayload });
      } catch (e: any) {
        console.error('[KommoService.ensureLead][ERROR] Fallo creando lead', { error: e.message, stack: e.stack });
        throw e;
      }
      leadId = leadRes?._embedded?.leads?.[0]?.id;
      if (!leadId) {
        throw new Error('[KommoService.ensureLead] No se pudo obtener el leadId después de crear el lead');
      }
      console.log('[KommoService.ensureLead] lead creado', { leadId });
    }

    try {
      await this.patientRepository.updateKommoLeadId(payload.patient_id, leadId!);
      console.log('[KommoService.ensureLead] BD actualizada con nuevo leadId', { leadId });
    } catch (e: any) {
      console.error('[KommoService.ensureLead][ERROR] Fallo al actualizar la BD', { error: e.message, stack: e.stack });
    }

    console.log('[KommoService.ensureLead] <<< FIN OK', { leadId });
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
  }) {
    const { leadMap } = await this.loadClinicFieldMappings(botConfig);
    const { kommoLeadCustomFields } = getKommoRelevantFields(botConfig.fields_profile as keyof typeof profiles);
    const payload: NotificationPayload | undefined = notification.payload;

    const custom_fields_values = kommoLeadCustomFields
      .map((f: LeadFieldConfig) => {
        const field_id = getLeadFieldId(leadMap, f);
        if (!field_id) return undefined;
        let value = '';
        if (f.field_name === 'appointmentMessage') value = `${notification.mensaje}`;
        else if (f.field_name === 'idNotification') value = `${notification.id_notificacion}`;
        else if (PAYLOAD_FIELD_MAP[f.field_name] && payload && payload[PAYLOAD_FIELD_MAP[f.field_name]] !== undefined) {
          let raw = payload[PAYLOAD_FIELD_MAP[f.field_name]];
          if (f.field_name === 'appointmentDate') value = formatVisitDate(raw);
          else if (f.field_name === 'appointmentStartTime') value = formatVisitTime(raw);
          else if (f.field_name === 'appointmentEndTime') value = formatVisitTime(raw);
          else value = `${raw}`;
        } else return undefined;
        return { field_id, values: [{ value }] };
      })
      .filter(Boolean);

    if (custom_fields_values.length > 0) {
      await this.gateway.patchLead({
        leadId,
        payload: { custom_fields_values },
      });
      console.log('[KommoService.updateLeadCustomFields] Lead actualizado', { leadId, custom_fields_values });
    }
  }

  async getKommoLeadsCustomFields(configFields: string[]): Promise<KommoCustomFieldExistence[]> {
    const fetchedFields: KommoLeadCustomFieldDefinition[] = await this.gateway.fetchCustomFields('leads');
    const namesSet = new Set(fetchedFields.map((field) => field.name));
    return configFields.map((name) => ({ field_name: name, exists: namesSet.has(name) }));
  }
}
