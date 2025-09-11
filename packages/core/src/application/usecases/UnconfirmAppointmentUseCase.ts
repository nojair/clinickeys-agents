// packages/core/src/application/usecases/UnconfirmAppointmentUseCase.ts

import { AppointmentService } from '@clinickeys-agents/core/application/services';
import { Logger } from '@clinickeys-agents/core/infrastructure/external';

interface UnconfirmAppointmentInput {
  leadId: number;
  params: {
    id_cita: number;
    summary: string;
  };
}

interface UnconfirmAppointmentOutput {
  success: boolean;
  toolOutput: string;
}

export class UnconfirmAppointmentUseCase {
  constructor(
    private readonly appointmentService: AppointmentService,
  ) {}

  public async execute(input: UnconfirmAppointmentInput): Promise<UnconfirmAppointmentOutput> {
    const { leadId, params } = input;
    const { id_cita, summary } = params;

    Logger.info('[UnconfirmAppointment] Inicio', { leadId, id_cita });

    // 1. Validación mínima
    if (!id_cita) {
      Logger.warn('[UnconfirmAppointment] id_cita no proporcionado');
      return {
        success: false,
        toolOutput: '#desconfirmarCita\nLo siento, no pude identificar la cita que deseas desconfirmar. ¿Podrías volver a indicarme?'
      };
    }

    // 2. Revertir confirmación de la cita en BD
    Logger.debug('[UnconfirmAppointment] Revirtiendo confirmación de cita en base de datos', { id_cita });
    await this.appointmentService.unconfirmAppointment(id_cita, summary);

    // 3. Construir toolOutput
    const toolOutput = `#desconfirmarCita\nLa confirmación de la cita fue revertida con éxito: ${JSON.stringify({ id_cita })}`;
    Logger.info('[UnconfirmAppointment] Ejecución completada con éxito', { id_cita });

    return { success: true, toolOutput };
  }
}
