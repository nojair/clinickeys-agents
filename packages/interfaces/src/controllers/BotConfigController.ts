// packages/core/src/interface/controllers/BotConfigController.ts

import {
  AddOpenAIBotConfigUseCase,
  AddOpenAIBotConfigInput,
  UpdateBotConfigUseCase,
  UpdateBotConfigInput,
  DeleteBotConfigUseCase,
  GetBotConfigUseCase,
  ListGlobalBotConfigsUseCase,
  ListGlobalBotConfigsInput
} from "@clinickeys-agents/core/application/usecases";

export interface BotConfigControllerProps {
  addUseCase: AddOpenAIBotConfigUseCase;
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
  private readonly add: AddOpenAIBotConfigUseCase;
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
  async addBotConfig(input: AddOpenAIBotConfigInput): Promise<void> {
    await this.add.execute(input);
  }

  async updateBotConfig(input: UpdateBotConfigInput): Promise<void> {
    await this.update.execute(input);
  }

  async deleteBotConfig(botConfigId: string, clinicSource: string, clinicId: number): Promise<void> {
    await this.del.execute(botConfigId, clinicSource, clinicId);
  }

  async getBotConfig(botConfigId: string, clinicSource: string, clinicId: number) {
    return this.get.execute(botConfigId, clinicSource, clinicId);
  }

  async listGlobalBotConfigs(params: ListGlobalBotConfigsInput = {}) {
    return this.listGlobal.execute(params);
  }
}
