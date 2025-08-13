// /shared/lib/countryOptions.ts
import ct from 'countries-and-timezones';

export const countryOptions = Object.values(ct.getAllCountries())
  .map((country) => ({
    value: country.id,
    label: country.name, // Nombre oficial, ej. España
    code: country.id,
    flag: country.id
      .toUpperCase()
      .replace(/./g, char => String.fromCodePoint(127397 + char.charCodeAt(0))),
  }))
  .sort((a, b) => a.label.localeCompare(b.label));
