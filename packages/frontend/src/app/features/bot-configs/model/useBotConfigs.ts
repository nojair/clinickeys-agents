// /features/bot-configs/model/useBotConfigs.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { botConfigsApi } from '@/app/features/bot-configs/api/botConfigsApi';
import type { BotConfig } from '@/app/entities/bot-config/types';
import type {
  CreateBotConfigPayload,
  UpdateBotConfigPayload
} from '@/app/features/bot-configs/model/types';

const BOT_CONFIGS_QUERY_KEY = ['bot-configs'];

export function useBotConfigs() {
  const queryClient = useQueryClient();

  // Fetch: listar todos los bot configs
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<BotConfig[]>({
    queryKey: BOT_CONFIGS_QUERY_KEY,
    queryFn: botConfigsApi.getBotConfigs,
  });

  // Crear: mutation "cruda" y helper
  const createBotConfigMutation = useMutation<BotConfig, Error, CreateBotConfigPayload>({
    mutationFn: botConfigsApi.createBotConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOT_CONFIGS_QUERY_KEY });
    },
  });
  const createBotConfig = useCallback(
    (payload: CreateBotConfigPayload, options?: Parameters<typeof createBotConfigMutation.mutate>[1]) =>
      createBotConfigMutation.mutate(payload, options),
    [createBotConfigMutation]
  );

  // Editar: mutation "cruda" y helper
  const updateBotConfigMutation = useMutation<
    BotConfig,
    Error,
    { id: string; payload: UpdateBotConfigPayload }
  >({
    mutationFn: ({ id, payload }) => botConfigsApi.updateBotConfig(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOT_CONFIGS_QUERY_KEY });
    },
  });
  const updateBotConfig = useCallback(
    (
      id: string,
      payload: UpdateBotConfigPayload,
      options?: Parameters<typeof updateBotConfigMutation.mutate>[1]
    ) => updateBotConfigMutation.mutate({ id, payload }, options),
    [updateBotConfigMutation]
  );

  // Eliminar: mutation "cruda" y helper
  const deleteBotConfigMutation = useMutation<void, Error, string>({
    mutationFn: botConfigsApi.deleteBotConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOT_CONFIGS_QUERY_KEY });
    },
  });
  const deleteBotConfig = useCallback(
    (id: string, options?: Parameters<typeof deleteBotConfigMutation.mutate>[1]) =>
      deleteBotConfigMutation.mutate(id, options),
    [deleteBotConfigMutation]
  );

  // Toggle isEnabled: mutation "cruda" y helper
  const toggleIsEnabledMutation = useMutation<
    BotConfig,
    Error,
    { id: string; isEnabled: boolean }
  >({
    mutationFn: ({ id, isEnabled }) => botConfigsApi.toggleIsEnabled(id, isEnabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BOT_CONFIGS_QUERY_KEY });
    },
  });
  const toggleIsEnabled = useCallback(
    (
      id: string,
      isEnabled: boolean,
      options?: Parameters<typeof toggleIsEnabledMutation.mutate>[1]
    ) => toggleIsEnabledMutation.mutate({ id, isEnabled }, options),
    [toggleIsEnabledMutation]
  );

  return {
    data: data ?? [],
    isLoading,
    error,
    refetch,
    // Crear
    createBotConfig,
    isCreating: createBotConfigMutation.isPending,
    createError: createBotConfigMutation.error,
    resetCreate: createBotConfigMutation.reset,
    createBotConfigMutation,
    // Editar
    updateBotConfig,
    isUpdating: updateBotConfigMutation.isPending,
    updateError: updateBotConfigMutation.error,
    resetUpdate: updateBotConfigMutation.reset,
    updateBotConfigMutation,
    // Eliminar
    deleteBotConfig,
    isDeleting: deleteBotConfigMutation.isPending,
    deleteError: deleteBotConfigMutation.error,
    resetDelete: deleteBotConfigMutation.reset,
    deleteBotConfigMutation,
    // Toggle isEnabled
    toggleIsEnabled,
    isToggling: toggleIsEnabledMutation.isPending,
    toggleError: toggleIsEnabledMutation.error,
    resetToggle: toggleIsEnabledMutation.reset,
    toggleIsEnabledMutation,
  };
}
