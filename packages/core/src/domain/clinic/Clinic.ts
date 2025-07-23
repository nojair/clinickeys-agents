// packages/core/src/domain/clinic/Clinic.ts

import { ClinicDTO } from "./dtos";

/**
 * Entidad de dominio Clinic
 * Representa una clínica en el sistema, independiente de la persistencia.
 */
export class Clinic {
  // Identificación multi‑fuente
  readonly clinicSource: string; // "legacy", "v2", ...
  readonly clinicId: string;           // ID dentro de esa fuente
  readonly superClinicId?: string;

  // Datos generales
  readonly name: string;
  readonly cif?: string;
  readonly address?: string;
  readonly phone?: string;
  readonly city?: string;
  readonly country?: string;
  readonly email?: string;
  readonly postalCode?: string;
  readonly logoUrl?: string;
  readonly signatureUrl?: string;
  readonly legalRep?: string;
  readonly legalRepNif?: string;

  constructor(dto: ClinicDTO) {
    this.clinicId = dto.clinicId;
    this.clinicSource = dto.clinicSource;
    this.superClinicId = dto.superClinicId;

    this.name = dto.name;
    this.cif = dto.cif;
    this.address = dto.address;
    this.phone = dto.phone;
    this.city = dto.city;
    this.country = dto.country;
    this.email = dto.email;
    this.postalCode = dto.postalCode;
    this.logoUrl = dto.logoUrl;
    this.signatureUrl = dto.signatureUrl;
    this.legalRep = dto.legalRep;
    this.legalRepNif = dto.legalRepNif;
  }

  // Métodos de dominio adicionales pueden añadirse aquí.
}
