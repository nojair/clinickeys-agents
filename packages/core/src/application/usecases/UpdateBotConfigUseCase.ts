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
  | "kommo_salesbot_id"
  | "crm_api_key"
  | "crm_subdomain"
  | "crm_type"
>>;

export interface UpdateBotConfigInput {
  bot_config_id: string;
  clinic_source: string;
  clinic_id: number;
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
      input.bot_config_id,
      input.clinic_source,
      input.clinic_id,
      input.updates
    );
  }
}
