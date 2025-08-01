// packages/core/src/application/services/BotConfigService.ts

import { BotConfigDTO, BotConfigEnrichedDTO, BotConfigType, CreateChatBotConfigDTO, CreateNotificationBotConfigDTO } from "@clinickeys-agents/core/domain/botConfig";
import { defaultPlaceholders } from "@clinickeys-agents/core/utils";
import { BotConfigEnricher } from "@clinickeys-agents/core/application/services";
import { IBotConfigRepository } from "@clinickeys-agents/core/domain/botConfig";

export type CreateBotConfigInput = CreateChatBotConfigDTO | CreateNotificationBotConfigDTO;

type PartialChatBotConfigDTO = Omit<CreateChatBotConfigDTO, 'botConfigType'> & {
  botConfigType: BotConfigType.ChatBot;
  placeholders: Record<string, any>;
  openai: {
    apiKey: string;
  };
  isEnabled: boolean;
  botConfigId: string;
  // + los campos Dynamo que agrega el repo al guardar
};

type PartialNotificationBotConfigDTO = Omit<CreateNotificationBotConfigDTO, 'botConfigType'> & {
  botConfigType: BotConfigType.NotificationBot;
  isEnabled: boolean;
  botConfigId: string;
  // + los campos Dynamo que agrega el repo al guardar
};

export class BotConfigService {
  private readonly repo: IBotConfigRepository;

  constructor(repo: IBotConfigRepository) {
    this.repo = repo;
  }

  /**
   * Obtiene un BotConfig enriquecido (campos custom, is_ready, etc.)
   */
  async getEnrichedBotConfig(
    botConfigType: BotConfigType,
    botConfigId: string,
    clinicSource: string,
    clinicId: number
  ): Promise<BotConfigEnrichedDTO | null> {
    const dto = await this.repo.findByPrimaryKey(botConfigType, botConfigId, clinicSource, clinicId);
    if (!dto) return null;
    return await BotConfigEnricher.enrich(dto);
  }

  /**
   * Obtiene un BotConfig "raw" (sin enriquecer).
   */
  async getBotConfig(
    botConfigType: BotConfigType,
    botConfigId: string,
    clinicSource: string,
    clinicId: number
  ): Promise<BotConfigDTO | null> {
    return await this.repo.findByPrimaryKey(botConfigType, botConfigId, clinicSource, clinicId);
  }

  /**
   * Crea un nuevo ChatBotConfig.
   */
  async createChatBotConfig(input: CreateChatBotConfigDTO & { botConfigId: string }): Promise<BotConfigDTO> {
    const placeholders: Record<string, any> = {
      ...defaultPlaceholders,
      ...(input.placeholders || {}),
    };
    const toSave: PartialChatBotConfigDTO = {
      ...input,
      placeholders,
      openai: {
        apiKey: input.openai.apiKey,
      },
      isEnabled: input.isEnabled ?? true,
      botConfigId: input.botConfigId,
    };
    return await this.repo.create(toSave);
  }

  /**
   * Crea un nuevo NotificationBotConfig.
   */
  async createNotificationBotConfig(input: CreateNotificationBotConfigDTO & { botConfigId: string }): Promise<BotConfigDTO> {
    const toSave: PartialNotificationBotConfigDTO = {
      ...input,
      isEnabled: input.isEnabled ?? true,
      botConfigId: input.botConfigId,
    };
    return await this.repo.create(toSave);
  }

  /**
   * Obtiene todos los configs de una clínica enriquecidos.
   */
  async listEnrichedByClinic(
    clinicSource: string,
    clinicId: number,
    limit = 50,
    cursor?: Record<string, any>
  ): Promise<{ items: BotConfigEnrichedDTO[]; nextCursor?: Record<string, any> }> {
    const { items, nextCursor } = await this.repo.listByClinic(clinicSource, clinicId, limit, cursor);
    const enriched = await BotConfigEnricher.enrichMany(items);
    return { items: enriched, nextCursor };
  }

  /**
   * Aplica un patch a un BotConfig existente.
   */
  async patchBotConfig(
    botConfigType: BotConfigType,
    botConfigId: string,
    clinicSource: string,
    clinicId: number,
    updates: Partial<BotConfigDTO>
  ): Promise<void> {
    await this.repo.patch(botConfigType, botConfigId, clinicSource, clinicId, updates);
  }

  /**
   * Elimina un BotConfig.
   */
  async deleteBotConfig(
    botConfigType: BotConfigType,
    botConfigId: string,
    clinicSource: string,
    clinicId: number
  ): Promise<void> {
    await this.repo.delete(botConfigType, botConfigId, clinicSource, clinicId);
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
