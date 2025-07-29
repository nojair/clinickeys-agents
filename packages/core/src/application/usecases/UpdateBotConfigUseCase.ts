// packages/core/src/application/usecases/UpdateBotConfigUseCase.ts

import { BotConfigService } from "@clinickeys-agents/core/application/services/BotConfigService";
import { BotConfigDTO } from "@clinickeys-agents/core/domain/botConfig";

// Campos que se permiten actualizar vía PATCH
export type UpdateBotConfigPayload = Partial<Pick<BotConfigDTO,
  | "isActive"
  | "description"
  | "name"
  | "timezone"
  | "defaultCountry"
  | "kommo"
  | "crmApiKey"
  | "crmSubdomain"
  | "crmType"
>>;

export interface UpdateBotConfigInput {
  botConfigId: string;
  clinicSource: string;
  clinicId: number;
  updates: UpdateBotConfigPayload;
}

export interface UpdateBotConfigUseCaseProps {
  botConfigService: BotConfigService;
}

export class UpdateBotConfigUseCase {
  private readonly botConfigService: BotConfigService;

  constructor(props: UpdateBotConfigUseCaseProps) {
    this.botConfigService = props.botConfigService;
  }

  async execute(input: UpdateBotConfigInput): Promise<void> {
    if (!Object.keys(input.updates).length) return; // nada que hacer
    await this.botConfigService.patchBotConfig(
      input.botConfigId,
      input.clinicSource,
      input.clinicId,
      input.updates
    );
  }
}
