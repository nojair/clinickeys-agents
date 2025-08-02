// /features/bot-configs/model/usePlaceholders.ts

import { useQuery } from '@tanstack/react-query';
import { placeholdersApi } from '@/app/features/bot-configs/api/placeholdersApi';
import type { Placeholder } from '@/app/features/bot-configs/model/types';

const PLACEHOLDERS_QUERY_KEY = ['bot-configs', 'placeholders'];

export function usePlaceholders() {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<Placeholder[]>({
    queryKey: PLACEHOLDERS_QUERY_KEY,
    queryFn: placeholdersApi.getDefaultPlaceholders,
  });

  return {
    data: data ?? [],
    isLoading,
    error,
    refetch,
  };
}
