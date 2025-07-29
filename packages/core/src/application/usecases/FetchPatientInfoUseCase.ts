import { AppError } from '@clinickeys-agents/core/utils';
import { FetchKommoDataUseCase } from './FetchKommoDataUseCase';
import { PatientService } from '@clinickeys-agents/core/application/services/PatientService';

export interface FetchPatientInfoInput {
  botConfigId: string;
  clinicSource: string;
  clinicId: string;
  leadId: number;
  tiempoActualDT: any;
}

export interface FetchPatientInfoOutput {
  patient: any;
  appointments: any[];
  packsBonos: any[];
  budgets: any[];
}

export class FetchPatientInfoUseCase {
  private fetchKommoDataUseCase: FetchKommoDataUseCase;
  private patientService: PatientService;

  constructor(
    fetchKommoDataUseCase: FetchKommoDataUseCase,
    patientService: PatientService
  ) {
    this.fetchKommoDataUseCase = fetchKommoDataUseCase;
    this.patientService = patientService;
  }

  async execute(input: FetchPatientInfoInput): Promise<FetchPatientInfoOutput> {
    const { botConfigId, clinicSource, clinicId, leadId, tiempoActualDT } = input;

    // 1. Obtener datos de Kommo
    const kommoData = await this.fetchKommoDataUseCase.execute({
      botConfigId,
      clinicSource,
      clinicId,
      leadId
    });

    // 2. Preparar objeto leadPhones según la lógica antigua
    const contactPhone = kommoData.contactData?.custom_fields_values?.find(
      (cf: any) => cf.field_code === 'PHONE' && cf.values?.length
    )?.values?.[0]?.value || '';
    const leadPhones = {
      in_conversation: '',
      in_field: kommoData.customFields?.find((cf: any) => cf.field_code === 'PHONE')?.values?.[0]?.value || '',
      in_contact: contactPhone
    };

    // 3. Llamar a PatientService para traer toda la info del paciente
    const patientInfo = await this.patientService.getPatientInfo(
      tiempoActualDT,
      kommoData.botConfig.clinicId,
      leadPhones
    );

    if (!patientInfo) {
      throw new AppError({
        code: 'ERR_PATIENT_INFO_NOT_FOUND',
        humanMessage: 'Patient info not found for this lead/contact.',
        context: { botConfigId, clinicSource, clinicId, leadId }
      });
    }

    return {
      patient: patientInfo.paciente,
      appointments: patientInfo.citas,
      packsBonos: patientInfo.packsBonos,
      budgets: patientInfo.presupuestos
    };
  }
}
