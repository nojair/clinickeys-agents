// packages/core/src/application/services/BotConfigService.ts

import {
  BotConfigDTO,
  BotConfigEnrichedDTO,
  BotConfigType,
  CreateChatBotConfigDTO,
  CreateNotificationBotConfigDTO,
  IBotConfigRepository,
} from "@clinickeys-agents/core/domain/botConfig";
import { defaultPlaceholders, mapKommoCustomFields } from "@clinickeys-agents/core/utils";
import { BotConfigEnricher } from "@clinickeys-agents/core/application/services";
import { UpdateBotConfigPayload } from "@clinickeys-agents/core/application/usecases";
import { KommoApiGateway } from "@clinickeys-agents/core/infrastructure/integrations/kommo";
import { KommoRepository } from "@clinickeys-agents/core/infrastructure/kommo";
import type { KommoCustomFieldExistence } from "@clinickeys-agents/core/application/services";
import type { KommoLeadCustomFieldDefinition } from "@clinickeys-agents/core/infrastructure/integrations/kommo/models";

export type CreateBotConfigInput =
  | (CreateChatBotConfigDTO & { botConfigId: string })
  | (CreateNotificationBotConfigDTO & { botConfigId: string });

interface PartialBaseDTO {
  isEnabled: boolean;
  botConfigId: string;
}

type PartialChatBotConfigDTO = Omit<CreateChatBotConfigDTO, "botConfigType"> &
  PartialBaseDTO & {
    botConfigType: BotConfigType.ChatBot;
    placeholders: Record<string, unknown>;
    openai: { apiKey: string };
  };

type PartialNotificationBotConfigDTO = Omit<
  CreateNotificationBotConfigDTO,
  "botConfigType"
> &
  PartialBaseDTO & {
    botConfigType: BotConfigType.NotificationBot;
  };

const CHAT_BOT_CUSTOM_FIELDS = [
  "threadId",
  "botMessage",
  "salesbotLog",
  "patientPhone",
  "patientMessage",
  "reminderMessage",
  "patientLastName",
  "patientFirstName",
  "pleaseWaitMessage",
  "triggeredByMachine",
];
const NOTIFICATION_BOT_CUSTOM_FIELDS = [
  "spaceName",
  "clinicName",
  "salesbotLog",
  "patientPhone",
  "treatmentName",
  "notificationId",
  "doctorFullName",
  "patientLastName",
  "reminderMessage",
  "appointmentDate",
  "patientFirstName",
  "appointmentEndTime",
  "triggeredByMachine",
  "appointmentStartTime",
  "appointmentWeekdayName",
];

export class BotConfigService {
  constructor(private readonly repo: IBotConfigRepository) {}

  async getEnrichedBotConfig(
    botConfigType: BotConfigType,
    botConfigId: string,
    clinicSource: string,
    clinicId: number
  ): Promise<BotConfigEnrichedDTO | null> {
    const dto = await this.repo.findByPrimaryKey(
      botConfigType,
      botConfigId,
      clinicSource,
      clinicId
    );
    if (!dto) return null;

    const hasKommoCreds = dto.kommo?.subdomain && dto.kommo?.longLivedToken;
    let kommoCustomFields: KommoCustomFieldExistence[] = [{ field_name: "", field_type: "", exists: false }];
    let requiredCustomFields: string[] = [];
    if (dto.botConfigType === BotConfigType.ChatBot) {
      requiredCustomFields = CHAT_BOT_CUSTOM_FIELDS;
    } else if (dto.botConfigType === BotConfigType.NotificationBot) {
      requiredCustomFields = NOTIFICATION_BOT_CUSTOM_FIELDS;
    }
    if (hasKommoCreds) {
      try {
        const gateway = new KommoApiGateway({
          longLivedToken: dto.kommo.longLivedToken,
          subdomain: dto.kommo.subdomain,
        });
        const kommoRepo = new KommoRepository(gateway);
        const allFields = (await kommoRepo.fetchCustomFields('leads')) as KommoLeadCustomFieldDefinition[];
        kommoCustomFields = mapKommoCustomFields(requiredCustomFields, allFields);
      } catch {
        kommoCustomFields = requiredCustomFields.map(name => ({
          field_name: name,
          field_type: "",
          exists: false,
        }));
      }
    }
    return BotConfigEnricher.enrich(dto, kommoCustomFields);
  }

  async getBotConfig(
    botConfigType: BotConfigType,
    botConfigId: string,
    clinicSource: string,
    clinicId: number
  ): Promise<BotConfigDTO | null> {
    return this.repo.findByPrimaryKey(
      botConfigType,
      botConfigId,
      clinicSource,
      clinicId
    );
  }

