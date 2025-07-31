// packages/core/src/application/usecases/GetBotConfigUseCase.ts

import { BotConfigService } from "@clinickeys-agents/core/application/services";
import { BotConfigType } from '@clinickeys-agents/core/domain/botConfig';
import { BotConfigDTO } from "@clinickeys-agents/core/domain/botConfig";

export interface GetBotConfigUseCaseProps {
  botConfigService: BotConfigService;
}

export class GetBotConfigUseCase {
  private readonly botConfigService: BotConfigService;

  constructor(props: GetBotConfigUseCaseProps) {
    this.botConfigService = props.botConfigService;
  }

  /**
   * Obtiene la configuración de un bot por botConfigId y clinicId.
   */
  async execute(botConfigType: BotConfigType, botConfigId: string, clinicSource: string, clinicId: number): Promise<BotConfigDTO | null> {
    return this.botConfigService.getBotConfig(botConfigType, botConfigId, clinicSource, clinicId);
  }
}
