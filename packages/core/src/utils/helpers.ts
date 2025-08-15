// packages/core/src/utils/helpers.ts

import {
  // Custom field constants:
  PATIENT_MESSAGE,
} from '@clinickeys-agents/core/utils';
import { DateTime, IANAZone } from 'luxon';

// packages/core/src/utils/helpers.ts

/**
 * Parsea la respuesta dependiendo del tipo de contenido (json, text, blob)
 */
export const parseResponse = async (r: Response) => {
  const contentType = r.headers.get('content-type') || '';
  if (contentType.includes('json')) {
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
  return DateTime.utc().setZone(timezone)!;
}

/** Convierte fecha u objeto Date a DateTime en TZ */
export const parseClinicDate = (d: string | Date, tz: string) =>
  (typeof d === 'string' ? DateTime.fromISO(d, { zone: tz }) : DateTime.fromJSDate(d, { zone: tz }));

// --- 1. Obtener el valor de un custom field desde custom_fields_values de Kommo --- //
export function getCustomFieldValue(
  customFields: { field_id?: number | string; field_name?: string; values?: { value: string }[] }[],
  fieldName: string,
  key: "field_name" | "field_id" = "field_name"
): string {
  const field = customFields.find((item) => item[key] === fieldName);
  return field?.values?.[0]?.value || "";
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

export function formatFechaCita(fecha: string) {
  if (fecha && !fecha.includes("T")) {
    return `${fecha}T00:00:00.000Z`;
  }
  return fecha;
}

export function mapKommoCustomFields(requiredCustomFields: string[], allFields: { name: string; type: string }[]) {
  return requiredCustomFields.map(name => {
    const field = allFields.find(f => f.name === name && f.type === "textarea");
    return {
      field_name: name,
      field_type: field ? field.type : "",
      exists: !!field,
    };
  });
}
