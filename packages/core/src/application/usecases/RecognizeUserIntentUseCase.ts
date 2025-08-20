import { Logger } from '@clinickeys-agents/core/infrastructure/external';
import { BotConfigType } from '@clinickeys-agents/core/domain/botConfig';
import { IOpenAIService } from '@clinickeys-agents/core/domain/openai';
import { FetchPatientInfoUseCase } from './FetchPatientInfoUseCase';
import { AppError } from '@clinickeys-agents/core/utils';
import type { DateTime } from 'luxon';

type KnownIntent =
  | "conversación_regular"
  | "consulta_agendar"
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
  tiempoActualDT: DateTime;
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
  message: string;
  patient: PatientInfo['patient'];
  appointments: PatientInfo['appointments'];
  packsBonos: PatientInfo['packsBonos'];
  budgets: PatientInfo['budgets'];
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
      tiempoActualDT,
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

    const contextForAI: IntentContext = {
      message: userMessage,
      patient: patientInfo.patient,
      appointments: patientInfo.appointments ?? [],
      packsBonos: patientInfo.packsBonos ?? [],
      budgets: patientInfo.budgets ?? []
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
