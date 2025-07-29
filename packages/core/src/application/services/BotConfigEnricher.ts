// packages/core/src/application/services/BotConfigEnricher.ts

import { BotConfigDTO, BotConfigEnrichedDTO } from "@clinickeys-agents/core/domain/botConfig";
import { KommoApiGateway } from "@clinickeys-agents/core/infrastructure/integrations/kommo";
import { KommoRepository } from "@clinickeys-agents/core/infrastructure/kommo";
import { KommoService } from "@clinickeys-agents/core/application/services";
import { profiles } from "@clinickeys-agents/core/utils";

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
      (dto.fieldsProfile as keyof typeof profiles) || "default_kommo_profile";
    const config = profiles[profileKey]?.lead?.custom_field_config || [];
    const fieldNames = config.map((c) => c.field_name);

    // 2. Instanciar el gateway y service con credenciales del bot
    const gateway = new KommoApiGateway({
      apiKey: dto.crmApiKey,
      subdomain: dto.crmSubdomain || ""
    });
    const repository = new KommoRepository(gateway)
    // El KommoService ahora requiere el patientRepository, pero para obtener campos custom solo usa el gateway
    // Así que se pasa undefined o puedes sobrecargar el constructor en KommoService si lo necesitas.
    const kommoService = new KommoService(repository, undefined as any);

    // 3. Llamar al método del service para obtener los custom fields
    const kommo_leads_custom_fields =
      await kommoService.getKommoLeadsCustomFields(fieldNames);

    // 4. Determinar si la configuración está lista
    const requiredProps = [
      "name",
      "timezone",
      "clinicId",
      "crmApiKey",
      "crmSubdomain",
      "fieldsProfile",
      "default_country",
      "kommoSalesbotId",
    ];

    const hasAll = requiredProps.every((prop) =>
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
