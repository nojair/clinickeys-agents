// packages/frontend/src/hooks/useBotConfigs.ts

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from "@tanstack/react-query";
import { toast } from "sonner";

import {
  fetchBotConfigs,
  createBotConfig as apiCreate,
  updateBotConfig as apiUpdate,
  deleteBotConfig as apiDelete,
} from "@/lib/api";
import { BotConfig, BotConfigInput } from "@/app/types/BotConfig";

/* ──────────────────────────────────────────────────────────────────────────
 * Tipos de retorno
 * ──────────────────────────────────────────────────────────────────────── */

type CreatePayload = BotConfigInput;
type UpdatePayload = { id: string; data: Partial<BotConfigInput> };
type DeletePayload = { id: string };

export interface UseBotConfigResult {
  /** Query con la lista de clínicas */
  query: UseQueryResult<BotConfig[], Error>;
  /** Mutación: crear */
  create: UseMutationResult<BotConfig, Error, CreatePayload>;
  /** Mutación: actualizar */
  update: UseMutationResult<BotConfig, Error, UpdatePayload>;
  /** Mutación: eliminar */
  remove: UseMutationResult<void, Error, DeletePayload>;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Hook principal
 * ──────────────────────────────────────────────────────────────────────── */

export function useBotConfig(): UseBotConfigResult {
  const qc = useQueryClient();

  /* ------------------------- Query lista clínicas ---------------------- */
  const query = useQuery({
    queryKey: ["botConfigs"],
    queryFn: fetchBotConfigs,
    staleTime: 1000 * 60 * 5,         // 5 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  /* ------------------------- Crear clínica ---------------------------- */
  const create = useMutation({
    mutationFn: (payload: CreatePayload) => apiCreate(payload),
    onSuccess: (botConfig) => {
      qc.invalidateQueries({ queryKey: ["botConfigs"] });
      toast.success(`Clínica “${botConfig.name}” creada`);
    },
    onError: (err: Error) => {
      toast.error(`Error creando clínica: ${err.message}`);
    },
  });

  /* ------------------------- Actualizar clínica ----------------------- */
  const update = useMutation({
    mutationFn: ({ id, data }: UpdatePayload) => apiUpdate(id, data),
    onSuccess: (botConfig) => {
      qc.invalidateQueries({ queryKey: ["botConfigs"] });
      toast.success(`Clínica “${botConfig.name}” actualizada`);
    },
    onError: (err: Error) => {
      toast.error(`Error actualizando clínica: ${err.message}`);
    },
  });

  /* ------------------------- Eliminar clínica ------------------------- */
  const remove = useMutation({
    mutationFn: ({ id }: DeletePayload) => apiDelete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["botConfigs"] });
      toast.success("Clínica eliminada");
    },
    onError: (err: Error) => {
      toast.error(`Error eliminando clínica: ${err.message}`);
    },
  });

  return { query, create, update, remove };
}
