// packages/core/src/domain/BotConfig/IBotConfigRepository.ts

import { BotConfigDTO } from "./dtos";
import { UpdateBotConfigPayload } from "@clinickeys-agents/core/application/usecases/UpdateBotConfigUseCase";

/**
 * Contrato para cualquier repositorio capaz de persistir BotConfig.
 */
export interface IBotConfigRepository {
  /**
   * Crea un nuevo BotConfig. El repositorio compone PK, SK, bucket y timestamps.
   */
  create(dto: Omit<BotConfigDTO, "pk" | "sk" | "bucket" | "createdAt" | "updatedAt">): Promise<void>;

  /**
   * Obtiene un BotConfig único por sus claves primarias lógicas.
   */
  findByBotConfig(botConfigId: string, clinicSource: string, clinicId: string): Promise<BotConfigDTO | null>;

  /**
   * Lista todos los BotConfig de una clínica (paginado).
   */
  listByClinic(clinicSource: string, clinicId: string, limit?: number, cursor?: Record<string, any>): Promise<{ items: BotConfigDTO[]; nextCursor?: Record<string, any> }>;

  /**
   * Lista los BotConfig de una fuente (GSI bySourceCreated).
   */
  listBySource(clinicSource: string, limit?: number, cursor?: Record<string, any>): Promise<{ items: BotConfigDTO[]; nextCursor?: Record<string, any> }>;

  /**
   * Feed global usando sharding por bucket.
   */
  listGlobal(limit?: number, cursor?: Record<string, Record<string, any>>): Promise<{ items: BotConfigDTO[]; nextCursor: Record<string, Record<string, any>> }>;

  /**
   * Parche parcial de campos mutables.
   */
  patch(botConfigId: string, clinicSource: string, clinicId: string, updates: UpdateBotConfigPayload): Promise<void>;

  /**
   * Elimina un BotConfig.
   */
  delete(botConfigId: string, clinicSource: string, clinicId: string): Promise<void>;
}
