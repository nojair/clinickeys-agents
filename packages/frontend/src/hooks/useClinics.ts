// packages/frontend/src/hooks/useClinics.ts

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from "@tanstack/react-query";
import { toast } from "sonner";

import {
  fetchClinics,
  createClinic as apiCreate,
  updateClinic as apiUpdate,
  deleteClinic as apiDelete,
} from "@/lib/api";
import { Clinic, ClinicInput } from "@/app/types/clinic";

/* ──────────────────────────────────────────────────────────────────────────
 * Tipos de retorno
 * ──────────────────────────────────────────────────────────────────────── */

type CreatePayload = ClinicInput;
type UpdatePayload = { id: string; data: Partial<ClinicInput> };
type DeletePayload = { id: string };

export interface UseClinicsResult {
  /** Query con la lista de clínicas */
  query: UseQueryResult<Clinic[], Error>;
  /** Mutación: crear */
  create: UseMutationResult<Clinic, Error, CreatePayload>;
  /** Mutación: actualizar */
  update: UseMutationResult<Clinic, Error, UpdatePayload>;
  /** Mutación: eliminar */
  remove: UseMutationResult<void, Error, DeletePayload>;
}

/* ──────────────────────────────────────────────────────────────────────────
 * Hook principal
 * ──────────────────────────────────────────────────────────────────────── */

export function useClinics(): UseClinicsResult {
  const qc = useQueryClient();

  /* ------------------------- Query lista clínicas ---------------------- */
  const query = useQuery({
    queryKey: ["clinics"],
    queryFn: fetchClinics,
    staleTime: 1000 * 60 * 5,         // 5 minutos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  /* ------------------------- Crear clínica ---------------------------- */
  const create = useMutation({
    mutationFn: (payload: CreatePayload) => apiCreate(payload),
    onSuccess: (clinic) => {
      qc.invalidateQueries({ queryKey: ["clinics"] });
      toast.success(`Clínica “${clinic.name}” creada`);
    },
    onError: (err: Error) => {
      toast.error(`Error creando clínica: ${err.message}`);
    },
  });

  /* ------------------------- Actualizar clínica ----------------------- */
  const update = useMutation({
    mutationFn: ({ id, data }: UpdatePayload) => apiUpdate(id, data),
    onSuccess: (clinic) => {
      qc.invalidateQueries({ queryKey: ["clinics"] });
      toast.success(`Clínica “${clinic.name}” actualizada`);
    },
    onError: (err: Error) => {
      toast.error(`Error actualizando clínica: ${err.message}`);
    },
  });

  /* ------------------------- Eliminar clínica ------------------------- */
  const remove = useMutation({
    mutationFn: ({ id }: DeletePayload) => apiDelete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clinics"] });
      toast.success("Clínica eliminada");
    },
    onError: (err: Error) => {
      toast.error(`Error eliminando clínica: ${err.message}`);
    },
  });

  return { query, create, update, remove };
}
