// packages/core/src/application/usecases/DeleteBotConfigUseCase.ts

import { BotConfigRepositoryDynamo } from "../../infrastructure/BotConfig/BotConfigRepositoryDynamo";

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
  async execute(bot_config_id: string, clinic_source: string, id_clinica: string): Promise<void> {
    await this.botConfigRepository.delete(bot_config_id, clinic_source, id_clinica);
  }
}
