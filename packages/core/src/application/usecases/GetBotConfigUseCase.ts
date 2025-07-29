// packages/core/src/application/usecases/GetBotConfigUseCase.ts

import { BotConfigService } from "@clinickeys-agents/core/application/services";
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
  async execute(botConfigId: string, clinicSource: string, clinicId: number): Promise<BotConfigDTO | null> {
    return this.botConfigService.getBotConfig(botConfigId, clinicSource, clinicId);
  }
}
