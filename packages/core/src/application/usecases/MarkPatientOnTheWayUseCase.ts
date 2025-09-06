import { KommoCustomFieldValueBase } from '@clinickeys-agents/core/infrastructure/integrations/kommo';
import { Logger } from '@clinickeys-agents/core/infrastructure/external';

import { KommoService, AppointmentService } from '@clinickeys-agents/core/application/services';

interface MarkOnTheWayInput {
  botConfig: any;
  leadId: number;
  normalizedLeadCF: (KommoCustomFieldValueBase & { value: any })[];
  params: {
    id_cita: number;
    summary: string; // Comentario opcional proveniente del LLM/extractor
  };
}

interface MarkOnTheWayOutput {
  success: boolean;
  toolOutput: string;
}

// Estado "en camino" (columna: id_estados_cita_in)
const ID_ESTADOS_CITA_IN_EN_CAMINO = 10;

/**
 * Marca que el paciente va "en camino" para una cita existente, seteando id_estados_cita_in = 10
 * y registrando un comentario breve en la cita.
 */
export class MarkPatientOnTheWayUseCase {
  constructor(
    private readonly kommoService: KommoService,
    private readonly appointmentService: AppointmentService,
  ) {}

  public async execute(input: MarkOnTheWayInput): Promise<MarkOnTheWayOutput> {
    const { botConfig, leadId, normalizedLeadCF, params } = input;
    const { id_cita, summary } = params;

    Logger.info('[MarkPatientOnTheWay] Inicio', { leadId, id_cita });

    // 1) Mensaje inicial (UX conversacional)
    await this.kommoService.sendBotInitialMessage({
      leadId,
      normalizedLeadCF,
      salesbotId: botConfig.kommo?.salesbotId,
      message: '¡Perfecto! Avisaré al equipo que estás en camino. Un momento por favor.',
    });

    await this.appointmentService.updateAppointment({
      id_cita,
      id_estados_cita_in: ID_ESTADOS_CITA_IN_EN_CAMINO,
      comentarios_cita: summary,
    } as any); // as any: si tu tipo no expone aún id_estados_cita_in, extiéndelo en AppointmentService

    Logger.info('[MarkPatientOnTheWay] Estado actualizado a EN_CAMINO', { id_cita });

    // 3) toolOutput para el bot/consumidor
    const toolOutput = `#pacienteEnCamino\nTu cita sigue programada. Hemos notificado al equipo que vas en camino. (id_cita: ${id_cita}).`;

    return { success: true, toolOutput };
  }
}
