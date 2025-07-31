// packages/core/src/application/usecases/DeleteBotUseCase.ts

import { IBotConfigRepository, BotConfigType } from "@clinickeys-agents/core/domain/botConfig";
import { IOpenAIAssistantRepository } from "@clinickeys-agents/core/domain/openai";

export interface DeleteBotConfigInput {
  botConfigType: BotConfigType;
  botConfigId: string;
  clinicSource: string;
  clinicId: number;
}

export interface DeleteBotUseCaseProps {
  /** Repositorio para persistir / eliminar BotConfig */
  botConfigRepo: IBotConfigRepository;
  /** Factory que devuelve un repositorio de assistants dada una API key */
  openaiRepoFactory: (apiKey: string) => IOpenAIAssistantRepository;
}

/**
 * UseCase: Eliminar un BotConfig y sus assistants en OpenAI.
 *
 * 1. Recupera el BotConfig para obtener apiKey OpenAI e IDs de assistants.
 * 2. Elimina en paralelo los assistants (si existen).
 * 3. Borra el BotConfig en DynamoDB.
 *
 * Los fallos al borrar algún assistant no abortan la operación; se ignoran
 * tras registrarlos (la llamada Promise.allSettled los captura).
 */
export class DeleteBotUseCase {
  private readonly botConfigRepo: IBotConfigRepository;
  private readonly openaiRepoFactory: (apiKey: string) => IOpenAIAssistantRepository;

  constructor(props: DeleteBotUseCaseProps) {
    this.botConfigRepo = props.botConfigRepo;
    this.openaiRepoFactory = props.openaiRepoFactory;
  }

  async execute(input: DeleteBotConfigInput): Promise<void> {
    const { botConfigType, botConfigId, clinicSource, clinicId } = input;

    // 1. Obtener la configuración actual
    const dto = await this.botConfigRepo.findByPrimaryKey(botConfigType, botConfigId, clinicSource, clinicId);
    if (!dto) {
      throw new Error(`BotConfig ${botConfigId} no encontrado (${clinicSource}/${clinicId})`);
    }

    // 2. Borrar assistants asociados (si los hay)
    const apiKey = dto.openai?.apiKey;
    const assistants = dto.openai?.assistants;

    if (apiKey && assistants && Object.keys(assistants).length > 0) {
      const openaiRepo = this.openaiRepoFactory(apiKey);

      await Promise.allSettled(
        Object.values(assistants).map((assistantId) => openaiRepo.deleteAssistant(assistantId))
      );
    }

    // 3. Borrar el BotConfig
    await this.botConfigRepo.delete(botConfigType, botConfigId, clinicSource, clinicId);
  }
}
