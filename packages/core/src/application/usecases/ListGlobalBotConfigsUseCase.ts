// packages/core/src/application/usecases/ListGlobalBotConfigsUseCase.ts

import { BotConfigService } from "@clinickeys-agents/core/application/services";
import { BotConfigEnrichedDTO } from "@clinickeys-agents/core/domain/botConfig";

export interface ListGlobalBotConfigsInput {
  /** Máximo de ítems a devolver. Default 100 */
  limit?: number;
  /** Cursor opaco devuelto en la llamada previa */
  cursor?: string;
}

export interface ListGlobalBotConfigsUseCaseProps {
  botConfigService: BotConfigService;
}

export class ListGlobalBotConfigsUseCase {
  private readonly botConfigService: BotConfigService;

  constructor(props: ListGlobalBotConfigsUseCaseProps) {
    this.botConfigService = props.botConfigService;
  }

  /**
   * Lista los BotConfig globalmente usando sharding por bucket.
   * Devuelve lote + cursor para paginación cursor‑based.
   */
  async execute(
    input: ListGlobalBotConfigsInput = {},
  ): Promise<{ items: BotConfigEnrichedDTO[]; nextCursor?: string }> {
    const { limit = 100, cursor } = input;
    return this.botConfigService.listGlobal(limit, cursor);
  }
}
