// packages/core/src/utils/helpers.ts

import type { LeadMap, ContactMap } from '@clinickeys-agents/core/infrastructure/integrations/kommo';
import {
  profiles,
  // Custom field constants:
  PATIENT_MESSAGE,
  PATIENT_PHONE,
} from '@clinickeys-agents/core/utils';
import { DateTime, IANAZone } from 'luxon';

// packages/core/src/utils/helpers.ts

/**
 * Parsea la respuesta dependiendo del tipo de contenido (json, text, blob)
 */
export const parseResponse = async (r: Response) => {
  const contentType = r.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return await r.json();
  } else if (contentType.startsWith('text/')) {
    return await r.text();
  } else {
    return await r.blob();
  }
};

/**
 * Lanza un error si la respuesta no es OK y parsea el body automáticamente.
 * Si la respuesta es un error, intenta extraer el mensaje del body.
 */
export const ok = async (r: Response, url: string) => {
  if (!r.ok) {
    let errorData: any = undefined;
    try {
      errorData = await parseResponse(r);
    } catch (_) {
      // Ignorar errores de parsing para casos donde no hay body
    }
    const message = errorData?.message || r.statusText || `Request failed: ${url}`;
    const error: any = new Error(message);
    error.status = r.status;
    error.data = errorData;
    error.url = url;
    throw error;
  }
  return parseResponse(r);
};

/**
 * Helper para construir headers con auth y JSON por defecto.
 * Puedes combinar con otros headers si lo necesitas.
 */
export const hdr = (
  token: string,
  extraHeaders: Record<string, string> = {}
): Record<string, string> => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  ...extraHeaders,
});


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
export function localTime(timezone: string): DateTime {
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

/**
 * Construye un arreglo de valores de campos personalizados para patch en Kommo,
 * basándose únicamente en un objeto de customFields preformateado.
 * @param fields Configuraciones de campos (lead o contact)
 * @param fieldMap Mapa de nombre de campo → field_id y opcional enum_id de Kommo
 * @param customFields Objeto con valores de campos (clave es nombre o code del campo)
 * @returns Array de custom_fields_values listo para enviar a Kommo.
 */
export function buildCustomFieldsValues({
  fields,
  fieldMap,
  customFields,
}: {
  fields: Array<LeadFieldConfig | ContactFieldConfig>;
  fieldMap: LeadMap | ContactMap;
  customFields: Record<string, string>;
}): Array<{ field_id: string | number; values: Array<{ value: string; enum_id?: string | number }> }> {
  const result: Array<{ field_id: string | number; values: Array<{ value: string; enum_id?: string | number }> }> = [];

  for (const config of fields) {
    if (isLeadFieldConfig(config)) {
      const fieldName = config.field_name;
      const rawValue = customFields[fieldName];
      if (!rawValue) continue;
      // Index fieldMap safely via Record
      const leadMap = fieldMap as unknown as Record<string, { field_id: string | number }>;
      const mapEntry = leadMap[fieldName];
      if (!mapEntry?.field_id) continue;
      result.push({
        field_id: mapEntry.field_id,
        values: [{ value: rawValue }]
      });

    } else if (isContactFieldConfig(config)) {
      const fieldCode = config.field_code;
      if (fieldCode !== 'PHONE') continue;
      const rawValue = customFields[fieldCode] || customFields[PATIENT_PHONE] || '';
      if (!rawValue) continue;
      // Index contactMap safely via Record
      const contactMap = fieldMap as unknown as Record<string, { field_id: string | number; enum_id?: string | number }>;
      const mapEntry = contactMap[fieldCode];
      if (!mapEntry?.field_id) continue;
      const valueObj: { value: string; enum_id?: string | number } = { value: rawValue };
      if (mapEntry.enum_id) valueObj.enum_id = mapEntry.enum_id;
      result.push({
        field_id: mapEntry.field_id,
        values: [valueObj]
      });
    }
  }

  return result;
}

// --- 1. Obtener el valor de un custom field desde custom_fields_values de Kommo --- //
export function getCustomFieldValue(
  customFields: { field_id?: number | string; field_name?: string; values?: { value: string }[] }[],
  fieldName: string,
  key: "field_name" | "field_id" = "field_name"
): string {
  const field = customFields.find((item) => item[key] === fieldName);
  return field?.values?.[0]?.value || "";
}

// --- 2. Fusiona los custom fields definidos con los valores actuales de un lead/contacto --- //
export function mergeCustomFields(
  leadCF: any[],
  allCF: { id: string | number; name: string }[]
) {
  if (!leadCF) leadCF = [];
  const leadMap: Record<string, any> = {};
  leadCF.forEach((cf) => {
    const key = cf.field_id || cf.field_name;
    leadMap[key] = cf;
  });
  return allCF.map((cf) => {
    const key = cf.id;
    return {
      ...cf,
      value: leadMap[key] ? leadMap[key].values[0]?.value || "" : ""
    };
  });
}

// --- 3. Obtiene el valor de un campo a partir del array fusionado --- //
export function getMergedFieldValue(
  mergedCF: { name: string; value: string }[],
  fieldName: string
): string {
  const field = mergedCF.find((item) => item.name === fieldName);
  return field ? field.value : "";
}

// --- 4. Helper profesional y DDD para esperar y verificar si un campo cambió en Kommo --- //
type ShouldLambdaContinueParams = {
  latestLead: { custom_fields_values: any[] };
  initialValue: string;
  fieldName?: string;
  delayMs?: number;
};

export async function shouldLambdaContinue({
  latestLead,
  initialValue,
  fieldName = PATIENT_MESSAGE,
  delayMs = 10000
}: ShouldLambdaContinueParams): Promise<boolean> {
  // Espera el tiempo indicado
  if (delayMs && delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  // Compara el valor actual con el inicial
  const current = getCustomFieldValue(
    latestLead.custom_fields_values || [],
    fieldName
  );
  return current === initialValue;
}