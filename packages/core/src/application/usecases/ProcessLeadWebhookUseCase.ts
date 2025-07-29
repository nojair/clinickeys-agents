// packages/core/src/application/usecases/ProcessLeadWebhookUseCase.ts

import { FetchPatientInfoUseCase } from './FetchPatientInfoUseCase';
import { AppError } from '@clinickeys-agents/core/utils';

export interface ProcessLeadWebhookInput {
  event: any;
  pathParams: {
    botConfigId: string;
    clinicSource: string;
    clinicId: string;
  };
  tiempoActualDT: any;
}

export interface ProcessLeadWebhookOutput {
  leadId: number;
  pathParams: {
    botConfigId: string;
    clinicSource: string;
    clinicId: string;
  };
  patient: any;
  appointments: any[];
  packsBonos: any[];
  budgets: any[];
}

export class ProcessLeadWebhookUseCase {
  private fetchPatientInfoUseCase: FetchPatientInfoUseCase;

  constructor(fetchPatientInfoUseCase: FetchPatientInfoUseCase) {
    this.fetchPatientInfoUseCase = fetchPatientInfoUseCase;
  }

  async execute(input: ProcessLeadWebhookInput): Promise<ProcessLeadWebhookOutput> {
    const { event, pathParams, tiempoActualDT } = input;
    const body = event.body;

    if (
      !body ||
      !body.leads ||
      !body.leads.add ||
      !Array.isArray(body.leads.add) ||
      !body.leads.add.length
    ) {
      throw new AppError({
        code: 'ERR_INVALID_WEBHOOK_EVENT',
        humanMessage: 'Invalid webhook event: missing leads info',
        context: { body }
      });
    }

    const { botConfigId, clinicSource, clinicId } = pathParams;
    const leadId = body.leads.add[0].id;

    // Llamar a FetchPatientInfoUseCase
    const patientInfo = await this.fetchPatientInfoUseCase.execute({
      botConfigId,
      clinicSource,
      clinicId,
      leadId,
      tiempoActualDT
    });

    return {
      leadId,
      pathParams: { botConfigId, clinicSource, clinicId },
      patient: patientInfo.patient,
      appointments: patientInfo.appointments,
      packsBonos: patientInfo.packsBonos,
      budgets: patientInfo.budgets
    };
  }
}
