// /features/bot-configs/model/useKommoUsers.ts

import { getKommoUsers } from "@/app/features/bot-configs/api/kommoApi";
import { useQuery } from "@tanstack/react-query";

import type { KommoUser } from "@/app/entities/kommo/types";
import type { ApiError } from "@/app/shared/types/api";

export function useKommoUsers(subdomain: string | undefined, token: string | undefined) {
  const enabled = Boolean(subdomain) && Boolean(token);

  const { data, isLoading, error, refetch, isFetching } = useQuery<KommoUser[], ApiError>({
    queryKey: ["kommoUsers", subdomain, token],
    queryFn: () => {
      if (!subdomain || !token) throw new Error("Faltan credenciales de Kommo");
      return getKommoUsers(subdomain, token);
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  return {
    data: data ?? [],
    isLoading: isLoading || isFetching,
    error,
    refetch,
  } as const;
}
