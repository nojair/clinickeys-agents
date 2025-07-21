// packages/core/src/utils/date/index.ts

import { DateTime, IANAZone } from 'luxon';

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