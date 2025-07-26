// packages/core/src/application/usecases/UpdateBotConfigUseCase.ts

import { BotConfigDTO } from "@clinickeys-agents/core/domain/botConfig";
import { IBotConfigRepository } from "@clinickeys-agents/core/domain/botConfig";

// Campos que se permiten actualizar vía PATCH
export type UpdateBotConfigPayload = Partial<Pick<BotConfigDTO,
  | "isActive"
  | "description"
  | "name"
  | "timezone"
  | "defaultCountry"
  | "kommoSalesbotId"
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
  botConfigRepository: Pick<IBotConfigRepository, "patch">;
}

export class UpdateBotConfigUseCase {
  private readonly botConfigRepository: Pick<IBotConfigRepository, "patch">;

  constructor(props: UpdateBotConfigUseCaseProps) {
    this.botConfigRepository = props.botConfigRepository;
  }

  async execute(input: UpdateBotConfigInput): Promise<void> {
    if (!Object.keys(input.updates).length) return; // nada que hacer
    await this.botConfigRepository.patch(
      input.botConfigId,
      input.clinicSource,
      input.clinicId,
      input.updates
    );
  }
}
