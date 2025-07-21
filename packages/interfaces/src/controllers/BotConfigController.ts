// packages/core/src/interface/controllers/BotConfigController.ts

import { AddBotConfigUseCase, AddBotConfigInput } from "@clinickeys-agents/core/application/usecases/AddBotConfigUseCase";
import { UpdateBotConfigUseCase, UpdateBotConfigInput } from "@clinickeys-agents/core/application/usecases/UpdateBotConfigUseCase";
import { DeleteBotConfigUseCase } from "@clinickeys-agents/core/application/usecases/DeleteBotConfigUseCase";
import { GetBotConfigUseCase } from "@clinickeys-agents/core/application/usecases/GetBotConfigUseCase";
import { ListGlobalBotConfigsUseCase, ListGlobalBotConfigsInput } from "@clinickeys-agents/core/application/usecases/ListGlobalBotConfigsUseCase";

export interface BotConfigControllerProps {
  addUseCase: AddBotConfigUseCase;
  updateUseCase: UpdateBotConfigUseCase;
  deleteUseCase: DeleteBotConfigUseCase;
  getUseCase: GetBotConfigUseCase;
  listGlobalUseCase: ListGlobalBotConfigsUseCase;
}

/**
 * Controlador HTTP / Lambda para BotConfig.
 * Orquesta las llamadas entre handlers y casos de uso.
 */
export class BotConfigController {
  private readonly add: AddBotConfigUseCase;
  private readonly update: UpdateBotConfigUseCase;
  private readonly del: DeleteBotConfigUseCase;
  private readonly get: GetBotConfigUseCase;
  private readonly listGlobal: ListGlobalBotConfigsUseCase;

  constructor(props: BotConfigControllerProps) {
    this.add = props.addUseCase;
    this.update = props.updateUseCase;
    this.del = props.deleteUseCase;
    this.get = props.getUseCase;
    this.listGlobal = props.listGlobalUseCase;
  }

  // -------------------- public API --------------------
  async addBotConfig(input: AddBotConfigInput): Promise<void> {
    await this.add.execute(input);
  }

  async updateBotConfig(input: UpdateBotConfigInput): Promise<void> {
    await this.update.execute(input);
  }

  async deleteBotConfig(botConfigId: string, clinicSource: string, clinicId: string): Promise<void> {
    await this.del.execute(botConfigId, clinicSource, clinicId);
  }

  async getBotConfig(botConfigId: string, clinicSource: string, clinicId: string) {
    return this.get.execute(botConfigId, clinicSource, clinicId);
  }

  async listGlobalBotConfigs(params: ListGlobalBotConfigsInput = {}) {
    return this.listGlobal.execute(params);
  }
}
