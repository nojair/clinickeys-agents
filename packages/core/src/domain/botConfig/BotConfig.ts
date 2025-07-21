// packages/core/src/domain/botConfig/botConfig.ts

import { BotConfigDTO } from "./dtos";

/**
 * Entidad de dominio BotConfig
 * Representa la configuración de un bot para una clínica.
 */
export class BotConfig {
  // Claves DynamoDB
  readonly pk: string;
  readonly sk: string;
  readonly bucket: number;

  // Identidad y multi‑tenant
  readonly bot_config_id: string;
  readonly clinic_source: string;
  readonly clinic_id: number;

  // Datos del CRM
  readonly crm_type: string;
  readonly crm_subdomain?: string;
  readonly crm_api_key: string;
  readonly kommo_salesbot_id?: string;

  // Configuración regional
  readonly default_country: string;
  readonly timezone: string;

  // Metadatos de presentación
  readonly name: string;
  readonly description: string;

  // Estado
  readonly isActive?: boolean;

  // Auditoría
  readonly createdAt: number;
  readonly updatedAt: number;

  constructor(dto: BotConfigDTO) {
    // Claves
    this.pk = dto.pk;
    this.sk = dto.sk;
    this.bucket = dto.bucket;

    // Identidad
    this.bot_config_id = dto.bot_config_id;
    this.clinic_source = dto.clinic_source;
    this.clinic_id = dto.clinic_id;

    // CRM
    this.crm_type = dto.crm_type;
    this.crm_subdomain = dto.crm_subdomain;
    this.crm_api_key = dto.crm_api_key;

    // Kommo específico
    this.kommo_salesbot_id = dto.kommo_salesbot_id;

    // Config regional
    this.default_country = dto.default_country;
    this.timezone = dto.timezone;

    // Presentación
    this.name = dto.name;
    this.description = dto.description;

    // Estado y auditoría
    this.isActive = dto.isActive;
    this.createdAt = dto.createdAt;
    this.updatedAt = dto.updatedAt;
  }

  // Métodos de dominio pueden añadirse aquí.
}
