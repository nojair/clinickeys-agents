import { DateTime, IANAZone } from 'luxon';
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
export const parseClinicDate = (d: any, tz: any) =>
  (typeof d === 'string' ? DateTime.fromISO(d, { zone: tz }) : DateTime.fromJSDate(d, { zone: tz }));

export function formatVisitDate(dateStr: any) {
  // dateStr: 'YYYY-MM-DD' => 'DD/MM/YYYY'
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return [d, m, y].join('/');
}

export function formatVisitTime(timeStr: any) {
  // timeStr: 'HH:MM:SS' => 'HH:MM'
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  return `${h}:${m}`;
}