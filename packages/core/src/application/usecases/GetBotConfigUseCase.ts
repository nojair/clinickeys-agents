// packages/core/src/application/usecases/GetBotConfigUseCase.ts

import { BotConfigDTO } from "@clinickeys-agents/core/domain/botConfig";
import { IBotConfigRepository } from "@clinickeys-agents/core/domain/botConfig";

export interface GetBotConfigUseCaseProps {
  botConfigRepository: Pick<IBotConfigRepository, "findByBotConfig">;
}

export class GetBotConfigUseCase {
  private botConfigRepository: Pick<IBotConfigRepository, "findByBotConfig">;

  constructor(props: GetBotConfigUseCaseProps) {
    this.botConfigRepository = props.botConfigRepository;
  }

  /**
   * Obtiene la configuración de un bot por botConfigId y clinicId.
   */
  async execute(botConfigId: string, source_clinica: string, clinicId: number): Promise<BotConfigDTO | null> {
    return this.botConfigRepository.findByBotConfig(botConfigId, source_clinica, clinicId);
  }
}
