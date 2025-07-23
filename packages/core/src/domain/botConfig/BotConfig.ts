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
  readonly botConfigId: string;
  readonly clinicSource: string;
  readonly clinicId: number;

  // Datos del CRM
  readonly crmType: string;
  readonly crmSubdomain?: string;
  readonly crm_api_key: string;
  readonly kommoSalesbotId?: string;

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
    this.botConfigId = dto.botConfigId;
    this.clinicSource = dto.clinicSource;
    this.clinicId = dto.clinicId;

    // CRM
    this.crmType = dto.crmType;
    this.crmSubdomain = dto.crmSubdomain;
    this.crm_api_key = dto.crm_api_key;

    // Kommo específico
    this.kommoSalesbotId = dto.kommoSalesbotId;

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
