// packages/core/src/utils/helpers.ts

import type { NotificationDTO, NotificationPayload } from '@clinickeys-agents/core/domain/notification';
import type { LeadMap, ContactMap } from '@clinickeys-agents/core/infrastructure/integrations/kommo';
import {
  profiles,
  NOTIFICATION_PAYLOAD_FIELD_MAP,
  // Custom field constants:
  ID_NOTIFICATION,
  APPOINTMENT_DATE,
  APPOINTMENT_START_TIME,
  APPOINTMENT_END_TIME,
  PATIENT_PHONE,
} from '@clinickeys-agents/core/utils';
import { DateTime, IANAZone } from 'luxon';

export const json = (r: Response) => r.json();
export const ok = async (r: Response, url: string) => {
  if (!r.ok) throw r;
  return json(r);
};
export const hdr = (t: string) => ({ 'Authorization': `Bearer ${t}`, 'Content-Type': 'application/json' });

// --------- MAPEO DE FIELDS KOMMO (TIPADO FUERTE) ---------

export function getKommoMapFields<T extends { name?: string; code?: string }>(
  fields: T[]
): { byName: Record<string, T>; byCode: Record<string, T> } {
  const byName: Record<string, T> = {};
  const byCode: Record<string, T> = {};
  for (const field of fields) {
    if (field.name) byName[field.name] = field;
    if (field.code) byCode[field.code.toUpperCase()] = field;
  }
  return { byName, byCode };
}

// Ejemplo de uso:
// const leadMap = getKommoMapFields<KommoLeadCustomFieldDefinition>(leadFields);
// const contactMap = getKommoMapFields<KommoContactCustomFieldDefinition>(contactFields);

// --------- CAMPOS RELEVANTES POR PERFIL (TIPADO) ---------

export interface ContactFieldConfig {
  field_code: string;
  enum_code?: string;
}

export interface LeadFieldConfig {
  field_name: string;
}

export function getKommoRelevantFields(profileKey: keyof typeof profiles): {
  addingKommoContactFields: ContactFieldConfig[];
  kommoLeadCustomFields: LeadFieldConfig[];
} {
  const profile = profiles[profileKey];
  if (!profile) {
    throw new Error(`Perfil '${profileKey}' no encontrado`);
  }
  const addingKommoContactFields: ContactFieldConfig[] =
    profile.adding_contact?.custom_fields_config?.map((f: any) => ({
      field_code: f.field_code,
      enum_code: f.enum_code,
    })) ?? [];
  const kommoLeadCustomFields: LeadFieldConfig[] =
    profile.lead?.custom_field_config?.map((f: any) => ({
      field_name: f.field_name,
    })) ?? [];
  return { addingKommoContactFields, kommoLeadCustomFields };
}

export function canSendReminder(now: DateTime, minHour: number): boolean {
  return now.hour >= minHour;
}

export function isValidTimezone(tz: string): boolean {
  return IANAZone.isValidZone(tz);
}

export function safeISODate(dt: DateTime): string {
  const iso = dt.toISODate();
  if (!iso) throw new Error("Invalid DateTime for ISO date");
  return iso;
}

/** Retorna DateTime ahora en la zona de la clínica */
export function clinicNow(timezone: string): DateTime {
  if (!IANAZone.isValidZone(timezone)) {
    throw new Error(`Invalid timezone: ${timezone}`);
  }
  return DateTime.now().setZone(timezone)!;
}

/** Convierte fecha u objeto Date a DateTime en TZ */
export const parseClinicDate = (d: string | Date, tz: string) =>
  (typeof d === 'string' ? DateTime.fromISO(d, { zone: tz }) : DateTime.fromJSDate(d, { zone: tz }));

export function formatVisitDate(dateStr: string) {
  // dateStr: 'YYYY-MM-DD' => 'DD/MM/YYYY'
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return [d, m, y].join('/');
}

export function formatVisitTime(timeStr: string) {
  // timeStr: 'HH:MM:SS' => 'HH:MM'
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  return `${h}:${m}`;
}

function isLeadFieldConfig(field: LeadFieldConfig | ContactFieldConfig): field is LeadFieldConfig {
  return (field as LeadFieldConfig).field_name !== undefined;
}

function isContactFieldConfig(field: LeadFieldConfig | ContactFieldConfig): field is ContactFieldConfig {
  return (field as ContactFieldConfig).field_code !== undefined;
}

export function buildCustomFieldsValues({
  fields,
  fieldMap,
  notification,
  payload,
  type
}: {
  fields: (LeadFieldConfig | ContactFieldConfig)[];
  fieldMap: LeadMap | ContactMap;
  notification: NotificationDTO;
  payload: NotificationPayload;
  type: 'lead' | 'contact';
}) {
  return fields.map((f) => {
    let field_id: string | undefined = undefined;

    if (type === 'lead' && isLeadFieldConfig(f)) {
      const leadMap = fieldMap as LeadMap;
      field_id = (leadMap as Record<string, any>)[f.field_name]?.field_id;
      if (!field_id) return undefined;
      let value = '';
      if (f.field_name === ID_NOTIFICATION) value = `${notification.notificacionId}`;
      else if (NOTIFICATION_PAYLOAD_FIELD_MAP[f.field_name] && payload && payload[NOTIFICATION_PAYLOAD_FIELD_MAP[f.field_name]] !== undefined) {
        let raw = payload[NOTIFICATION_PAYLOAD_FIELD_MAP[f.field_name]];
        if (f.field_name === APPOINTMENT_DATE) value = formatVisitDate(raw);
        else if (f.field_name === APPOINTMENT_START_TIME) value = formatVisitTime(raw);
        else if (f.field_name === APPOINTMENT_END_TIME) value = formatVisitTime(raw);
        else value = `${raw}`;
      } else return undefined;
      return { field_id, values: [{ value }] };
    }

    if (type === 'contact' && isContactFieldConfig(f)) {
      const contactMap = fieldMap as ContactMap;
      field_id = (contactMap as Record<string, any>)[f.field_code]?.field_id;
      if (!field_id) return undefined;
      if (f.field_code === 'PHONE') { // podrías reemplazar 'PHONE' por una constante si lo prefieres
        const enum_id = (contactMap as Record<string, any>)['PHONE']?.enum_id;
        const value = payload[PATIENT_PHONE] ?? '';
        return {
          field_id,
          values: [{ value, ...(enum_id ? { enum_id } : {}) }],
        };
      }
      return undefined;
    }
    return undefined;
  }).filter(Boolean);
}
