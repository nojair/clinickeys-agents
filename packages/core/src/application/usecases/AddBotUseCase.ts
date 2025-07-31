// packages/core/src/application/usecases/AddBotUseCase.ts

import { BotConfigDTO } from "@clinickeys-agents/core/domain/botConfig";
import { IBotConfigRepository } from "@clinickeys-agents/core/domain/botConfig";
import { IOpenAIAssistantRepository } from "@clinickeys-agents/core/domain/openai";
import { defaultPlaceholders, generateInstructions } from "@clinickeys-agents/core/utils";
import path from "path";
import fs from "fs";

export interface AddBotInput {
  botConfigId: string;
  clinicSource: string;
  superClinicId: number;
  clinicId: number;
  kommoSubdomain?: string;
  kommoApiKey: string;
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
  // Nueva entrada: permite restringir qué assistants crear o pasar lista explícita
  assistantsToCreate?: string[]; // Ej: ["reception", "marketing"]
}

export class AddBotUseCase {
  private readonly botConfigRepo: IBotConfigRepository;
  private readonly openaiRepoFactory: (token: string) => IOpenAIAssistantRepository;

  constructor(
    botConfigRepo: IBotConfigRepository,
    openaiRepoFactory: (token: string) => IOpenAIAssistantRepository // factory DI para OpenAI repo
  ) {
    this.botConfigRepo = botConfigRepo;
    this.openaiRepoFactory = openaiRepoFactory;
  }

  async execute(input: AddBotInput): Promise<BotConfigDTO> {
    // 1. Merge placeholders
    const placeholders: Record<string, string> = { ...defaultPlaceholders, ...(input.placeholders || {}) };

    // 2. Buscar todos los templates .md disponibles
    const templateDir = path.resolve(__dirname, "..", "..", ".ia", "instructions", "templates");
    let assistantFiles = fs.readdirSync(templateDir).filter((file) => file.endsWith(".md"));
    
    // Si hay restricción, solo usar esos
    if (input.assistantsToCreate && input.assistantsToCreate.length > 0) {
      assistantFiles = assistantFiles.filter((file) => input.assistantsToCreate!.includes(path.basename(file, ".md")));
    }

    if (assistantFiles.length === 0) {
      throw new Error("No hay templates .md disponibles para crear assistants.");
    }

    // 3. Generar instrucciones para cada assistant y crear assistant en OpenAI
    const assistants: Record<string, string> = {};
    const openaiRepo = this.openaiRepoFactory(input.openai.token);
    for (const fileName of assistantFiles) {
      const assistantKey = path.basename(fileName, ".md");
      const instructionText = generateInstructions(assistantKey, placeholders);

      const assistant = await openaiRepo.createAssistant({
        name: assistantKey,
        instructions: instructionText,
        top_p: 0.01,
        temperature: 0.01,
      });
      assistants[assistantKey] = assistant.id;
    }

    // 4. Armar y guardar el BotConfigDTO completo
    const toSave: Omit<BotConfigDTO, "pk" | "sk" | "bucket" | "createdAt" | "updatedAt"> = {
      botConfigId: input.botConfigId,
      superClinicId: input.superClinicId,
      clinicSource: input.clinicSource,
      clinicId: input.clinicId,
      kommoSubdomain: input.kommoSubdomain,
      kommoApiKey: input.kommoApiKey,
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
      isActive: true,
    };

    // 5. Guarda y retorna el BotConfig completo
    const savedDto = await this.botConfigRepo.create(toSave);
    return savedDto;
  }
}
