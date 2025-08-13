// /features/bot-configs/api/kommoApi.ts

import fetchJson from "@/app/shared/lib/fetchJson";

import type { KommoUser } from "@/app/entities/kommo/types";

/**
 * Consulta los usuarios de una cuenta Kommo usando subdominio y token.
 * @param subdomain - Subdominio Kommo (ejemplo: "clinickeys")
 * @param token - Token de API largo (long lived token)
 * @returns Array de usuarios { id, name, email }
 * @throws Error si falla la autenticación o la API
 */
export async function getKommoUsers(subdomain: string, token: string): Promise<KommoUser[]> {
  const result = await fetchJson<{ users: KommoUser[] }>(
    "/kommo/users",
    {
      method: "POST",
      body: { subdomain, token }
    }
  );
  // Puedes recibir { users: [...] } o directamente un array según el handler
  // Aquí suponemos que retorna el array
  return Array.isArray(result) ? result : result.users ?? [];
}
