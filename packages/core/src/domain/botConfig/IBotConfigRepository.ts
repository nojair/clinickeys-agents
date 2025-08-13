// packages/core/src/domain/botConfig/IBotConfigRepository.ts

import { BotConfigDTO, BotConfigType } from "./dtos";
import { UpdateBotConfigPayload } from "@clinickeys-agents/core/application/usecases";

/**
 * Contrato para cualquier repositorio capaz de persistir BotConfig.
 *
 * Todas las operaciones de listado exponen paginación **cursor‑based** con un token opaco `string` (Base64‑JSON).
 *   - La primera página se solicita con `cursor === undefined`.
 *   - Si el backend devuelve `nextCursor === undefined`, significa que no hay más datos.
 */
export interface IBotConfigRepository {
  /**
   * Crea un nuevo BotConfig. El repositorio compone PK, SK, bucket y timestamps.
   */
  create(
    dto: Omit<BotConfigDTO, "pk" | "sk" | "bucket" | "createdAt" | "updatedAt">,
  ): Promise<BotConfigDTO>;

  /**
   * Obtiene un BotConfig único por sus claves primarias lógicas.
   */
  findByPrimaryKey(
    botConfigType: BotConfigType,
    botConfigId: string,
    clinicSource: string,
    clinicId: number,
  ): Promise<BotConfigDTO | null>;

  /**
   * Lista todos los BotConfig por subdominio Kommo (GSI `byKommoSubdomain`).
   */
  listByKommoSubdomain(
    kommoSubdomain: string,
    limit?: number,
    cursor?: string,
  ): Promise<{ items: BotConfigDTO[]; nextCursor?: string }>;

  /**
   * Lista todos los BotConfig de un tipo específico (GSI `byBotConfigType`).
   */
  listByBotConfigType(
    botConfigType: BotConfigType,
    limit?: number,
    cursor?: string,
  ): Promise<{ items: BotConfigDTO[]; nextCursor?: string }>;

  /**
   * Lista todos los BotConfig de una clínica (paginado por PK).
   */
  listByClinic(
    clinicSource: string,
    clinicId: number,
    limit?: number,
    cursor?: string,
  ): Promise<{ items: BotConfigDTO[]; nextCursor?: string }>;

  /**
   * Lista los BotConfig de una fuente (GSI `byClinicSourceCreated`).
   */
  listBySource(
    clinicSource: string,
    limit?: number,
    cursor?: string,
  ): Promise<{ items: BotConfigDTO[]; nextCursor?: string }>;

  /**
   * Feed global usando sharding por bucket.
   */
  listGlobal(
    limit?: number,
    cursor?: string,
  ): Promise<{ items: BotConfigDTO[]; nextCursor?: string }>;

  /**
   * Parche parcial de campos mutables.
   */
  patch(
    botConfigType: BotConfigType,
    botConfigId: string,
    clinicSource: string,
    clinicId: number,
    updates: UpdateBotConfigPayload,
  ): Promise<void>;

  /**
   * Elimina un BotConfig.
   */
  delete(
    botConfigType: BotConfigType,
    botConfigId: string,
    clinicSource: string,
    clinicId: number,
  ): Promise<void>;
}
