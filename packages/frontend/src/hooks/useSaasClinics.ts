/* ──────────────────────────────────────────────────────────────────────────────
 * Archivo: packages/frontend/src/hooks/useSaasClinics.ts
 * Hook React Query para listar clínicas del SAAS
 * ──────────────────────────────────────────────────────────────────────────── */

import { useQuery, UseQueryResult } from "@tanstack/react-query";

import { SaasClinic } from "@/app/types/saasClinic";
import { fetchSaasClinics } from "@/lib/api";

/* ──────────────────────────────────────────────────────────────────────────
 * Resultado del hook
 * ──────────────────────────────────────────────────────────────────────── */

export interface UseSaasClinicsResult {
  query: UseQueryResult<SaasClinic[], Error>;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Hook principal
 * ──────────────────────────────────────────────────────────────────────── */

export function useSaasClinics(): UseSaasClinicsResult {
  const query = useQuery({
    queryKey: ["saasClinics"],
    queryFn: fetchSaasClinics,
    staleTime: 1000 * 60 * 5, // cache 5 min
  });

  return { query };
}
