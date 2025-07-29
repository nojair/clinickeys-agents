// packages/core/src/application/services/BotConfigService.ts

import { BotConfigDTO, BotConfigEnrichedDTO } from "@clinickeys-agents/core/domain/botConfig";
import { defaultPlaceholders, generateInstructions } from "@clinickeys-agents/core/utils";
import { IOpenAIAssistantRepository } from "@clinickeys-agents/core/domain/openai";
import { BotConfigEnricher } from "@clinickeys-agents/core/application/services";
import { IBotConfigRepository } from "@clinickeys-agents/core/domain/botConfig";
import path from "path";
import fs from "fs";

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

  async findByBotConfig(botConfigId: string, clinicSource: string, clinicId: number): Promise<BotConfigDTO | null> {
    return this.repo.findByBotConfig(botConfigId, clinicSource, clinicId);
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
        assistants
      },
      placeholders,
      isActive: true, // o como prefieras
    };

    // Devuelve el objeto real, con pk/sk/bucket/createdAt/updatedAt generados
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
