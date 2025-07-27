// packages/core/src/application/usecases/DeleteBotConfigUseCase.ts

import { BotConfigService } from "@clinickeys-agents/core/application/services/BotConfigService";

export interface DeleteBotConfigUseCaseProps {
  botConfigService: BotConfigService;
}

export class DeleteBotConfigUseCase {
  private readonly botConfigService: BotConfigService;

  constructor(props: DeleteBotConfigUseCaseProps) {
    this.botConfigService = props.botConfigService;
  }

  /**
   * Elimina la configuración de un bot de notificaciones para una clínica.
   */
  async execute(botConfigId: string, clinicSource: string, clinicId: number): Promise<void> {
    await this.botConfigService.deleteBotConfig(botConfigId, clinicSource, clinicId);
  }
}
