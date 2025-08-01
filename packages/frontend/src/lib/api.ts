/* ──────────────────────────────────────────────────────────────────────────────
 * Archivo: packages/frontend/src/lib/api.ts
 * Utilidades para consumir la API de clínicas
 * ──────────────────────────────────────────────────────────────────────────── */

import { BotConfig, BotConfigInput } from "@/app/types/BotConfig";
import { SaasClinic } from "@/app/types/saasClinic";

/* ──────────────────────────────────────────────────────────────────────────
 * Config
 * ──────────────────────────────────────────────────────────────────────── */

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

/* ──────────────────────────────────────────────────────────────────────────
 * Fetch helpers
 * ──────────────────────────────────────────────────────────────────────── */

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    // Evita caché y fuerza revalidación en SSR / CSR
    cache: "no-store",
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || "Error de red");
  }

  // Si no hay contenido (204), devuelve undefined
  return (res.status === 204 ? undefined : res.json()) as T;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Endpoints CRUD
 * ──────────────────────────────────────────────────────────────────────── */

export function fetchBotConfigs(): Promise<BotConfig[]> {
  return request<BotConfig[]>("/botConfigs");
}

export function createBotConfig(data: BotConfigInput): Promise<BotConfig> {
  return request<BotConfig>("/botConfigs", {
    method: "POST",
    body: JSON.stringify({
      ...data,
      // Siempre enviar fieldsProfile fijo
      fieldsProfile: "default_kommo_profile",
      entity: "BOT_CONFIG",
    }),
  });
}

export function updateBotConfig(
  id: string,
  data: Partial<BotConfigInput>,
): Promise<BotConfig> {
  return request<BotConfig>(`/botConfigs?id=${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({
      ...data,
      fieldsProfile: "default_kommo_profile",
      entity: "BOT_CONFIG",
    }),
  });
}

export function deleteBotConfig(id: string): Promise<void> {
  return request<void>(`/botConfigs?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

/* ──────────────────────────────────────────────────────────────────────────
 * Endpoint SAAS (MySQL) — selector de clínicas
 * ──────────────────────────────────────────────────────────────────────── */

export function fetchSaasClinics(): Promise<SaasClinic[]> {
  return request<SaasClinic[]>("/saas/botConfigs");
}
