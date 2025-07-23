// packages/core/src/domain/clinic/dtos.ts

/**
 * DTO para la entidad Clinic. Solo datos relevantes de la tabla clinicas.
 * (Ver definición en readme.md)
 */

export interface ClinicDTO {
  clinicSource: string; // "legacy", "v2", ...
  id: string;                // clinicId
  superClinicId?: string;    // id_super_clinica
  name: string;              // nombre_clinica
  cif?: string;              // cif
  address?: string;          // direccion
  phone?: string;            // telefono
  city?: string;             // ciudad
  country?: string;          // pais
  email?: string;            // email
  postalCode: string;        // codigo_postal
  logoUrl?: string;          // url_logo
  signatureUrl?: string;     // url_firma
  legalRep?: string;         // rep_legal
  legalRepNif?: string;      // nif_rep_legal
}