  async createChatBotConfig(
    input: CreateChatBotConfigDTO & { botConfigId: string }
  ): Promise<BotConfigDTO> {
    const placeholders: Record<string, unknown> = {
      ...defaultPlaceholders,
      ...(input.placeholders ?? {}),
    };

    const toSave: PartialChatBotConfigDTO = {
      ...input,
      botConfigType: BotConfigType.ChatBot,
      placeholders,
      openai: { apiKey: input.openai.apiKey },
      isEnabled: input.isEnabled ?? true,
      botConfigId: input.botConfigId,
    };

    return this.repo.create(toSave);
  }

  async createNotificationBotConfig(
    input: CreateNotificationBotConfigDTO & { botConfigId: string }
  ): Promise<BotConfigDTO> {
    const toSave: PartialNotificationBotConfigDTO = {
      ...input,
      botConfigType: BotConfigType.NotificationBot,
      isEnabled: input.isEnabled ?? true,
      botConfigId: input.botConfigId,
    };

    return this.repo.create(toSave);
  }

  async listEnrichedByClinic(
    clinicSource: string,
    clinicId: number,
    limit = 50,
    cursor?: string
  ): Promise<{ items: BotConfigEnrichedDTO[]; nextCursor?: string }> {
    const { items, nextCursor } = await this.repo.listByClinic(
      clinicSource,
      clinicId,
      limit,
      cursor
    );
    const enrichedItems = await Promise.all(
      items.map(async dto => {
        const hasKommoCreds = dto.kommo?.subdomain && dto.kommo?.longLivedToken;
        let kommoCustomFields: KommoCustomFieldExistence[] = [{ field_name: "", field_type: "", exists: false }];
        let requiredCustomFields: string[] = [];
        if (dto.botConfigType === BotConfigType.ChatBot) {
          requiredCustomFields = CHAT_BOT_CUSTOM_FIELDS;
        } else if (dto.botConfigType === BotConfigType.NotificationBot) {
          requiredCustomFields = NOTIFICATION_BOT_CUSTOM_FIELDS;
        }
        if (hasKommoCreds) {
          try {
            const gateway = new KommoApiGateway({
              longLivedToken: dto.kommo.longLivedToken,
              subdomain: dto.kommo.subdomain,
            });
            const kommoRepo = new KommoRepository(gateway);
            const allFields = (await kommoRepo.fetchCustomFields('leads')) as KommoLeadCustomFieldDefinition[];
            kommoCustomFields = mapKommoCustomFields(requiredCustomFields, allFields);
          } catch {
            kommoCustomFields = requiredCustomFields.map(name => ({
              field_name: name,
              field_type: "",
              exists: false,
            }));
          }
        }
        return BotConfigEnricher.enrich(dto, kommoCustomFields);
      })
    );
    return { items: enrichedItems, nextCursor };
  }

  async patchBotConfig(
    botConfigType: BotConfigType,
    botConfigId: string,
    clinicSource: string,
    clinicId: number,
    updates: UpdateBotConfigPayload
  ): Promise<void> {
    await this.repo.patch(
      botConfigType,
      botConfigId,
      clinicSource,
      clinicId,
      updates
    );
  }

  async deleteBotConfig(
    botConfigType: BotConfigType,
    botConfigId: string,
    clinicSource: string,
    clinicId: number
  ): Promise<void> {
    await this.repo.delete(
      botConfigType,
      botConfigId,
      clinicSource,
      clinicId
    );
  }

  async listGlobal(
    limit = 100,
    cursor?: string
  ): Promise<{ items: BotConfigEnrichedDTO[]; nextCursor?: string }> {
    const { items, nextCursor } = await this.repo.listGlobal(limit, cursor);
    const enrichedItems = await Promise.all(
      items.map(async dto => {
        const hasKommoCreds = dto.kommo?.subdomain && dto.kommo?.longLivedToken;
        let kommoCustomFields: KommoCustomFieldExistence[] = [{ field_name: "", field_type: "", exists: false }];
        let requiredCustomFields: string[] = [];
        if (dto.botConfigType === BotConfigType.ChatBot) {
          requiredCustomFields = CHAT_BOT_CUSTOM_FIELDS;
        } else if (dto.botConfigType === BotConfigType.NotificationBot) {
          requiredCustomFields = NOTIFICATION_BOT_CUSTOM_FIELDS;
        }
        if (hasKommoCreds) {
          try {
            const gateway = new KommoApiGateway({
              longLivedToken: dto.kommo.longLivedToken,
              subdomain: dto.kommo.subdomain,
            });
            const kommoRepo = new KommoRepository(gateway);
            const allFields = (await kommoRepo.fetchCustomFields('leads')) as KommoLeadCustomFieldDefinition[];
            kommoCustomFields = mapKommoCustomFields(requiredCustomFields, allFields);
          } catch {
            kommoCustomFields = requiredCustomFields.map(name => ({
              field_name: name,
              field_type: "",
              exists: false,
            }));
          }
        }
        return BotConfigEnricher.enrich(dto, kommoCustomFields);
      })
    );
    return { items: enrichedItems, nextCursor };
  }
}
