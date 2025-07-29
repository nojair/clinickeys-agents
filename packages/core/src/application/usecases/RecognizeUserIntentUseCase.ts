// packages/core/src/application/usecases/RecognizeUserIntentUseCase.ts

import { FetchPatientInfoUseCase } from './FetchPatientInfoUseCase';
import { AppError } from '@clinickeys-agents/core/utils';

export interface RecognizeUserIntentInput {
  botConfigId: string;
  clinicSource: string;
  clinicId: string;
  leadId: number;
  tiempoActualDT: any;
  userMessage: string;
  assistantService: any;
}

export interface RecognizeUserIntentOutput {
  intent: string;
  params: Record<string, any>;
  assistantResult: any;
}

export class RecognizeUserIntentUseCase {
  private fetchPatientInfoUseCase: FetchPatientInfoUseCase;

  constructor(fetchPatientInfoUseCase: FetchPatientInfoUseCase) {
    this.fetchPatientInfoUseCase = fetchPatientInfoUseCase;
  }

  async execute(input: RecognizeUserIntentInput): Promise<RecognizeUserIntentOutput> {
    const { botConfigId, clinicSource, clinicId, leadId, tiempoActualDT, userMessage, assistantService } = input;

    // 1. Obtener contexto paciente y clínica
    const patientInfo = await this.fetchPatientInfoUseCase.execute({
      botConfigId,
      clinicSource,
      clinicId,
      leadId,
      tiempoActualDT
    });

    // 2. Preparar el contexto para el asistente conversacional (OpenAI u otro)
    const contextForAI = {
      message: userMessage,
      patient: patientInfo.patient,
      appointments: patientInfo.appointments,
      packsBonos: patientInfo.packsBonos,
      budgets: patientInfo.budgets
    };

    // 3. Llamar al assistantService para analizar la intención
    const assistantResult = await assistantService.recognizeIntent(contextForAI);
    if (!assistantResult || !assistantResult.intent) {
      throw new AppError({
        code: 'ERR_INTENT_NOT_RECOGNIZED',
        humanMessage: 'No se pudo reconocer la intención del usuario.',
        context: { assistantResult }
      });
    }

    return {
      intent: assistantResult.intent,
      params: assistantResult.params || {},
      assistantResult
    };
  }
}
