// packages/core/src/application/usecases/UpdatePatientMessageUseCase.ts

import { KommoService } from "@clinickeys-agents/core/application/services";
import { Logger } from "@clinickeys-agents/core/infrastructure/external";
import {
  PATIENT_MESSAGE,
  LAST_PATIENT_MESSAGE,
  PATIENT_MESSAGE_PROCESSED_CHUNK,
} from "@clinickeys-agents/core/utils";
import { KommoCustomFieldValueBase } from "@clinickeys-agents/core/infrastructure/integrations/kommo";
import type { BotConfigDTO } from "@clinickeys-agents/core/domain/botConfig";

export interface UpdatePatientMessageInput {
  botConfig: BotConfigDTO;
  leadId: number;
  normalizedLeadCF: (KommoCustomFieldValueBase & { value: any })[];
}

export interface UpdatePatientMessageOutput {
  success: boolean;
  newPatientMessage: string;
}

export class UpdatePatientMessageUseCase {
  constructor(private readonly kommoService: KommoService) {}

  private normalize(text: string): string {
    return (text || "").replace(/\s+/g, " ").trim();
  }

  public async execute(
    input: UpdatePatientMessageInput
  ): Promise<UpdatePatientMessageOutput> {
    const { botConfig, leadId, normalizedLeadCF } = input;

    try {
      Logger.info("[UpdatePatientMessageUseCase] Inicio", { leadId });

      const patientMessage =
        normalizedLeadCF.find((cf) => cf.field_name === PATIENT_MESSAGE)?.value ||
        "";
      const lastPatientMessage =
        normalizedLeadCF.find((cf) => cf.field_name === LAST_PATIENT_MESSAGE)
          ?.value || "";
      const patientMessageProcessedChunk =
        normalizedLeadCF.find(
          (cf) => cf.field_name === PATIENT_MESSAGE_PROCESSED_CHUNK
        )?.value || "";

      Logger.debug("[UpdatePatientMessageUseCase] Valores extraídos", {
        patientMessage,
        lastPatientMessage,
        patientMessageProcessedChunk,
      });

      // Normalizamos todo para evitar problemas con espacios, saltos de línea, etc.
      let newPatientMessage: string = `${this.normalize(patientMessage)} ${this.normalize(
        lastPatientMessage
      )}`.trim();

      if (patientMessageProcessedChunk) {
        const normalizedChunk = this.normalize(patientMessageProcessedChunk);
        const normalizedMsg = this.normalize(newPatientMessage);

        if (normalizedMsg.includes(normalizedChunk)) {
          newPatientMessage = normalizedMsg.replace(normalizedChunk, "").trim();
        } else {
          Logger.warn(
            "[UpdatePatientMessageUseCase] Chunk no encontrado exactamente para reemplazo",
            {
              normalizedChunk,
              normalizedMsg,
            }
          );
        }
      }

      Logger.debug(
        "[UpdatePatientMessageUseCase] Nuevo patientMessage calculado",
        {
          newPatientMessage,
        }
      );

      await this.kommoService.updateLeadCustomFields({
        botConfig,
        leadId,
        customFields: {
          [LAST_PATIENT_MESSAGE]: "",
          [PATIENT_MESSAGE]: newPatientMessage,
        },
      });

      Logger.info("[UpdatePatientMessageUseCase] Actualización completada", {
        leadId,
        newPatientMessage,
      });

      return { success: true, newPatientMessage };
    } catch (error) {
      Logger.error("[UpdatePatientMessageUseCase] Error ejecutando caso de uso", {
        leadId: input.leadId,
        error,
      });
      return { success: false, newPatientMessage: "" };
    }
  }
}
