// packages/core/src/types.ts

/**
 * Representa un campo personalizado de leads en Kommo (amoCRM).
 * field_name: nombre del campo
 * exists: indica si el campo existe en la cuenta de Kommo
 */
export interface KommoLeadCustomField {
  field_name: string;
  exists: boolean;
}

/**
 * Representa una clínica en el sistema.
 * Incluye la configuración básica y el estado de preparación (`is_ready`).
 */
export interface Clinic {
  /** Identificador único de la clínica */
  id_clinica: string;
  /** Nombre de la clínica */
  name: string;
  /** Subdominio asociado en Kommo */
  subdomain: string;
  /** Zona horaria de la clínica (p.ej. "America/Lima") */
  timezone: string;
  /** País por defecto para la clínica */
  default_country: string;
  /** Identificador del salesbot asociado */
  id_salesbot: number;
  /** API key para autenticación con Kommo */
  api_key: string;
  /** Perfil de configuración de campos personalizados */
  fields_profile: string;
  /** Lista de campos personalizados de leads en Kommo con su existencia */
  kommo_leads_custom_fields: KommoLeadCustomField[];
  /** Indica si la clínica está completamente configurada y lista */
  is_ready: boolean;

  entity: "CLINIC";
}
