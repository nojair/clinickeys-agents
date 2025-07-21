// packages/core/src/application/usecases/GetBotConfigUseCase.ts

import { BotConfigDTO } from "../../domain/botConfig/dtos";
import { BotConfigRepositoryDynamo } from "../../infrastructure/BotConfig/BotConfigRepositoryDynamo";

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
  async execute(bot_config_id: string, source_clinica: string, id_clinica: string): Promise<BotConfigDTO | null> {
    return this.botConfigRepository.findByBotConfig(bot_config_id, source_clinica, id_clinica);
  }
}
