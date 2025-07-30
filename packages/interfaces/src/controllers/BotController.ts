// -----------------------------------------------------------------------------
// packages/core/src/interface/controllers/BotController.ts
// -----------------------------------------------------------------------------

import { BotConfigDTO } from "@clinickeys-agents/core/domain/botConfig";
import {
  AddBotUseCase,
  DeleteBotUseCase,
  UpdateBotConfigUseCase,
  GetBotConfigUseCase,
  ListGlobalBotConfigsUseCase,
  type AddBotInput,
  type UpdateBotConfigInput,
  type ListGlobalBotConfigsInput,
} from "@clinickeys-agents/core/application/usecases";

export interface BotControllerProps {
  addUseCase: AddBotUseCase;
  deleteUseCase: DeleteBotUseCase;
  updateUseCase: UpdateBotConfigUseCase;
  getUseCase: GetBotConfigUseCase;
  listGlobalUseCase: ListGlobalBotConfigsUseCase;
}

export class BotController {
  private readonly addUseCase: AddBotUseCase;
  private readonly deleteUseCase: DeleteBotUseCase;
  private readonly updateUseCase: UpdateBotConfigUseCase;
  private readonly getUseCase: GetBotConfigUseCase;
  private readonly listGlobalUseCase: ListGlobalBotConfigsUseCase;

  constructor(props: BotControllerProps) {
    this.addUseCase = props.addUseCase;
    this.deleteUseCase = props.deleteUseCase;
    this.updateUseCase = props.updateUseCase;
    this.getUseCase = props.getUseCase;
    this.listGlobalUseCase = props.listGlobalUseCase;
  }

  // --- BOT (config + assistants) -------------------------------------------
  addBot(input: AddBotInput): Promise<BotConfigDTO> {
    return this.addUseCase.execute(input);
  }

  deleteBot(
    botConfigId: string,
    clinicSource: string,
    clinicId: number
  ): Promise<void> {
    return this.deleteUseCase.execute({ botConfigId, clinicSource, clinicId });
  }

  // --- BOT-CONFIG (sólo configuración) -------------------------------------
  updateBotConfig(input: UpdateBotConfigInput): Promise<void> {
    return this.updateUseCase.execute(input);
  }

  getBotConfig(botConfigId: string, clinicSource: string, clinicId: number): Promise<BotConfigDTO | null> {
    return this.getUseCase.execute(botConfigId, clinicSource, clinicId);
  }

  listGlobalBotConfigs(input: ListGlobalBotConfigsInput) {
    return this.listGlobalUseCase.execute(input);
  }
}
