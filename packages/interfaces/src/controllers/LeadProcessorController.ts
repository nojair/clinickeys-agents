// packages/core/src/interface/controllers/LeadProcessorController.ts

import { SQSEvent, SQSRecord } from "aws-lambda";

import {
  CommunicateWithAssistantUseCase,
  CommunicateInput,
  RecognizeUserIntentUseCase,
  ScheduleAppointmentUseCase,
  CheckAvailabilityUseCase,
  CheckReprogramAvailabilityUseCase,
  RescheduleAppointmentUseCase,
  CancelAppointmentUseCase,
  HandleUrgencyUseCase,
  RegularConversationUseCase,
  FetchPatientInfoUseCase,
  FetchKommoDataUseCase,
  GetBotConfigUseCase,
} from "@clinickeys-agents/core/application/usecases";

import {
  KommoService,
  OpenAIService,
  PatientService,
  AvailabilityService,
  AppointmentService,
  PackBonoService
} from "@clinickeys-agents/core/application/services";

import { KommoApiGateway } from "@clinickeys-agents/core/infrastructure/integrations/kommo";
import { OpenAIGateway } from "@clinickeys-agents/core/infrastructure/integrations/openai";

import { KommoRepository } from "@clinickeys-agents/core/infrastructure/kommo";
import { MedicoRepositoryMySQL } from "@clinickeys-agents/core/infrastructure/medico";
import { TratamientoRepositoryMySQL } from "@clinickeys-agents/core/infrastructure/tratamiento";
import { PackBonoRepositoryMySQL } from "@clinickeys-agents/core/infrastructure/packBono";
import { EspacioRepositoryMySQL } from "@clinickeys-agents/core/infrastructure/espacio";

import { PatientRepositoryMySQL } from "@clinickeys-agents/core/infrastructure/patient";
import { AppointmentRepositoryMySQL } from "@clinickeys-agents/core/infrastructure/appointment";
import { PresupuestoRepositoryMySQL } from "@clinickeys-agents/core/infrastructure/presupuesto";
import { Logger } from "@clinickeys-agents/core/infrastructure/external";

import { LeadQueueMessageDTO } from "@clinickeys-agents/core/domain/kommo";

/**
 * Controlador que procesa los mensajes provenientes de la cola FIFO.
 */
export class LeadProcessorController {
  constructor(
    private readonly getBotConfigUC: GetBotConfigUseCase,
    private readonly logger: typeof Logger = Logger,
  ) {}

  // Entry
  async handle(event: SQSEvent): Promise<void> {
    this.logger.info("SQS batch", { total: event.Records.length });
    for (const rec of event.Records) await this.processRecord(rec);
  }

  // Single record
  private async processRecord(record: SQSRecord): Promise<void> {
    let msg: LeadQueueMessageDTO;
    try {
      msg = JSON.parse(record.body);
    } catch (err) {
      this.logger.error("Invalid JSON", err as Error);
      throw err;
    }

    const { botConfigId, clinicSource, clinicId, salesbotId } = msg.pathParameters;
    if (!botConfigId || !clinicSource || !clinicId) throw new Error("Missing path params");

    // 1. BotConfig
    const botConfig = await this.getBotConfigUC.execute(botConfigId, clinicSource, Number(clinicId));
    if (!botConfig) throw new Error("BotConfig not found");

    const appointmentRepo = new AppointmentRepositoryMySQL()
    const tratamientoRepo = new TratamientoRepositoryMySQL();
    const packBonoRepo = new PackBonoRepositoryMySQL();
    const patientRepo = new PatientRepositoryMySQL();
    const medicoRepo = new MedicoRepositoryMySQL();
    const espacioRepo = new EspacioRepositoryMySQL();

    // 2. Gateways & base services
    const kommoGateway = new KommoApiGateway({
      longLivedToken: (botConfig as any).kommo.longLivedToken,
      subdomain: (botConfig as any).kommo.subdomain,
    });
    const kommoRepository = new KommoRepository(kommoGateway);
    const kommoService = new KommoService(kommoRepository, patientRepo);
    
    const openAIGateway = new OpenAIGateway({ apiKey: (botConfig as any).openai.apiKey });
    const openAIService = new OpenAIService(openAIGateway, this.logger);
    

    // 3. PatientService (requiere varios repos)
    const patientService = new PatientService({
      patientRepo,
      appointmentRepo,
      presupuestoRepo: new PresupuestoRepositoryMySQL(),
      packBonoRepo,
    });

    // 4. Servicios adicionales (Disponibilidad, Citas, Packs)
    const availabilityService = new AvailabilityService(
      tratamientoRepo,
      medicoRepo,
      espacioRepo,
      openAIService
    );
    const appointmentService = new AppointmentService(appointmentRepo);
    const packBonoService = new PackBonoService(packBonoRepo);

    // 5. Use Cases dependientes
    const fetchKommoDataUC = new FetchKommoDataUseCase(
      this.getBotConfigUC as any, // usa el mismo UC internamente
      kommoService,
    );
    const fetchPatientInfoUC = new FetchPatientInfoUseCase(fetchKommoDataUC, patientService);
    const recognizeIntentUC = new RecognizeUserIntentUseCase(fetchPatientInfoUC);

    const scheduleAppointmentUC = new ScheduleAppointmentUseCase(
      kommoService,
      appointmentService,
      availabilityService,
      patientService,
      openAIService,
      packBonoService,
    );
    const checkAvailabilityUC = new CheckAvailabilityUseCase(kommoService, availabilityService);
    const checkReprogramAvailabilityUC = new CheckReprogramAvailabilityUseCase(kommoService, availabilityService);
    const rescheduleAppointmentUC = new RescheduleAppointmentUseCase(
      kommoService,
      appointmentService,
      availabilityService,
      openAIService,
    );
    const cancelAppointmentUC = new CancelAppointmentUseCase(
      kommoService,
      appointmentService,
      packBonoService,
    );
    const handleUrgencyUC = new HandleUrgencyUseCase(kommoService);
    const regularConversationUC = new RegularConversationUseCase(kommoService);

    // 6. Communicate UC
    const communicateUC = new CommunicateWithAssistantUseCase({
      kommoService,
      openAIService,
      recognizeIntentUC,
      scheduleAppointmentUC,
      checkAvailabilityUC,
      checkReprogramAvailabilityUC,
      rescheduleAppointmentUC,
      cancelAppointmentUC,
      handleUrgencyUC,
      regularConversationUC,
    });

    // 7. Ejecutar
    const communicateInput: CommunicateInput = {
      leadId: Number(msg.kommo.leads.add?.[0]?.id ?? 0),
      botConfig: botConfig as any,
      mergedCustomFields: [],
      salesbotId: Number(salesbotId ?? 0),
      userMessage: "",
    };

    await communicateUC.execute(communicateInput);
    this.logger.info("Processed", { leadId: communicateInput.leadId });
  }
}
