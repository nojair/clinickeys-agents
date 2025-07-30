import { Logger } from '@clinickeys-agents/core/infrastructure/external';
import {
  KommoService,
  AppointmentService,
  PackBonoService,
} from '@clinickeys-agents/core/application/services';

interface CancelAppointmentInput {
  botConfig: any;
  leadId: number;
  mergedCustomFields: { id: string | number; name: string; value?: string }[];
  salesbotId: number;
  params: {
    id_cita: number;
    id_medico?: number | null;
    id_espacio?: number | null;
    fecha_cita?: string;
    hora_inicio?: string;
    hora_fin?: string;
  };
}

interface CancelAppointmentOutput {
  success: boolean;
  toolOutput: string;
}

const ID_ESTADO_CITA_CANCELADA = 2;

export class CancelAppointmentUseCase {
  constructor(
    private readonly kommoService: KommoService,
    private readonly appointmentService: AppointmentService,
    private readonly packBonoService: PackBonoService,
  ) {}

  public async execute(input: CancelAppointmentInput): Promise<CancelAppointmentOutput> {
    const { botConfig, leadId, mergedCustomFields, salesbotId, params } = input;
    const { id_cita, id_medico, id_espacio, fecha_cita, hora_inicio, hora_fin } = params;

    // 1. Mensaje inicial "please‑wait"
    await this.kommoService.sendBotInitialMessage({
      botConfig,
      leadId,
      mergedCustomFields,
      salesbotId,
      message: 'Muy bien, voy a cancelar tu cita. Un momento por favor.',
    });

    // 2. Validación mínima
    if (!id_cita) {
      return {
        success: false,
        toolOutput: '#cancelarCita\nLo siento, no pude identificar la cita que deseas cancelar. ¿Podrías volver a indicarme?'
      };
    }

    // 3. Cancelar cita en BD
    await this.appointmentService.cancelAppointment(id_cita);

    // 4. Procesar packs‑bono / presupuestos
    await this.packBonoService.procesarPackbonoPresupuestoDeCita('on_eliminar_cita', id_cita);

    // 5. Construir toolOutput
    const toolOutput = `#cancelarCita\nLa cita fue cancelada con éxito: ${JSON.stringify({ id_cita })}`;

    return { success: true, toolOutput };
  }
}
