// packages/core/src/infrastructure/job/SendRemindersJob.ts

import { INotificationRepository } from "@clinickeys-agents/core/domain/notification";
import { IBotConfigRepository } from "@clinickeys-agents/core/domain/botConfig";
import { IPatientRepository } from "@clinickeys-agents/core/domain/patient/IPatientRepository";
import { KommoApiGateway } from "@clinickeys-agents/core/infrastructure/integrations/kommo";
import { localTime, safeISODate, parseClinicDate, canSendReminder } from "@clinickeys-agents/core/utils";
import { KommoService } from "@clinickeys-agents/core/application/services";
import { Logger } from "@clinickeys-agents/core/infrastructure/external";

export interface SendRemindersJobProps {
  notificationsRepo: INotificationRepository;
  botConfigRepo: IBotConfigRepository;
  patientRepo: IPatientRepository;
  pageSize?: number; // lote de configs por página (default 100)
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

  /**
   * Ejecuta el envío de recordatorios para todas las configuraciones activas.
   * Procesa todas las fuentes (`clinicSource`) usando paginación por bucket.
   */
  async execute(): Promise<void> {
    try {
      let cursor: Record<string, Record<string, any>> | undefined = {};
      let page = 0;

      do {
        const { items: configs, nextCursor } = await this.botConfigRepo.listGlobal(this.pageSize, cursor);
        cursor = nextCursor;
        page++;

        if (!configs.length) continue;

        Logger.info(`[JOB] Página ${page}: procesando ${configs.length} configuraciones`);

        for (const cfg of configs) {
          // Solo procesamos CRMs Kommo por ahora
          if (cfg.crmType !== "kommo") continue;

          const clinicId = cfg.clinicId;
          const clinicSource = cfg.clinicSource;

          const apiKey = cfg.crmApiKey;
          const subdomain = cfg.crmSubdomain;
          const kommoSalesbotId = cfg.kommoSalesbotId;

          if (!subdomain || !kommoSalesbotId || !apiKey) {
            Logger.error("[JOB] Config incompleta", { clinicId, clinicSource, subdomain, kommoSalesbotId, apiKey });
            continue;
          }

          const fechaEnvioProgramada = safeISODate(localTime(cfg.timezone));
          const notifications = await this.notificationsRepo.findPendingByClinic(clinicId, fechaEnvioProgramada);
          if (!notifications.length) continue;

          Logger.info(`[JOB] Clínica ${clinicId} (${clinicSource}) – ${notifications.length} notificaciones para ${fechaEnvioProgramada}`);

          const kommoGateway = new KommoApiGateway({ apiKey, subdomain });
          const kommoService = new KommoService(kommoGateway, this.patientRepo);

          const tz = cfg.timezone;
          const now = localTime(tz);
          const hourNow = now.hour;
          const MIN_HOUR = 10;

          for (const n of notifications) {
            try {
              const progDate = parseClinicDate(n.scheduledDate, tz).toISODate();

              Logger.info("[JOB] Analizando notificación", {
                id_notificacion: n.notificacionId,
                telefono: n.payload?.patient_phone,
                progDate,
                hora_local: hourNow,
              });

              if (!canSendReminder(now, MIN_HOUR)) {
                Logger.info("[JOB] Hora local < MIN_HOUR, pendiente", { hourNow, MIN_HOUR, id_notificacion: n.notificacionId, tz });
                continue;
              }

              // 1. Asegurar lead en Kommo
              const leadId = await kommoService.ensureLead({
                botConfig: cfg,
                notification: n,
              });

              // 2. Actualizar custom fields dinámicos
              await kommoService.updateLeadCustomFields({ botConfig: cfg, leadId, notification: n });

              // 3. Ejecutar salesbot
              await kommoGateway.runSalesbot({ botId: kommoSalesbotId, leadId });
              Logger.info("[JOB] Salesbot ejecutado", { botId: kommoSalesbotId, leadId });

              // 4. Marcar como enviado
              await this.notificationsRepo.updateState(n.notificacionId, "enviado");
            } catch (err) {
              await this.notificationsRepo.updateState(n.notificacionId, "fallido");
              Logger.error("Error enviando recordatorio", {
                notificationId: n.notificacionId,
                clinicId,
                error: err,
              });
            }
          }
        }
      } while (cursor && Object.keys(cursor).length);
    } catch (error) {
      Logger.error("SendRemindersJob > Error ejecutando job", error);
      throw error;
    }
  }
}
