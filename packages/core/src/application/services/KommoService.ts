// packages/core/src/application/services/KommoService.ts

import { KommoCustomFieldExistence } from '@clinickeys-agents/core/application/services/types';
import { Logger } from '@clinickeys-agents/core/infrastructure/external';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

import {
  KommoContactCustomFieldDefinition,
  KommoLeadCustomFieldDefinition,
  KommoContactResponse,
  KommoGetLeadByIdResponse
} from '@clinickeys-agents/core/infrastructure/integrations/kommo';

import {
  getKommoMapFields,
  getKommoRelevantFields,
  buildCustomFieldsValues,
  getCustomFieldValue,
  shouldLambdaContinue,
} from '@clinickeys-agents/core/utils';

import {
  PATIENT_FIRST_NAME,
  PATIENT_LAST_NAME,
  PATIENT_PHONE,
  PATIENT_LEAD_ID,
  ID_NOTIFICATION,
  PLEASE_WAIT_MESSAGE,
  BOT_MESSAGE,
  PATIENT_MESSAGE
} from '@clinickeys-agents/core/utils/constants';

import type { LeadMap, ContactMap } from '@clinickeys-agents/core/infrastructure/integrations/kommo';
import type { IPatientRepository } from '@clinickeys-agents/core/domain/patient';
import type { IKommoRepository } from '@clinickeys-agents/core/domain/kommo';
import type { BotConfigDTO } from '@clinickeys-agents/core/domain/botConfig';
import type { profiles } from '@clinickeys-agents/core/utils';
import type { CountryCode } from 'libphonenumber-js';

interface EnsureLeadInput {
  botConfig: BotConfigDTO;
  patientId: number;
  patientFirstName: string;
  patientLastName: string;
  patientPhone: string;
  notificationId?: number;
}

interface UpdateLeadFieldsInput {
  botConfig: BotConfigDTO;
  leadId: number;
  customFields: Record<string, string>;
}

interface ReplyToLeadInput {
  botConfig: BotConfigDTO;
  leadId: number;
  customFields: Record<string, string>;
  mergedCustomFields: { id: string | number; name: string; value?: string }[];
  delayMs?: number;
  salesbotId: number;
}

interface SendBotInitialMessageInput {
  botConfig: BotConfigDTO;
  leadId: number;
  mergedCustomFields: { id: string | number; name: string; value?: string }[];
  salesbotId: number;
  message: string;
}

export class KommoService {
  private kommoRepository: IKommoRepository;
  private patientRepository: IPatientRepository;
  private customFieldMappingsCache: { leadMap: LeadMap; contactMap: ContactMap } | null = null;

  constructor(kommoRepository: IKommoRepository, patientRepository: IPatientRepository) {
    this.kommoRepository = kommoRepository;
    this.patientRepository = patientRepository;
  }

  async getContactById(contactId: number): Promise<KommoContactResponse | null> {
    return this.kommoRepository.getContactById({ contactId });
  }

