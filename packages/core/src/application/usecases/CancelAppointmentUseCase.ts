import type { BotConfigDTO } from '@clinickeys-agents/core/domain/botConfig';
import { KommoService } from '@clinickeys-agents/core/application/services/KommoService';
import { AppointmentService } from '@clinickeys-agents/core/application/services/AppointmentService';
import { PackBonoService } from '@clinickeys-agents/core/application/services/PackBonoService';
import { Logger } from '@clinickeys-agents/core/infrastructure/external';
import {
  PATIENT_MESSAGE,
  REMINDER_MESSAGE,
  BOT_MESSAGE,
  THREAD_ID,
  PLEASE_WAIT_MESSAGE
} from '@clinickeys-agents/core/utils/constants';

export interface CancelAppointmentInput {
  botConfig: BotConfigDTO;
  leadId: number;
  mergedCustomFields: { id: string | number; name: string; value?: string }[];
  salesbotId: number;
  cancelParams: {
    id_cita: number;
    id_medico?: number;
    fecha_cita?: string;
    hora_inicio?: string;
    hora_fin?: string;
    id_espacio?: number;
  };
  threadId: string;
}

export interface CancelAppointmentOutput {
  success: boolean;
  appointmentId?: number;
}

export class CancelAppointmentUseCase {
  constructor(
    private readonly kommoService: KommoService,
    private readonly appointmentService: AppointmentService,
    private readonly packBonoService: PackBonoService
  ) {}

  public async execute(
    input: CancelAppointmentInput
  ): Promise<CancelAppointmentOutput> {
    const {
      botConfig,
      leadId,
      mergedCustomFields,
      salesbotId,
      cancelParams,
      threadId
    } = input;

    try {
      await this.appointmentService.cancelAppointment(cancelParams.id_cita);
      await this.packBonoService.procesarPackbonoPresupuestoDeCita(
        'on_eliminar_cita',
        cancelParams.id_cita
      );

      const confirmMessage = 'La cita fue cancelada con éxito.';
      const customFields: Record<string, string> = {
        [PATIENT_MESSAGE]: '',
        [REMINDER_MESSAGE]: '',
        [THREAD_ID]: threadId,
        [BOT_MESSAGE]: confirmMessage,
        [PLEASE_WAIT_MESSAGE]: 'false'
      };

      await this.kommoService.replyToLead({
        botConfig,
        leadId: Number(leadId),
        customFields,
        mergedCustomFields,
        salesbotId
      });

      return { success: true, appointmentId: cancelParams.id_cita };
    } catch (error) {
      Logger.error(
        `[CancelAppointmentUseCase] Error cancelando cita ${cancelParams.id_cita}:`,
        error
      );
      return { success: false };
    }
  }
}
