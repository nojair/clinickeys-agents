// packages/core/src/application/services/BotConfigService.ts

import { BotConfigDTO, BotConfigEnrichedDTO } from "@clinickeys-agents/core/domain/botConfig";
import { defaultPlaceholders } from "@clinickeys-agents/core/utils";
import { BotConfigEnricher } from "@clinickeys-agents/core/application/services";
import { IBotConfigRepository } from "@clinickeys-agents/core/domain/botConfig";

export interface CreateBotConfigInput {
  botConfigId: string;
  clinicSource: string;
  superClinicId: number,
  clinicId: number;
  crmType: string;
  crmSubdomain?: string;
  crmApiKey: string;
  kommoSalesbotId?: number;
  defaultCountry: string;
  timezone: string;
  name: string;
  description: string;
  fieldsProfile: string;
  placeholders?: Record<string, string>;
  openai: {
    token: string;
    // assistants?: Record<string, string>; // Ya no se maneja aquí
  };
}

export class BotConfigService {
  private readonly repo: IBotConfigRepository;

  constructor(repo: IBotConfigRepository) {
    this.repo = repo;
  }

  /**
   * Obtiene un BotConfig enriquecido (campos custom, is_ready, etc.)
   */
  async getEnrichedBotConfig(botConfigId: string, clinicSource: string, clinicId: number): Promise<BotConfigEnrichedDTO | null> {
    const dto = await this.repo.findByBotConfig(botConfigId, clinicSource, clinicId);
    if (!dto) return null;
    return await BotConfigEnricher.enrich(dto);
  }

  /**
   * Obtiene un BotConfig "raw" (sin enriquecer).
   */
  async getBotConfig(botConfigId: string, clinicSource: string, clinicId: number): Promise<BotConfigDTO | null> {
    return await this.repo.findByBotConfig(botConfigId, clinicSource, clinicId);
  }

  async findByBotConfig(botConfigId: string, clinicSource: string, clinicId: number): Promise<BotConfigDTO | null> {
    return this.repo.findByBotConfig(botConfigId, clinicSource, clinicId);
  }

  /**
   * Crea un nuevo BotConfig con los datos básicos (sin assistants OpenAI).
   */
  async createBotConfig(input: CreateBotConfigInput): Promise<BotConfigDTO> {
    // Merge placeholders con defaults
    const placeholders: Record<string, string> = { ...defaultPlaceholders, ...(input.placeholders || {}) };

    const toSave: Omit<BotConfigDTO, "pk" | "sk" | "bucket" | "createdAt" | "updatedAt"> = {
      botConfigId: input.botConfigId,
      superClinicId: input.superClinicId,
      clinicSource: input.clinicSource,
      clinicId: input.clinicId,
      crmType: input.crmType,
      crmSubdomain: input.crmSubdomain,
      crmApiKey: input.crmApiKey,
      kommo: {
        salesbotId: input.kommoSalesbotId,
      },
      defaultCountry: input.defaultCountry,
      timezone: input.timezone,
      name: input.name,
      description: input.description,
      fieldsProfile: input.fieldsProfile,
      openai: {
        token: input.openai.token,
        // assistants se agregará/actualizará luego desde el UseCase
      },
      placeholders,
      isActive: true, // o como prefieras
    };

    // Guarda y retorna el BotConfig completo
    const savedDto = await this.repo.create(toSave);
    return savedDto;
  }

  /**
   * Lista todos los configs de una clínica, enriquecidos.
   */
  async listEnrichedByClinic(clinicSource: string, clinicId: number, limit = 50, cursor?: Record<string, any>): Promise<{ items: BotConfigEnrichedDTO[], nextCursor?: Record<string, any> }> {
    const { items, nextCursor } = await this.repo.listByClinic(clinicSource, clinicId, limit, cursor);
    const enriched = await BotConfigEnricher.enrichMany(items);
    return { items: enriched, nextCursor };
  }

  /**
   * Aplica un patch a un BotConfig existente.
   */
  async patchBotConfig(botConfigId: string, clinicSource: string, clinicId: number, updates: Partial<BotConfigDTO>): Promise<void> {
    await this.repo.patch(botConfigId, clinicSource, clinicId, updates);
  }

  /**
   * Elimina un BotConfig.
   */
  async deleteBotConfig(botConfigId: string, clinicSource: string, clinicId: number): Promise<void> {
    await this.repo.delete(botConfigId, clinicSource, clinicId);
  }

  /**
   * Lista los BotConfig globalmente usando sharding por bucket (con paginación).
   */
  async listGlobal(
    limit: number = 100,
    cursor: Record<string, Record<string, any>> = {}
  ): Promise<{ items: BotConfigDTO[]; nextCursor: Record<string, Record<string, any>> }> {
    return this.repo.listGlobal(limit, cursor);
  }
}
