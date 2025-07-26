// packages/core/src/application/usecases/DeleteBotConfigUseCase.ts

import { IBotConfigRepository } from "@clinickeys-agents/core/domain/botConfig";

export class DeleteBotConfigUseCase {
  private botConfigRepository: Pick<IBotConfigRepository, "delete">;

  constructor(props: Pick<IBotConfigRepository, "delete">) {
    this.botConfigRepository = props;
  }

  /**
   * Elimina la configuración de un bot de notificaciones para una clínica.
   */
  async execute(botConfigId: string, clinicSource: string, clinicId: number): Promise<void> {
    await this.botConfigRepository.delete(botConfigId, clinicSource, clinicId);
  }
}
