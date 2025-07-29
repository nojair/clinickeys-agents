// packages/core/src/application/usecases/AddOpenAIBotConfigUseCase.ts

import { OpenAIService } from "@clinickeys-agents/core/application/services/OpenAIService";
import { BotConfigService } from "@clinickeys-agents/core/application/services/BotConfigService";
import { BotConfigDTO } from "@clinickeys-agents/core/domain/botConfig/dtos";

/**
 * Input para agregar una nueva configuración de bot OpenAI.
 * Incluye instrucciones para uno o varios assistants a crear.
 * No requiere pk, sk, bucket, createdAt ni updatedAt.
 */
export type AddOpenAIBotConfigInput = Omit<BotConfigDTO,
  "pk" | "sk" | "bucket" | "createdAt" | "updatedAt"
> & {
  instructions: Record<string, string>;
};

export interface AddOpenAIBotConfigUseCaseProps {
  openAIService: OpenAIService;
  botConfigService: BotConfigService;
}

/**
 * Use Case: Alta de configuración de bot OpenAI + múltiples Assistants en OpenAI.
 * - Crea uno o varios Assistants en OpenAI (usando el service)
 * - Persiste el BotConfigDTO con los assistant IDs correspondientes (usando el service)
 */
export class AddOpenAIBotConfigUseCase {
  private readonly openAIService: OpenAIService;
  private readonly botConfigService: BotConfigService;

  constructor(props: AddOpenAIBotConfigUseCaseProps) {
    this.openAIService = props.openAIService;
    this.botConfigService = props.botConfigService;
  }

  async execute(input: AddOpenAIBotConfigInput): Promise<{ assistantIds: Record<string, string>; botConfig: BotConfigDTO }> {
    // 1. Crea los assistants en OpenAI usando el service
    const assistantIds = await this.openAIService.createAssistants(input.instructions);

    // 2. Prepara la config de openai.assistants
    const openaiConfig = {
      token: input.openai.token,
      assistants: {
        speakingBotId: assistantIds.speakingBot ?? Object.values(assistantIds)[0]
      }
    };

    // 3. Desestructura para excluir instructions
    const { instructions, ...rest } = input;

    // 4. Construye el DTO a guardar (sin campos generados)
    const botConfigToSave: Omit<BotConfigDTO, "pk" | "sk" | "bucket" | "createdAt" | "updatedAt"> & { openai: typeof openaiConfig } = {
      ...rest,
      openai: openaiConfig,
    };

    // 5. Persiste el BotConfig usando el service y GUARDA el DTO completo retornado
    const savedBotConfig = await this.botConfigService.createBotConfig(botConfigToSave);

    // 6. Retorna los assistant IDs y el BotConfig guardado (completo)
    return { assistantIds, botConfig: savedBotConfig };
  }
}
