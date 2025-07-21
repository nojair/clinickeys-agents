// packages/core/src/application/usecases/AddBotConfigUseCase.ts

import { BotConfigDTO } from "@clinickeys-agents/core/domain/botConfig/dtos";
import { BotConfigRepositoryDynamo } from "@clinickeys-agents/core/infrastructure/botConfig";

/**
 * Campos necesarios para crear un BotConfig.
 * Los atributos calculados por el repositorio (pk, sk, bucket, createdAt, updatedAt)
 * se omiten del input.
 */
export type AddBotConfigInput = Omit<
  BotConfigDTO,
  "pk" | "sk" | "bucket" | "createdAt" | "updatedAt"
>;

export interface AddBotConfigUseCaseProps {
  botConfigRepository: BotConfigRepositoryDynamo;
}

/**
 * Caso de uso: alta de BotConfig.
 */
export class AddBotConfigUseCase {
  private readonly repo: BotConfigRepositoryDynamo;

  constructor(props: AddBotConfigUseCaseProps) {
    this.repo = props.botConfigRepository;
  }

  async execute(input: AddBotConfigInput): Promise<void> {
    await this.repo.create(input);
  }
}
