// packages/core/src/application/usecases/ListGlobalBotConfigsUseCase.ts

import { BotConfigDTO } from "@clinickeys-agents/core/domain/botConfig";
import { IBotConfigRepository } from "@clinickeys-agents/core/domain/botConfig";

export interface ListGlobalBotConfigsInput {
  /** Máximo de ítems a devolver. Default 100 */
  limit?: number;
  /** Cursor por bucket devuelto en la llamada previa */
  cursor?: Record<string, Record<string, any>>;
}

export interface ListGlobalBotConfigsUseCaseProps {
  botConfigRepository: Pick<IBotConfigRepository, "listGlobal">;
}

export class ListGlobalBotConfigsUseCase {
  private readonly repo: Pick<IBotConfigRepository, "listGlobal">;

  constructor(props: ListGlobalBotConfigsUseCaseProps) {
    this.repo = props.botConfigRepository;
  }

  /**
   * Lista los BotConfig globalmente usando sharding por bucket.
   * Devuelve lote + cursor para paginación.
   */
  async execute(input: ListGlobalBotConfigsInput = {}): Promise<{
    items: BotConfigDTO[];
    nextCursor: Record<string, Record<string, any>>;
  }> {
    const { limit = 100, cursor = {} } = input;
    return this.repo.listGlobal(limit, cursor);
  }
}
