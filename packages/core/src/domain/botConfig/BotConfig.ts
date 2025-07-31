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
  readonly kommoSubdomain?: string;

  // Configuración regional
  readonly defaultCountry: string;
  readonly timezone: string;

  // Metadatos de presentación
  readonly name: string;
  readonly description: string;

  // Estado
  readonly isEnabled?: boolean;

  // Auditoría
  readonly createdAt: number;
  readonly updatedAt: number;

  readonly openai: Record<string, any> | undefined
  readonly kommo: {
    subdomain: string;
    longLivedToken: string;
    salesbotId: number;
  }

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
    this.kommoSubdomain = dto.kommoSubdomain;

    // Kommo específico
    this.kommo = dto.kommo;

    // Config regional
    this.defaultCountry = dto.defaultCountry;
    this.timezone = dto.timezone;

    // Presentación
    this.name = dto.name;
    this.description = dto.description;

    // Estado y auditoría
    this.isEnabled = dto.isEnabled;
    this.createdAt = dto.createdAt;
    this.updatedAt = dto.updatedAt;

    this.openai = dto.openai;
  }

  // Métodos de dominio pueden añadirse aquí.
}
