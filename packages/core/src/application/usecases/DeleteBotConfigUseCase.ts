// packages/core/src/application/usecases/DeleteBotConfigUseCase.ts

import { BotConfigRepositoryDynamo } from "@clinickeys-agents/core/infrastructure/botConfig";

export interface DeleteBotConfigUseCaseProps {
  botConfigRepository: BotConfigRepositoryDynamo;
}

export class DeleteBotConfigUseCase {
  private botConfigRepository: BotConfigRepositoryDynamo;

  constructor(props: DeleteBotConfigUseCaseProps) {
    this.botConfigRepository = props.botConfigRepository;
  }

  /**
   * Elimina la configuración de un bot de notificaciones para una clínica.
   */
  async execute(botConfigId: string, clinicSource: string, clinicId: number): Promise<void> {
    await this.botConfigRepository.delete(botConfigId, clinicSource, clinicId);
  }
}
