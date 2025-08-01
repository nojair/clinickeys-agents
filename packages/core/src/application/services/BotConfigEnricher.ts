// packages/core/src/domain/botConfig/BotConfigEnricher.ts

import { BotConfigDTO, BotConfigEnrichedDTO, BotConfigType } from '@clinickeys-agents/core/domain/botConfig';
import { profiles } from '@clinickeys-agents/core/utils';
import { KommoCustomFieldExistence } from "@clinickeys-agents/core/application/services";

const NOTIFICATION_BOT_CUSTOM_FIELDS = [
  "spaceName",
  "clinicName",
  "salesbotLog",
  "patientPhone",
  "treatmentName",
  "notificationId",
  "doctorFullName",
  "patientLastName",
  "reminderMessage",
  "appointmentDate",
  "patientFirstName",
  "appointmentEndTime",
  "triggeredByMachine",
  "appointmentStartTime",
  "appointmentWeekdayName",
] as const;

const CHAT_BOT_CUSTOM_FIELDS = [
  "threadId",
  "botMessage",
  "salesbotLog",
  "patientPhone",
  "patientMessage",
  "reminderMessage",
  "patientLastName",
  "patientFirstName",
  "pleaseWaitMessage",
  "triggeredByMachine",
] as const;

// Props requeridos solo para ChatBot
const CHAT_BOT_REQUIRED_PROPS = [
  "name",
  "kommo",
  "openai",
  "timezone",
  "clinicId",
  "placeholders",
  "clinicSource",
  "superClinicId",
  "botConfigType",
  "fieldsProfile",
  "kommoSubdomain",
  "defaultCountry",
] as const;

// Props requeridos solo para NotificationBot
const NOTIFICATION_BOT_REQUIRED_PROPS = [
  "name",
  "kommo",
  "timezone",
  "clinicId",
  "clinicSource",
  "superClinicId",
  "botConfigType",
  "fieldsProfile",
  "kommoSubdomain",
  "defaultCountry",
] as const;

const REQUIRED_KOMMO_PROPS = [
  "subdomain",
  "salesbotId",
  "longLivedToken",
  "responsibleUserId",
] as const;

const REQUIRED_OPENAI_PROPS = ["apiKey"] as const;

export class BotConfigEnricher {
  public static async enrich(botConfig: BotConfigDTO): Promise<BotConfigEnrichedDTO> {
    const missingProps: string[] = [];
    let requiredProps: readonly string[] = [];
    let requiredCustomFields: readonly string[] = [];

    // Definir props y custom fields según tipo de bot
    if (botConfig.botConfigType === BotConfigType.ChatBot) {
      requiredProps = CHAT_BOT_REQUIRED_PROPS;
      requiredCustomFields = CHAT_BOT_CUSTOM_FIELDS;
    } else if (botConfig.botConfigType === BotConfigType.NotificationBot) {
      requiredProps = NOTIFICATION_BOT_REQUIRED_PROPS;
      requiredCustomFields = NOTIFICATION_BOT_CUSTOM_FIELDS;
    }

    // 1. Validar propiedades raíz obligatorias
    for (const prop of requiredProps) {
      if ((botConfig as any)[prop] === undefined || (botConfig as any)[prop] === null) {
        missingProps.push(prop);
      }
    }

    // 2. Validar kommo (objeto y sus props)
    if (typeof botConfig.kommo !== 'object' || botConfig.kommo === null) {
      missingProps.push('kommo (object)');
    } else {
      for (const kprop of REQUIRED_KOMMO_PROPS) {
        if (
          (botConfig.kommo as any)[kprop] === undefined ||
          (botConfig.kommo as any)[kprop] === null ||
          (botConfig.kommo as any)[kprop] === ""
        ) {
          missingProps.push(`kommo.${kprop}`);
        }
      }
    }

    // 3. Validar openai (objeto y sus props) SOLO para chatBot
    if (botConfig.botConfigType === BotConfigType.ChatBot) {
      if (typeof botConfig.openai !== 'object' || botConfig.openai === null) {
        missingProps.push('openai (object)');
      } else {
        for (const oprop of REQUIRED_OPENAI_PROPS) {
          if (
            (botConfig.openai as any)[oprop] === undefined ||
            (botConfig.openai as any)[oprop] === null ||
            (botConfig.openai as any)[oprop] === ""
          ) {
            missingProps.push(`openai.${oprop}`);
          }
        }
      }
    }

    // 4. Validar custom fields según tipo de bot
    let profile = (profiles as any)[botConfig.fieldsProfile];
    let customFieldsActual: KommoCustomFieldExistence[] = [];
    if (profile && profile.lead && Array.isArray(profile.lead.custom_field_config)) {
      customFieldsActual = profile.lead.custom_field_config as KommoCustomFieldExistence[];
    }
    const fieldNames = customFieldsActual.map((f: any) => f.field_name);
    const missingCustomFields = requiredCustomFields.filter(field => !fieldNames.includes(field));
    const is_ready = missingProps.length === 0 && missingCustomFields.length === 0;

    return {
      ...botConfig,
      kommo_leads_custom_fields: customFieldsActual,
      is_ready,
      // missingProps, // descomenta si quieres debuggear
      // missingCustomFields,
    };
  }

  public static async enrichMany(configs: BotConfigDTO[]): Promise<BotConfigEnrichedDTO[]> {
    return Promise.all(configs.map(cfg => this.enrich(cfg)));
  }
}
