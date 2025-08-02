import { INotificationRepository } from '@clinickeys-agents/core/domain/notification';
import { IBotConfigRepository } from '@clinickeys-agents/core/domain/botConfig';
import { IPatientRepository } from '@clinickeys-agents/core/domain/patient/IPatientRepository';
import { KommoApiGateway } from '@clinickeys-agents/core/infrastructure/integrations/kommo';
import { KommoRepository } from '@clinickeys-agents/core/infrastructure/kommo/KommoRepository';
import { KommoService } from '@clinickeys-agents/core/application/services/KommoService';
import { localTime, safeISODate, parseClinicDate, canSendReminder } from '@clinickeys-agents/core/utils';
import { Logger } from '@clinickeys-agents/core/infrastructure/external';
import {
  SPACE_NAME,
  CLINIC_NAME,
  PATIENT_PHONE,
  TREATMENT_NAME,
  NOTIFICATION_ID,
  REMINDER_MESSAGE,
  DOCTOR_FULL_NAME,
  APPOINTMENT_DATE,
  PATIENT_LAST_NAME,
  PATIENT_FIRST_NAME,
  TRIGGERED_BY_MACHINE,
  APPOINTMENT_END_TIME,
  APPOINTMENT_START_TIME,
  APPOINTMENT_WEEKDAY_NAME,
} from '@clinickeys-agents/core/utils';

export interface SendRemindersJobProps {
  notificationsRepo: INotificationRepository;
  botConfigRepo: IBotConfigRepository;
  patientRepo: IPatientRepository;
  pageSize?: number;
}

export class SendRemindersJob {
  private readonly notificationsRepo: INotificationRepository;
  private readonly botConfigRepo: IBotConfigRepository;
  private readonly patientRepo: IPatientRepository;
  private readonly pageSize: number;

  constructor(props: SendRemindersJobProps) {
    this.notificationsRepo = props.notificationsRepo;
    this.botConfigRepo = props.botConfigRepo;
    this.patientRepo = props.patientRepo;
    this.pageSize = props.pageSize ?? 100;
  }

  public async execute(): Promise<void> {
    try {
      let cursor: Record<string, any> | undefined = {};
      let page = 0;

      do {
        const { items: configs, nextCursor } = await this.botConfigRepo.listByBotConfigType("notifications", this.pageSize, cursor);
        cursor = nextCursor;
        page++;

        if (!configs.length) continue;
        Logger.info(`[JOB] Página ${page}: procesando ${configs.length} configuraciones`);

        for (const cfg of configs) {
          const { botConfigType, clinicId, clinicSource, kommo: { subdomain, longLivedToken, salesbotId }, timezone } = cfg;
          if (!botConfigType || !clinicId || !clinicSource || !subdomain || !salesbotId || !longLivedToken) {
            Logger.error('[JOB] Config incompleta', { botConfigType, clinicId, clinicSource, subdomain, salesbotId, longLivedToken });
            continue;
          }

          const fechaEnvio = safeISODate(localTime(timezone));
          const notifications = await this.notificationsRepo.findPendingByClinic(clinicId, fechaEnvio);
          if (!notifications.length) continue;

          Logger.info(
            `[JOB] Clínica ${clinicId} (${clinicSource}) – ${notifications.length} recordatorios para ${fechaEnvio}`
          );

          const kommoGateway = new KommoApiGateway({ longLivedToken, subdomain });
          const kommoRepo = new KommoRepository(kommoGateway);
          const kommoService = new KommoService(kommoRepo, this.patientRepo);

          
          const now = localTime(timezone);
          const MIN_HOUR = 10;
          const hourNow = now.hour;
          
          for (const n of notifications) {
            try {
              const patient = await this.patientRepo.findById(n.id_entidad_destino as number);
              if (!patient) throw new Error("No patient found");
              const progDate = parseClinicDate(n.hora_envio_programada, timezone).toISODate();
              Logger.info('[JOB] Analizando notificación', { id: n.id_notificacion, telefono: patient.telefono, progDate, hourNow });

              if (!canSendReminder(now, MIN_HOUR)) {
                Logger.info('[JOB] Hora local < MIN_HOUR, pendiente', { hourNow, MIN_HOUR, id: n.id_notificacion });
                continue;
              }

              // 1. Asegurar lead
              const leadId = await kommoService.ensureLead({
                botConfig: cfg,
                patientId: patient.id_paciente,
                [PATIENT_FIRST_NAME]: n.payload?.patient_firstname || '',
                [PATIENT_LAST_NAME]: n.payload?.patient_lastname || '',
                [PATIENT_PHONE]: patient.telefono || '',
                [NOTIFICATION_ID]: n.id_notificacion
              });

              // 2. Actualizar campos de recordatorio
              const customFields: Record<string, string> = {
                [REMINDER_MESSAGE]: n.mensaje || '',
                [NOTIFICATION_ID]: String(n.id_notificacion),
                [TRIGGERED_BY_MACHINE]: 'true',
                [PATIENT_FIRST_NAME]: n.payload?.patient_firstname || "",
                [PATIENT_LAST_NAME]: n.payload?.patient_lastname || "",
                [PATIENT_PHONE]: n.payload?.patient_lastname || "",
                [CLINIC_NAME]: n.payload?.clinic_name || "",
                [APPOINTMENT_DATE]: n.payload?.visit_date || "",
                [APPOINTMENT_START_TIME]: n.payload?.visit_init_time || "",
                [APPOINTMENT_END_TIME]: n.payload?.visit_end_time || "",
                [APPOINTMENT_WEEKDAY_NAME]: n.payload?.visit_week_day_name || "",
                [DOCTOR_FULL_NAME]: n.payload?.medic_full_name || "",
                [TREATMENT_NAME]: n.payload?.treatment_name || "",
                [SPACE_NAME]: n.payload?.visit_space_name || "",
                
              };
              await kommoService.updateLeadCustomFields({ botConfig: cfg, leadId, customFields });

              // 3. Ejecutar salesbot
              await kommoRepo.runSalesbot({ botId: salesbotId, leadId });
              Logger.info('[JOB] Salesbot ejecutado', { salesbotId, leadId });

              // 4. Marcar como enviado
              await this.notificationsRepo.updateState(n.id_notificacion, 'enviado');
            } catch (err) {
              await this.notificationsRepo.updateState(n.id_notificacion, 'fallido');
              Logger.error('[JOB] Error enviando recordatorio', { notificationId: n.id_notificacion, clinicId, error: err });
            }
          }
        }
      } while (cursor && Object.keys(cursor).length);
    } catch (error) {
      Logger.error('SendRemindersJob > Error ejecutando job', error);
      throw error;
    }
  }
}
