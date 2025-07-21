import { DateTime } from 'luxon';

import { profiles } from '@clinickeys-agents/core/utils/constants';

export const json = (r: any) => r.json();
export const ok = async (r: any, url: any) => {
  if (!r.ok) throw r;
  return json(r);
};
export const hdr = (t: any) => ({ 'Authorization': `Bearer ${t}`, 'Content-Type': 'application/json' });

export function getKommoMapFields(fields: any[]) {
  const byName: Record<string, any> = {};
  const byCode: Record<string, any> = {};
  for (const field of fields) {
    if (field.name) byName[field.name] = field;
    if (field.code) byCode[field.code.toUpperCase()] = field;
  }
  return { byName, byCode };
}

export function canSendReminder(now: DateTime, minHour: number): boolean {
  return now.hour >= minHour;
}

export function getKommoRelevantFields(profileKey: keyof typeof profiles) {
  const profile = profiles[profileKey];
  if (!profile) {
    throw new Error(`Perfil '${profileKey}' no encontrado`);
  }
  const addingKommoContactFields =
    profile.adding_contact?.custom_fields_config?.map((f) => ({
      field_code: f.field_code,
      enum_code: f.enum_code,
    })) ?? [];
  const kommoLeadCustomFields =
    profile.lead?.custom_field_config?.map((f) => ({
      field_name: f.field_name,
    })) ?? [];
  return { addingKommoContactFields, kommoLeadCustomFields };
}