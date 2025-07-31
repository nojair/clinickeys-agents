import { BotConfigService } from '@clinickeys-agents/core/application/services/BotConfigService';
import { BotConfigType } from '@clinickeys-agents/core/domain/botConfig';
import { AppError } from '@clinickeys-agents/core/utils';

export interface FetchBotConfigInput {
  botConfigType: BotConfigType;
  botConfigId: string;
  clinicSource: string;
  clinicId: number;
}

export interface FetchBotConfigOutput {
  botConfig: any;
}

export class FetchBotConfigUseCase {
  private botConfigService: BotConfigService;

  constructor(botConfigService: BotConfigService) {
    this.botConfigService = botConfigService;
  }

  async execute(input: FetchBotConfigInput): Promise<FetchBotConfigOutput> {
    const { botConfigType, botConfigId, clinicSource, clinicId } = input;
    const botConfig = await this.botConfigService.getBotConfig(botConfigType, botConfigId, clinicSource, Number(clinicId));
    if (!botConfig) {
      throw new AppError({
        code: 'ERR_BOTCONFIG_NOT_FOUND',
        humanMessage: `Bot config not found for botConfigId: ${botConfigId}, clinicSource: ${clinicSource}, clinicId: ${clinicId}`,
        context: { botConfigId, clinicSource, clinicId }
      });
    }
    return { botConfig };
  }
}
