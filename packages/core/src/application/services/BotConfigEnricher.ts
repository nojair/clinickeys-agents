// packages/core/src/application/services/BotConfigEnricher.ts

import { BotConfigDTO, BotConfigEnrichedDTO } from "@clinickeys-agents/core/domain/botConfig";
import { KommoApiGateway } from "@clinickeys-agents/core/infrastructure/integrations/kommo";
import { KommoService } from "@clinickeys-agents/core/application/services";
import { profiles } from "@clinickeys-agents/core/utils/constants";

/**
 * Service para enriquecer un BotConfigDTO con los campos de Kommo y el estado de preparación.
 */
export class BotConfigEnricher {
  /**
   * Enriquecer un solo DTO de BotConfig con info de campos custom y estado ready.
   */
  static async enrich(dto: BotConfigDTO): Promise<BotConfigEnrichedDTO> {
    // 1. Tomar el perfil configurado, si no existe usar "default_kommo_profile"
    const profileKey =
      (dto.fields_profile as keyof typeof profiles) || "default_kommo_profile";
    const config = profiles[profileKey]?.lead?.custom_field_config || [];
    const fieldNames = config.map((c) => c.field_name);

    // 2. Instanciar el gateway y service con credenciales del bot
    const gateway = new KommoApiGateway({
      apiKey: dto.crm_api_key,
      subdomain: dto.crm_subdomain || ""
    });
    const kommoService = new KommoService(gateway); // Pool no es necesario aquí

    // 3. Llamar al método del service para obtener los custom fields
    const kommo_leads_custom_fields =
      await kommoService.getKommoLeadsCustomFields(fieldNames);

    // 4. Determinar si la configuración está lista
    const requiredProps = [
      "id_clinica",
      "name",
      "crm_subdomain",
      "timezone",
      "default_country",
      "kommo_salesbot_id",
      "crm_api_key",
      "fields_profile",
    ];

    const hasAll = requiredProps.every(
      (prop) =>
        (dto as any)[prop] !== undefined &&
        (dto as any)[prop] !== null &&
        (dto as any)[prop] !== ""
    );

    const is_ready =
      hasAll && kommo_leads_custom_fields.every((f) => f.exists);

    // 5. Retornar DTO enriquecido
    return {
      ...dto,
      kommo_leads_custom_fields,
      is_ready,
    };
  }

  /**
   * Enriquecer una lista de BotConfigDTOs en paralelo.
   */
  static async enrichMany(
    dtos: BotConfigDTO[]
  ): Promise<BotConfigEnrichedDTO[]> {
    return Promise.all(dtos.map(BotConfigEnricher.enrich));
  }
}
