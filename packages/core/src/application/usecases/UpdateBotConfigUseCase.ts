// packages/core/src/application/usecases/UpdateBotConfigUseCase.ts

import { BotConfigDTO } from "@clinickeys-agents/core/domain/botConfig";
import { BotConfigRepositoryDynamo } from "@clinickeys-agents/core/infrastructure/botConfig";

// Campos que se permiten actualizar vía PATCH
export type UpdateBotConfigPayload = Partial<Pick<
  BotConfigDTO,
  | "isActive"
  | "description"
  | "name"
  | "timezone"
  | "default_country"
  | "kommoSalesbotId"
  | "crm_api_key"
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
  botConfigRepository: BotConfigRepositoryDynamo;
}

export class UpdateBotConfigUseCase {
  private readonly repo: BotConfigRepositoryDynamo;

  constructor(props: UpdateBotConfigUseCaseProps) {
    this.repo = props.botConfigRepository;
  }

  async execute(input: UpdateBotConfigInput): Promise<void> {
    if (!Object.keys(input.updates).length) return; // nada que hacer
    await this.repo.patch(
      input.botConfigId,
      input.clinicSource,
      input.clinicId,
      input.updates
    );
  }
}
