// /shared/lib/mappers/clinicMapper.ts

import type { ClinicDTO } from "@/app/shared/types/dto/clinic.dto";
import type { Clinic } from "@/app/entities/clinic/types";

/**
 * Convierte un `ClinicDTO` (formato backend) en la entidad `Clinic`
 * utilizada por la UI y la capa de dominio.
 */
export function mapClinic(dto: ClinicDTO): Clinic {
  const { id_clinica, id_super_clinica, nombre, ...rest } = dto;

  return {
    clinicId: id_clinica,
    superClinicId: id_super_clinica,
    name: nombre,
    ...rest, // conserva cualquier otro campo que el backend envíe
  } as Clinic;
}

/**
 * Atajo para mapear un array completo.
 */
export const mapClinics = (dtos: ClinicDTO[]): Clinic[] => dtos.map(mapClinic);
