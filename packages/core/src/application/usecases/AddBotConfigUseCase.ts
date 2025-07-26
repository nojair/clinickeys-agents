// packages/core/src/application/usecases/AddOpenAIBotConfigUseCase.ts

import { IBotConfigRepository } from "@clinickeys-agents/core/domain/botConfig";
import { IOpenAIAssistantRepository } from "@clinickeys-agents/core/domain/openai";
import { BotConfigDTO } from "@clinickeys-agents/core/domain/botConfig/dtos";
import { Assistant } from "@clinickeys-agents/core/infrastructure/integrations/openai/models";

/**
 * Input para agregar una nueva configuración de bot OpenAI.
 * No requiere pk, sk, bucket, createdAt ni updatedAt.
 * Incluye la info del assistant a crear en OpenAI.
 */
export type AddOpenAIBotConfigInput = Omit<BotConfigDTO,
  "pk" | "sk" | "bucket" | "createdAt" | "updatedAt" | "openai"
> & {
  assistantPayload: {
    name: string;
    instructions: string;
    top_p?: number;
    temperature?: number;
    // Agrega otros campos que acepte tu modelo de OpenAI
  };
};

export interface AddOpenAIBotConfigInterface {
  openAIAssistantRepository: Pick<IOpenAIAssistantRepository, "createAssistant">;
  botConfigRepository: Pick<IBotConfigRepository, "create">;
}

/**
 * Use Case: Alta de configuración de bot OpenAI + Assistant en OpenAI.
 * - Crea un Assistant en OpenAI
 * - Persiste el BotConfigDTO con el assistant ID correspondiente
 */
export class AddOpenAIBotConfigUseCase {
  private readonly openAIRepo: Pick<IOpenAIAssistantRepository, "createAssistant">;
  private readonly botConfigRepo: Pick<IBotConfigRepository, "create">;

  constructor(props: AddOpenAIBotConfigInterface) {
    this.openAIRepo = props.openAIAssistantRepository;
    this.botConfigRepo = props.botConfigRepository;
  }

  async execute(input: AddOpenAIBotConfigInput): Promise<{ assistant: Assistant; botConfig: BotConfigDTO }> {
    // 1. Crea el assistant en OpenAI
    const assistant = await this.openAIRepo.createAssistant(input.assistantPayload);

    // 2. Construye la configuración de openai.assistants
    const openaiConfig = {
      assistants: {
        speakingBotId: assistant.id
      }
    };

    // 3. Desestructura para excluir assistantPayload
    const { assistantPayload, ...rest } = input;

    // 4. Construye el DTO (el repo debe completar pk, sk, bucket, createdAt, updatedAt)
    const botConfigToSave: BotConfigDTO = {
      ...rest,
      openai: openaiConfig,
    } as BotConfigDTO;

    await this.botConfigRepo.create(botConfigToSave);

    return { assistant, botConfig: botConfigToSave };
  }
}
