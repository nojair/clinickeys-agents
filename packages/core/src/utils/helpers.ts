// packages/core/src/utils/helpers.ts

import { DateTime, IANAZone } from 'luxon';
import { profiles } from '@clinickeys-agents/core/utils/constants';
import {
  KommoLeadCustomFieldDefinition,
  KommoContactCustomFieldDefinition
} from '@clinickeys-agents/core/infrastructure/integrations/kommo/models';

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
