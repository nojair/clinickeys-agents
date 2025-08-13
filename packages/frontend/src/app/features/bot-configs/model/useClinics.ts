// /features/bot-configs/model/useClinics.ts

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { clinicsApi } from "@/app/features/bot-configs/api/clinicsApi";
import type { Clinic } from "@/app/entities/clinic/types";
import type { ApiError } from "@/app/shared/types/api";

const CLINICS_QUERY_KEY = ["clinics"] as const;

export function useClinics() {
  /* ------------------------------------------------------------------
   * Fetch global list — una sola vez y cache infinito
   * ------------------------------------------------------------------ */
  const { data, isLoading, error, refetch } = useQuery<Clinic[], ApiError>({
    queryKey: CLINICS_QUERY_KEY,
    queryFn: clinicsApi.getClinics,
    // ⚙️ Mantener en caché indefinidamente y evitar refetch automáticos
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  /* ------------------------------------------------------------------
   * Local search helper (case‑insensitive by name)
   * ------------------------------------------------------------------ */
  const search = useMemo(() => {
    if (!data) return () => [] as Clinic[];

    return (query: string): Clinic[] => {
      const q = query.toLowerCase();
      return data.filter((clinic) => clinic.name.toLowerCase().includes(q));
    };
  }, [data]);

  return {
    data: data ?? [],
    isLoading,
    error,
    refetch,
    search,
  } as const;
}
