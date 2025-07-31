// packages/core/src/interface/handlers/leadProcessor.ts

import type { Handler, SQSEvent } from "aws-lambda";

import { createDynamoDocumentClient, getEnvVar } from "@clinickeys-agents/core/infrastructure/helpers";
import { BotConfigRepositoryDynamo } from "@clinickeys-agents/core/infrastructure/botConfig";
import { GetBotConfigUseCase } from "@clinickeys-agents/core/application/usecases";
import { LeadProcessorController } from "../controllers/LeadProcessorController";
import { BotConfigService } from "@clinickeys-agents/core/application/services";
import { Logger } from "@clinickeys-agents/core/infrastructure/external";

// ───────────────────────────────────────────────────────────────────────────
// Dependency injection (cold start)
// ───────────────────────────────────────────────────────────────────────────
const logger = Logger;

// DynamoDB client & repository for bot‑configs
const docClient = createDynamoDocumentClient({ region: getEnvVar("AWS_REGION") });
const botConfigTable = getEnvVar("CLINICS_CONFIG_DB_NAME");
const botConfigRepo = new BotConfigRepositoryDynamo({ tableName: botConfigTable, docClient });
const botConfigService = new BotConfigService(botConfigRepo);
const getBotConfigUC = new GetBotConfigUseCase({botConfigService});

// Controller instanciado con la dependencia principal
const controller = new LeadProcessorController(getBotConfigUC, logger);

// ───────────────────────────────────────────────────────────────────────────
// Lambda entry point
// ───────────────────────────────────────────────────────────────────────────
export const handler: Handler<SQSEvent, void> = async (event) => {
  await controller.handle(event);
};
