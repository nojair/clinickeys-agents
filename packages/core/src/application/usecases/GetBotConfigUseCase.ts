// packages/core/src/application/usecases/GetBotConfigUseCase.ts

import { BotConfigDTO } from "@clinickeys-agents/core/domain/botConfig";
import { BotConfigRepositoryDynamo } from "@clinickeys-agents/core/infrastructure/botConfig";

export interface GetBotConfigUseCaseProps {
  botConfigRepository: BotConfigRepositoryDynamo;
}

export class GetBotConfigUseCase {
  private botConfigRepository: BotConfigRepositoryDynamo;

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
