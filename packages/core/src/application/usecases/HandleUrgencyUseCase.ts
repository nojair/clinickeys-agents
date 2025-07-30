import { KommoService } from '@clinickeys-agents/core/application/services';

/**
 * Número de minutos (48 h) que tendrá el usuario interno para resolver la tarea
 * creada en Kommo cuando se detecta un caso de urgencia / escalamiento.
 */
const TASK_DEADLINE_MINUTES = 48 * 60;

export interface HandleUrgencyInput {
  /**
   * Configuración completa del bot (tokens, subdominio, etc.).
   * Se reenvía al KommoService para publicar mensajes y crear tareas.
   */
  botConfig: any;

  /** Id del lead que originó el webhook */
  leadId: number;

  /**
   * Custom‑fields ya mergeados (lead + catálogo) para enviar de vuelta a Kommo
   * cuando corresponda.
   */
  mergedCustomFields: { id: string | number; name: string; value?: string }[];

  /** Id del sales‑bot que ejecutará el parche de campos */
  salesbotId: number;

  /**
   * Parámetros que llegan desde el RecognizeUserIntentUseCase.
   */
  params: {
    /** Tipo de evento: "urgencia" | "escalamiento" | "tarea" */
    tipo: 'urgencia' | 'escalamiento' | 'tarea';

    /** Mensaje original del usuario */
    mensaje_usuario: string;

    /** Datos opcionales del paciente para adjuntar al cuerpo de la tarea */
    nombre?: string;
    apellido?: string;
    telefono?: string;
    motivo?: string;
    canal_preferido?: string;
  };
}

export interface HandleUrgencyOutput {
  /** Marca si la operación interna se completó sin excepciones */
  success: boolean;
  /** Cadena que se enviará como toolOutput al Assistant Parlante */
  toolOutput: string;
}

/**
 * Gestiona intents de **urgencia / escalamiento / creación de tarea**.
 * 1. Envía un mensaje de "espere un momento" al paciente.
 * 2. Crea una *Task* en Kommo con deadline de 48 h.
 * 3. Devuelve el *toolOutput* para que el Bot Parlante cierre el run.
 *
 * No realiza operaciones sobre la base de datos de la clínica.
 */
export class HandleUrgencyUseCase {
  constructor(private readonly kommoService: KommoService) {}

  public async execute(input: HandleUrgencyInput): Promise<HandleUrgencyOutput> {
    const { botConfig, leadId, mergedCustomFields, salesbotId, params } = input;
    const { tipo, mensaje_usuario, nombre, apellido, telefono, motivo, canal_preferido } = params;

    // 1) Mensaje "please‑wait" al paciente
    await this.kommoService.sendBotInitialMessage({
      botConfig,
      leadId,
      mergedCustomFields,
      salesbotId,
      message: 'Entendido, derivando tu caso al equipo correspondiente. Un momento…',
    });

    // 2) Construir el cuerpo de la tarea para Kommo.
    const taskMessageLines = [
      nombre && `*nombre*: ${nombre}`,
      apellido && `*apellido*: ${apellido}`,
      telefono && `*telefono*: ${telefono}`,
      motivo && `*motivo*: ${motivo}`,
      canal_preferido && `*canal preferido*: ${canal_preferido}`,
    ].filter(Boolean);

    // 3) Crear la tarea en Kommo (ignorar errores, la UX al paciente no cambia)
    try {
      const LOVE_RESPONSIBLE_USER_ID = 12164323;
      await this.kommoService.createTask({
        responsibleUserId: LOVE_RESPONSIBLE_USER_ID,
        leadId,
        minutesSinceNow: TASK_DEADLINE_MINUTES,
        message: taskMessageLines.join('\n'),
      });
    } catch (error) {
      // Loggear pero continuar: la cancelación de la tarea no debe bloquear la conversación.
      // En producción se debería usar un logger inyectado.
      // eslint-disable-next-line no-console
      console.error('[HandleUrgencyUseCase] Error al crear la tarea en Kommo:', error);
    }

    // 4) toolOutput para el Bot Parlante
    const toolOutput = `#${tipo}\nMENSAJE_USUARIO: ${mensaje_usuario}`;

    return { success: true, toolOutput };
  }
}
