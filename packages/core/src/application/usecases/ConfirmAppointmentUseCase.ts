import { AppointmentService } from '@clinickeys-agents/core/application/services';
import { Logger } from '@clinickeys-agents/core/infrastructure/external';

interface ConfirmAppointmentInput {
  leadId: number;
  params: {
    id_cita: number;
    summary: string;
  };
}

interface ConfirmAppointmentOutput {
  success: boolean;
  toolOutput: string;
}

export class ConfirmAppointmentUseCase {
  constructor(
    private readonly appointmentService: AppointmentService,
  ) {}

  public async execute(input: ConfirmAppointmentInput): Promise<ConfirmAppointmentOutput> {
    const { leadId, params } = input;
    const { id_cita, summary } = params;

    Logger.info('[ConfirmAppointment] Inicio', { leadId, id_cita });

    // 2. Validación mínima
    if (!id_cita) {
      Logger.warn('[ConfirmAppointment] id_cita no proporcionado');
      return {
        success: false,
        toolOutput: '#confirmarCita\nLo siento, no pude identificar la cita que deseas confirmar. ¿Podrías volver a indicarme?'
      };
    }

    // 3. Confirmar cita en BD
    Logger.debug('[ConfirmAppointment] Confirmando cita en base de datos', { id_cita });
    await this.appointmentService.confirmAppointment(id_cita, summary);

    // 4. Construir toolOutput
    const toolOutput = `#confirmarCita\nLa cita fue confirmada con éxito: ${JSON.stringify({ id_cita })}`;
    Logger.info('[ConfirmAppointment] Ejecución completada con éxito', { id_cita });

    return { success: true, toolOutput };
  }
}
