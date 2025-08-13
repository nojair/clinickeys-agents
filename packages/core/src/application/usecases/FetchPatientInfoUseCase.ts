import { PatientService } from '@clinickeys-agents/core/application/services';
import { BotConfigType } from '@clinickeys-agents/core/domain/botConfig';
import { FetchKommoDataUseCase } from './FetchKommoDataUseCase';
import { AppError } from '@clinickeys-agents/core/utils';
import { Logger } from '@clinickeys-agents/core/infrastructure/external';

export interface FetchPatientInfoInput {
  botConfigType: BotConfigType;
  botConfigId: string;
  clinicSource: string;
  clinicId: number;
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
    const { botConfigType, botConfigId, clinicSource, clinicId, leadId, tiempoActualDT } = input;
    Logger.info('[FetchPatientInfo] Inicio', { botConfigType, botConfigId, clinicSource, clinicId, leadId });

    // 1. Obtener datos de Kommo
    Logger.debug('[FetchPatientInfo] Obteniendo datos de Kommo');
    const kommoData = await this.fetchKommoDataUseCase.execute({
      botConfigType,
      botConfigId,
      clinicSource,
      clinicId,
      leadId
    });
    Logger.debug('[FetchPatientInfo] Datos de Kommo obtenidos', {
      contactId: kommoData.contactId,
      normalizedLeadCFCount: kommoData.normalizedLeadCF?.length,
      normalizedContactCFCount: kommoData.normalizedContactCF?.length
    });

    // 2. Preparar objeto leadPhones
    Logger.debug('[FetchPatientInfo] Preparando objeto leadPhones');
    const contactPhone = kommoData.contactData?.custom_fields_values?.find(
      (cf: any) => cf.field_code === 'PHONE' && cf.values?.length
    )?.values?.[0]?.value || '';
    const leadPhones = {
      in_conversation: '',
      in_field: kommoData.normalizedContactCF?.find((cf: any) => cf.field_code === 'PHONE')?.values?.[0]?.value || '',
      in_contact: contactPhone
    };
    Logger.debug('[FetchPatientInfo] leadPhones preparado', { leadPhones });

    // 3. Llamar a PatientService
    Logger.debug('[FetchPatientInfo] Obteniendo información del paciente desde PatientService');
    const patientInfo = await this.patientService.getPatientInfo(
      tiempoActualDT,
      kommoData.botConfig.clinicId,
      leadPhones
    );

    if (!patientInfo) {
      Logger.error('[FetchPatientInfo] No se encontró información del paciente', { leadId });
      throw new AppError({
        code: 'ERR_PATIENT_INFO_NOT_FOUND',
        humanMessage: 'Patient info not found for this lead/contact.',
        context: { botConfigId, clinicSource, clinicId, leadId }
      });
    }

    Logger.info('[FetchPatientInfo] Información del paciente obtenida con éxito', {
      hasAppointments: !!patientInfo.citas?.length,
      hasPacksBonos: !!patientInfo.packsBonos?.length,
      hasBudgets: !!patientInfo.presupuestos?.length
    });

    return {
      patient: patientInfo.paciente,
      appointments: patientInfo.citas,
      packsBonos: patientInfo.packsBonos,
      budgets: patientInfo.presupuestos
    };
  }
}
