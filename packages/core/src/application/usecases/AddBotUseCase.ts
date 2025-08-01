// packages/core/src/application/usecases/AddBotUseCase.ts

import { BotConfigDTO, BotConfigType } from "@clinickeys-agents/core/domain/botConfig";
import { IBotConfigRepository } from "@clinickeys-agents/core/domain/botConfig";
import { IOpenAIAssistantRepository } from "@clinickeys-agents/core/domain/openai";
import { defaultPlaceholders, generateInstructions } from "@clinickeys-agents/core/utils";
import path from "path";
import fs from "fs";

export interface AddBotInput {
  botConfigType: BotConfigType;
  botConfigId: string;
  clinicSource: string;
  superClinicId: number;
  clinicId: number;
  kommoSubdomain: string;
  responsibleUserId: string;
  longLivedToken: string;
  salesbotId: number;
  defaultCountry: string;
  timezone: string;
  name: string;
  description: string;
  fieldsProfile: string;
  placeholders?: Record<string, string>;
  openai?: {
    apiKey: string;
  };
  assistantsToCreate?: string[];
}

export class AddBotUseCase {
  private readonly botConfigRepo: IBotConfigRepository;
  private readonly openaiRepoFactory: (apiKey: string) => IOpenAIAssistantRepository;

  constructor(
    botConfigRepo: IBotConfigRepository,
    openaiRepoFactory: (apiKey: string) => IOpenAIAssistantRepository
  ) {
    this.botConfigRepo = botConfigRepo;
    this.openaiRepoFactory = openaiRepoFactory;
  }

  async execute(input: AddBotInput): Promise<BotConfigDTO> {
    if (input.botConfigType === BotConfigType.ChatBot) {
      // --- FLUJO PARA CHATBOT ---
      if (!input.openai || !input.openai.apiKey) {
        throw new Error("openai.apiKey es obligatorio para chatBot");
      }
      const placeholders: Record<string, string> = { ...defaultPlaceholders, ...(input.placeholders || {}) };

      const templateDir = path.resolve(__dirname, "..", "..", ".ia", "instructions", "templates");
      let assistantFiles = fs.readdirSync(templateDir).filter((file) => file.endsWith(".md"));
      if (input.assistantsToCreate && input.assistantsToCreate.length > 0) {
        assistantFiles = assistantFiles.filter((file) => input.assistantsToCreate!.includes(path.basename(file, ".md")));
      }
      if (assistantFiles.length === 0) {
        throw new Error("No hay templates .md disponibles para crear assistants.");
      }

      const assistants: Record<string, string> = {};
      const openaiRepo = this.openaiRepoFactory(input.openai.apiKey);
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

      const toSave: Omit<BotConfigDTO, "pk" | "sk" | "bucket" | "createdAt" | "updatedAt"> = {
        botConfigType: input.botConfigType,
        botConfigId: input.botConfigId,
        superClinicId: input.superClinicId,
        clinicSource: input.clinicSource,
        clinicId: input.clinicId,
        kommoSubdomain: input.kommoSubdomain,
        kommo: {
          responsibleUserId: input.responsibleUserId,
          subdomain: input.kommoSubdomain,
          longLivedToken: input.longLivedToken,
          salesbotId: input.salesbotId,
        },
        defaultCountry: input.defaultCountry,
        timezone: input.timezone,
        name: input.name,
        description: input.description,
        fieldsProfile: input.fieldsProfile,
        openai: {
          apiKey: input.openai.apiKey,
          assistants,
        },
        placeholders,
        isEnabled: true,
      };
      const savedDto = await this.botConfigRepo.create(toSave);
      return savedDto;
    }
    // --- FLUJO PARA NOTIFICATION BOT ---
    else if (input.botConfigType === BotConfigType.NotificationBot) {
      const toSave: Omit<BotConfigDTO, "pk" | "sk" | "bucket" | "createdAt" | "updatedAt"> = {
        botConfigType: input.botConfigType,
        botConfigId: input.botConfigId,
        superClinicId: input.superClinicId,
        clinicSource: input.clinicSource,
        clinicId: input.clinicId,
        kommoSubdomain: input.kommoSubdomain,
        kommo: {
          responsibleUserId: input.responsibleUserId,
          subdomain: input.kommoSubdomain,
          longLivedToken: input.longLivedToken,
          salesbotId: input.salesbotId,
        },
        defaultCountry: input.defaultCountry,
        timezone: input.timezone,
        name: input.name,
        description: input.description,
        fieldsProfile: input.fieldsProfile,
        isEnabled: true,
        // NO openai, NO placeholders
      };
      const savedDto = await this.botConfigRepo.create(toSave);
      return savedDto;
    }
    else {
      throw new Error("Tipo de botConfigType no soportado en AddBotUseCase");
    }
  }
}
