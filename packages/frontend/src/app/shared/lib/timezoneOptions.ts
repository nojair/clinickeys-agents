// /shared/lib/timezoneOptions.ts

import ct from 'countries-and-timezones';
import type { Option } from '@/app/shared/types/global';

/**
 * Devuelve la lista de todas las zonas horarias disponibles como Option[].
 * El label es el nombre estándar de la timezone (ej: 'America/Lima'), value igual.
 * Ordena alfabéticamente.
 */
export function getAllTimezoneOptions(): Option[] {
  const timezones = Object.values(ct.getAllTimezones());
  return timezones
    .map((tz) => ({
      value: tz.name,   // Ej: 'America/Lima'
      label: tz.name,   // Ej: 'America/Lima'
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Devuelve la lista de zonas horarias de un país dado (ISO alpha-2).
 * Si el país no existe, devuelve [].
 */
export function getTimezoneOptionsByCountry(countryCode: string): Option[] {
  const country = ct.getCountry(countryCode);
  if (!country) return [];
  return (country.timezones || [])
    .map((tzName) => ({ value: tzName, label: tzName }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

// Exporta la lista global por defecto para selects generales
export const timezoneOptions: Option[] = getAllTimezoneOptions();
