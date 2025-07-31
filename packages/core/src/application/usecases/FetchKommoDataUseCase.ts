import { KommoContactResponse } from '@clinickeys-agents/core/infrastructure/integrations/kommo';
import { KommoService } from '@clinickeys-agents/core/application/services';
import { BotConfigType } from '@clinickeys-agents/core/domain/botConfig';
import { FetchBotConfigUseCase } from './FetchBotConfigUseCase';
import { AppError } from '@clinickeys-agents/core/utils';

export interface FetchKommoDataInput {
  botConfigType: BotConfigType;
  botConfigId: string;
  clinicSource: string;
  clinicId: number;
  leadId: number;
}

export interface FetchKommoDataOutput {
  botConfig: any;
  leadData: any;
  contactId: number;
  contactData: KommoContactResponse;
  customFields: any;
}

export class FetchKommoDataUseCase {
  private fetchBotConfigUseCase: FetchBotConfigUseCase;
  private kommoService: KommoService;

  constructor(
    fetchBotConfigUseCase: FetchBotConfigUseCase,
    kommoService: KommoService
  ) {
    this.fetchBotConfigUseCase = fetchBotConfigUseCase;
    this.kommoService = kommoService;
  }

  async execute(input: FetchKommoDataInput): Promise<FetchKommoDataOutput> {
    const { botConfigType, botConfigId, clinicSource, clinicId, leadId } = input;
    // 1. Obtener la configuración del bot
    const { botConfig } = await this.fetchBotConfigUseCase.execute({
      botConfigType,
      botConfigId,
      clinicSource,
      clinicId
    });

    if (!botConfig) {
      throw new AppError({
        code: 'ERR_BOTCONFIG_NOT_FOUND',
        humanMessage: `Bot config not found for botConfigId: ${botConfigId}, clinicSource: ${clinicSource}, clinicId: ${clinicId}`,
        context: { botConfigId, clinicSource, clinicId }
      });
    }

    // 2. Traer datos del lead desde Kommo
    const leadData = await this.kommoService.getLeadById(leadId);
    const contacts = leadData?._embedded?.contacts || [];
    if (!contacts?.length) {
      throw new AppError({
        code: 'ERR_LEAD_NO_CONTACTS',
        humanMessage: 'Lead has no contacts',
        context: { leadId, leadData }
      });
    }
    const contactId = Number(contacts[0].id);
    const contactData = await this.kommoService.getContactById(contactId);
    if (!contactData) {
      throw new AppError({
        code: 'ERR_NO_CONTACT_DATA',
        humanMessage: 'Contact has no data',
        context: { contactId, contactData }
      });
    }
    const customFields = leadData?.custom_fields_values || [];

    return {
      botConfig,
      leadData,
      contactId,
      contactData,
      customFields
    };
  }
}