  async getLeadById(leadId: number): Promise<KommoGetLeadByIdResponse | null> {
    return this.kommoRepository.getLeadById({ leadId });
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

  public async ensureLead(input: EnsureLeadInput): Promise<number> {
    const { botConfig, patientId, patientFirstName, patientLastName, patientPhone, notificationId } = input;
    const defaultCountry = botConfig.defaultCountry as CountryCode;
    const normalizedPhone = parsePhoneNumberFromString(patientPhone, defaultCountry)?.number || patientPhone;
    Logger.info('[KommoService.ensureLead] teléfono normalizado', { normalizedPhone });

    let existingLeadId: string | undefined;
    try {
      existingLeadId = await this.patientRepository.getKommoLeadId(patientId);
    } catch (e: any) {
      Logger.error('[KommoService.ensureLead] error obteniendo leadId desde BD', e);
    }

    if (existingLeadId) {
      const leadExists = await this.kommoRepository.getLeadById({ leadId: Number(existingLeadId) });
      if (leadExists) return Number(existingLeadId);
    }

    let contactId: number | undefined;
    let leadId: number | undefined;
    const found = await this.kommoRepository.searchContactByPhone({ phone: normalizedPhone });
    if (found?._embedded?.contacts?.length) {
      contactId = Number(found._embedded.contacts[0].id);
      leadId = Number(found._embedded.contacts[0]._embedded?.leads?.[0]?.id);
    }

    const { leadMap, contactMap } = await this.loadCustomFieldMappings();
    const { addingKommoContactFields, kommoLeadCustomFields } = getKommoRelevantFields(botConfig.fieldsProfile as keyof typeof profiles);

    if (!contactId) {
      const customFieldsContacts: Record<string, string> = {
        [PATIENT_FIRST_NAME]: patientFirstName,
        [PATIENT_LAST_NAME]: patientLastName,
        [PATIENT_PHONE]: patientPhone
      };
      const payload = [{
        name: `${patientFirstName} ${patientLastName}`,
        custom_fields_values: buildCustomFieldsValues({ fields: addingKommoContactFields, fieldMap: contactMap, customFields: customFieldsContacts })
      }];
      const res = await this.kommoRepository.createContact({ body: payload });
      contactId = Number(res._embedded?.contacts?.[0]?.id!);
    }

    if (!leadId) {
      const customFieldsLeads: Record<string, string> = {
        [PATIENT_FIRST_NAME]: patientFirstName,
        [PATIENT_LAST_NAME]: patientLastName,
        [PATIENT_PHONE]: patientPhone,
        [PATIENT_LEAD_ID]: String(patientId)
      };
      if (notificationId != null) customFieldsLeads[ID_NOTIFICATION] = String(notificationId);

      const payload = [{
        name: `${patientFirstName} ${patientLastName}`,
        _embedded: { contacts: [{ id: contactId!, is_main: true }] },
        custom_fields_values: buildCustomFieldsValues({ fields: kommoLeadCustomFields, fieldMap: leadMap, customFields: customFieldsLeads })
      }];
      const res = await this.kommoRepository.createLead({ body: payload });
      leadId = Number(res._embedded?.leads?.[0]?.id!);
      try {
        await this.patientRepository.updateKommoLeadId(patientId, leadId);
      } catch (e: any) {
        Logger.error('[KommoService.ensureLead] error actualizando leadId en BD', e);
      }
    }

    return leadId!;
  }

  public async updateLeadCustomFields(input: UpdateLeadFieldsInput): Promise<void> {
    const { botConfig, leadId, customFields } = input;
    const { leadMap } = await this.loadCustomFieldMappings();
    const { kommoLeadCustomFields } = getKommoRelevantFields(botConfig.fieldsProfile as keyof typeof profiles);
    const values = buildCustomFieldsValues({ fields: kommoLeadCustomFields, fieldMap: leadMap, customFields });
    if (values.length) {
      await this.kommoRepository.patchLead({ leadId, payload: { custom_fields_values: values } });
    }
  }

  public async replyToLead(input: ReplyToLeadInput): Promise<{ success: boolean; aborted?: boolean }> {
    const { leadId, customFields, mergedCustomFields, delayMs = 10000, salesbotId } = input;
    const latest = await this.kommoRepository.getLeadById({ leadId });
    const initial = getCustomFieldValue(latest?.custom_fields_values || [], PATIENT_MESSAGE);
    const ok = await shouldLambdaContinue({ latestLead: latest!, initialValue: initial, fieldName: PATIENT_MESSAGE, delayMs });
    if (!ok) return { success: false, aborted: true };
    const values = mergedCustomFields
      .map(cf => cf.name in customFields ? { field_id: cf.id, values: [{ value: customFields[cf.name] }] } : null)
      .filter(Boolean as any);
    await this.kommoRepository.patchLead({ leadId, payload: { custom_fields_values: values } });
    await this.kommoRepository.runSalesbot({ leadId, botId: salesbotId });
    return { success: true };
  }

  public async sendBotInitialMessage(input: SendBotInitialMessageInput): Promise<void> {
    const { botConfig, leadId, mergedCustomFields, salesbotId, message } = input;
    const extra: Record<string, string> = {};
    for (const cf of mergedCustomFields) if (cf.value != null) extra[cf.name] = String(cf.value);
    if (extra[PLEASE_WAIT_MESSAGE] === 'true') return;
    const customFields = { ...extra, [BOT_MESSAGE]: message, [PLEASE_WAIT_MESSAGE]: 'true' };
    await this.replyToLead({ botConfig, leadId, customFields, mergedCustomFields, salesbotId });
  }

  public async getKommoLeadsCustomFields(configFields: string[]): Promise<KommoCustomFieldExistence[]> {
    const fetched = await this.kommoRepository.fetchCustomFields('leads');
    const names = new Set(fetched.map(f => f.name));
    return configFields.map(name => ({ field_name: name, exists: names.has(name) }));
  }

  public async createTask(params: {
    leadId: number;
    message: string;
    minutesSinceNow?: number;
    responsibleUserId: number | string;
  }): Promise<{ success: boolean }> {
    return this.kommoRepository.createTask(params);
  }
}
