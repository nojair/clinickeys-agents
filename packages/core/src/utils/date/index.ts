// packages/core/src/utils/date/index.ts

import { DateTime } from 'luxon';

/** Retorna DateTime ahora en la zona de la clínica */
export const clinicNow = (tz: any) => DateTime.now().setZone(tz);

/** Convierte fecha u objeto Date a DateTime en TZ */
export const parseClinicDate = (d: any, tz: any) =>
  (typeof d === 'string' ? DateTime.fromISO(d, { zone: tz }) : DateTime.fromJSDate(d, { zone: tz }));

export function formatVisitDate(dateStr: any) {
  // dateStr: 'YYYY-MM-DD' => 'DD/MM/YYYY'
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return [d, m, y].join('/');
}

export function formatVisitStartTime(timeStr: any) {
  // timeStr: 'HH:MM:SS' => 'HH:MM'
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  return `${h}:${m}`;
}