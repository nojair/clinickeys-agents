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

export class CancelAppointmentUseCase {
  constructor(
    private readonly kommoService: KommoService,
    private readonly appointmentService: AppointmentService,
    private readonly packBonoService: PackBonoService,
  ) {}

  public async execute(input: CancelAppointmentInput): Promise<CancelAppointmentOutput> {
    const { botConfig, leadId, mergedCustomFields, salesbotId, params } = input;
    const { id_cita } = params;

    // 1. Mensaje inicial "please‑wait"
    await this.kommoService.sendBotInitialMessage({
      leadId,
      botConfig,
      salesbotId,
      mergedCustomFields,
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
