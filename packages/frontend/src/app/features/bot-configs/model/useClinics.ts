// /features/bot-configs/model/useClinics.ts

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { clinicsApi } from '@/app/features/bot-configs/api/clinicsApi';
import type { Clinic } from '@/app/entities/clinic/types';

const CLINICS_QUERY_KEY = ['clinics'];

export function useClinics() {
  const queryClient = useQueryClient();
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<Clinic[]>({
    queryKey: CLINICS_QUERY_KEY,
    queryFn: clinicsApi.getClinics,
  });

  // Búsqueda local por nombre (case insensitive)
  const search = useMemo(() => {
    if (!data) return () => [];
    return (query: string) =>
      data.filter((clinic) =>
        clinic.name.toLowerCase().includes(query.toLowerCase())
      );
  }, [data]);

  return {
    data: data ?? [],
    isLoading,
    error,
    refetch,
    search,
  };
}
