// /features/bot-configs/api/clinicsApi.ts

import fetchJson from "@/app/shared/lib/fetchJson";
import type { Clinic } from "@/app/entities/clinic/types";
import type { ClinicDTO } from "@/app/shared/types/dto/clinic.dto";
import { mapClinics } from "@/app/shared/lib/mappers/clinicMapper";

export const clinicsApi = {
  /**
   * Obtiene todas las clínicas y las normaliza al tipo `Clinic`.
   * Se devuelven ordenadas alfabéticamente por `name` para uso en selectores.
   */
  async getClinics(): Promise<Clinic[]> {
    const raw = await fetchJson<ClinicDTO[]>("/clinics");
    const clinics = mapClinics(raw).sort((a, b) => a.name.localeCompare(b.name));
    return clinics;
  },
};
