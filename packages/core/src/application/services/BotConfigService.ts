// @clinickeys-agents/core/src/application/services/BotConfigService.ts

import { IBotConfigRepository } from "@clinickeys-agents/core/domain/botConfig/IBotConfigRepository";
import { BotConfigDTO, BotConfigEnrichedDTO } from "@clinickeys-agents/core/domain/botConfig/dtos";
import { BotConfigEnricher } from "@clinickeys-agents/core/application/services/BotConfigEnricher";
import { IOpenAIAssistantRepository } from "@clinickeys-agents/core/domain/openai";
import { generateInstructions } from "@clinickeys-agents/core/utils/generateInstructions";
import { defaultPlaceholders } from "@clinickeys-agents/core/utils/defaultPlaceholders";
import fs from "fs";
import path from "path";

export interface CreateBotConfigInput {
  botConfigId: string;
  clinicSource: string;
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
  };
}

export class BotConfigService {
  private readonly repo: IBotConfigRepository;
  private readonly openaiRepo: IOpenAIAssistantRepository;

  constructor(
    repo: IBotConfigRepository,
    openaiRepo: IOpenAIAssistantRepository
  ) {
    this.repo = repo;
    this.openaiRepo = openaiRepo;
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

  /**
   * Crea un nuevo BotConfig y todos los assistants de la carpeta de instrucciones, generando instrucciones y mapping dinámico.
   */
  async createBotConfig(input: CreateBotConfigInput): Promise<BotConfigDTO> {
    // 1. Merge placeholders con defaults
    const placeholders: Record<string, string> = { ...defaultPlaceholders, ...(input.placeholders || {}) };

    // 2. Buscar todos los templates .md disponibles en la carpeta de instrucciones
    const templateDir = path.resolve(__dirname, "..", "..", ".ia", "instructions", "templates");
    const assistantFiles = fs.readdirSync(templateDir).filter((file) => file.endsWith(".md"));

    // 3. Genera instrucciones para cada assistant y crea cada assistant en OpenAI
    const assistants: Record<string, string> = {};
    for (const fileName of assistantFiles) {
      const assistantKey = path.basename(fileName, ".md"); // sin .md
      const instructionText = generateInstructions(assistantKey, placeholders);

      const assistant = await this.openaiRepo.createAssistant({
        name: assistantKey,
        instructions: instructionText,
        top_p: 0.01,
        temperature: 0.01,
      });
      assistants[assistantKey] = assistant.id;
    }

    // 4. Armar objeto BotConfigDTO (repo agrega PK/SK/bucket/etc)
    const toSave: Omit<BotConfigDTO, "pk" | "sk" | "bucket" | "createdAt" | "updatedAt"> = {
      botConfigId: input.botConfigId,
      clinicSource: input.clinicSource,
      clinicId: input.clinicId,
      crmType: input.crmType,
      crmSubdomain: input.crmSubdomain,
      crmApiKey: input.crmApiKey,
      kommoSalesbotId: input.kommoSalesbotId,
      defaultCountry: input.defaultCountry,
      timezone: input.timezone,
      name: input.name,
      description: input.description,
      fieldsProfile: input.fieldsProfile,
      openai: { assistants },
      placeholders,
    };

    await this.repo.create(toSave);

    // Devuelve lo persistido (sin PK/SK/bucket/createdAt/updatedAt, el repo lo añadirá al devolverlo)
    return {
      ...toSave,
      pk: "",
      sk: "",
      bucket: 0,
      createdAt: 0,
      updatedAt: 0,
    } as BotConfigDTO;
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
