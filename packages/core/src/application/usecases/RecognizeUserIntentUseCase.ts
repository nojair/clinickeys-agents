import { Logger } from '@clinickeys-agents/core/infrastructure/external';
import { BotConfigType } from '@clinickeys-agents/core/domain/botConfig';
import { IOpenAIService } from '@clinickeys-agents/core/domain/openai';
import { FetchPatientInfoUseCase } from './FetchPatientInfoUseCase';
import { AppError } from '@clinickeys-agents/core/utils';
import type { DateTime } from 'luxon';

type KnownIntent =
  | "conversación_regular"
  | "consulta_agendar"
  | "confirmar_cita"
  | "paciente_en_camino"
  | "agendar_cita"
  | "consulta_reprogramar"
  | "reprogramar_cita"
  | "cancelar_cita"
  | "tarea";

export interface RecognizeUserIntentInput {
  botConfigType: BotConfigType;
  botConfigId: string;
  clinicSource: string;
  clinicId: number;
  leadId: number;
  timezone: string;
  tiempoActualDT: DateTime;
  reminderMessage: string;
  userMessage: string;
  openAIService: IOpenAIService;
  speakingBotId: string;
  threadId?: string | null;
}

export interface RecognizeUserIntentOutput {
  intent: KnownIntent;
  params: Record<string, unknown>;
  patientInfo: PatientInfo;
  assistantResult: {
    threadId: string;
    runId: string;
    message?: string;
    functionCalls?: Array<{
      tool_call_id: string;
      name: string;
      arguments: Record<string, unknown>;
    }>;
  };
}

type PatientInfo = Awaited<ReturnType<FetchPatientInfoUseCase['execute']>>;

type IntentContext = {
  MENSAJE: string;
  TIEMPO_ACTUAL: string;
  DATOS_DEL_PACIENTE: PatientInfo['patient'];
  CITAS_PROGRAMADAS_DEL_PACIENTE: PatientInfo['appointments'];
  RESUMEN_PACK_BONOS_DEL_PACIENTE: PatientInfo['packsBonos'];
  RESUMEN_PRESUPUESTOS_DEL_PACIENTE: PatientInfo['budgets'];
};

export class RecognizeUserIntentUseCase {
  private fetchPatientInfoUseCase: FetchPatientInfoUseCase;

  constructor(fetchPatientInfoUseCase: FetchPatientInfoUseCase) {
    this.fetchPatientInfoUseCase = fetchPatientInfoUseCase;
  }

  async execute(input: RecognizeUserIntentInput): Promise<RecognizeUserIntentOutput> {
    const {
      botConfigType,
      botConfigId,
      clinicSource,
      clinicId,
      leadId,
      timezone,
      tiempoActualDT,
      reminderMessage,
      userMessage,
      openAIService,
      speakingBotId,
      threadId
    } = input;

    Logger.info('[RecognizeUserIntent] Inicio', { leadId, userMessage, speakingBotId, threadId });

    Logger.debug('[RecognizeUserIntent] Obteniendo información del paciente');
    const patientInfo = await this.fetchPatientInfoUseCase.execute({
      botConfigType,
      botConfigId,
      clinicSource,
      clinicId,
      leadId,
      tiempoActualDT
    });
    Logger.debug('[RecognizeUserIntent] Información del paciente obtenida', { hasPatient: !!patientInfo.patient });

    let MENSAJE = '';
    if (reminderMessage && Array.isArray(patientInfo.appointments) && patientInfo.appointments?.length) {
      MENSAJE = `MENSAJE_RECORDATORIO_CITA: ${reminderMessage}. RESPUESTA_AL_MENSAJE_RECORDATORIO_CITA del paciente: ${userMessage}`;
    } else {
      MENSAJE = (userMessage || "").trim();
    }

    const LANGUAGE = 'es';
    const weekDay = new Intl.DateTimeFormat(LANGUAGE, {
      weekday: 'long',
      timeZone: timezone,
    }).format(tiempoActualDT.toJSDate());
    const fechaISO = tiempoActualDT.toISODate() + "T00:00:00.000Z";
    const hora = tiempoActualDT.toFormat("HH:mm") + ":00";

    const contextForAI: IntentContext = {
      MENSAJE,
      TIEMPO_ACTUAL: `Hoy es ${weekDay}, fecha ${fechaISO} y hora ${hora}`,
      DATOS_DEL_PACIENTE: patientInfo.patient,
      CITAS_PROGRAMADAS_DEL_PACIENTE: patientInfo.appointments ?? [],
      RESUMEN_PACK_BONOS_DEL_PACIENTE: patientInfo.packsBonos ?? [],
      RESUMEN_PRESUPUESTOS_DEL_PACIENTE: patientInfo.budgets ?? []
    };

    Logger.debug('[RecognizeUserIntent] Contexto para AI generado', { contextSample: { ...contextForAI } });

    let assistantResult: RecognizeUserIntentOutput['assistantResult'];
    try {
      Logger.debug('[RecognizeUserIntent] Solicitando respuesta al asistente', { speakingBotId });
      const resp = await openAIService.getResponseFromAssistant(
        speakingBotId,
        JSON.stringify(contextForAI),
        threadId || undefined
      );

      assistantResult = {
        threadId: resp.threadId,
        runId: resp.runId,
        message: resp.message,
        functionCalls: resp.functionCalls
      };
      Logger.debug('[RecognizeUserIntent] Respuesta recibida del asistente', { assistantResult });
    } catch (error) {
      Logger.error("RecognizeUserIntentUseCase: error llamando a getResponseFromAssistant", {
        error,
        speakingBotId,
        clinicId,
        leadId
      });
      throw new AppError({
        code: 'ERR_OPENAI_INTENT',
        humanMessage: 'Ocurrió un problema al analizar la intención. Inténtalo nuevamente.',
        context: { error, speakingBotId, clinicId, leadId }
      });
    }

    const firstCall = assistantResult.functionCalls && assistantResult.functionCalls[0];
    let intent = firstCall?.name?.trim() as KnownIntent | undefined;

    if (!intent) {
      Logger.warn("RecognizeUserIntentUseCase: intención no detectada", {
        assistantResult,
        userMessage
      });
      intent = "conversación_regular";
    }

    const params: Record<string, unknown> = firstCall?.arguments ?? {};
    Logger.info('[RecognizeUserIntent] Intención final detectada', { intent, params });

    return {
      intent,
      params,
      assistantResult,
      patientInfo
    };
  }
}
