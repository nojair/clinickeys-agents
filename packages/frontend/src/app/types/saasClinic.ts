/* ──────────────────────────────────────────────────────────────────────────────
 * Archivo: packages/frontend/src/types/saasClinic.ts
 * Tipado mínimo para las clínicas que vienen del SAAS (MySQL)
 * ──────────────────────────────────────────────────────────────────────────── */

export interface SaasClinic {
  /** Identificador único de la clínica en la BD SAAS */
  id_clinica: string;
  /** Nombre visible de la clínica */
  nombre_clinica: string;
}
