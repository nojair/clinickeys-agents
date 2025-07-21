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
   * Obtiene la configuración de un bot por bot_config_id y id_clinica.
   */
  async execute(bot_config_id: string, source_clinica: string, id_clinica: number): Promise<BotConfigDTO | null> {
    return this.botConfigRepository.findByBotConfig(bot_config_id, source_clinica, id_clinica);
  }
}
