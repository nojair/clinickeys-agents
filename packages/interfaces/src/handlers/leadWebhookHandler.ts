// packages/core/src/interface/handlers/leadWebhook.ts

import type { Handler, LambdaFunctionURLEvent as E, LambdaFunctionURLResult as R } from "aws-lambda";

import { ProcessLeadWebhookUseCase } from "@clinickeys-agents/core/application/usecases";
import { SqsMessagePublisher } from "@clinickeys-agents/core/infrastructure/services";
import { createMySQLPool, getEnvVar } from "@clinickeys-agents/core/infrastructure/helpers";
import { Logger } from "@clinickeys-agents/core/infrastructure/external";
import { LeadWebhookController } from "../controllers";

// ───────────────────────────────────────────────────────────────────────────
// Bootstrap (ejecutado una sola vez en frío)
// ───────────────────────────────────────────────────────────────────────────
const queueUrl = getEnvVar("LEADS_DEBOUNCE_QUEUE_URL");
const messagePublisher = new SqsMessagePublisher({ queueUrl, logger: Logger });
const processUC = new ProcessLeadWebhookUseCase(Logger);
const controller = new LeadWebhookController(processUC, messagePublisher, Logger);

createMySQLPool({
  host: getEnvVar("CLINICS_DATA_DB_HOST"),
  user: getEnvVar("CLINICS_DATA_DB_USER"),
  password: getEnvVar("CLINICS_DATA_DB_PASSWORD"),
  database: getEnvVar("CLINICS_DATA_DB_NAME"),
  port: getEnvVar("CLINICS_DATA_DB_PORT") ? Number(getEnvVar("CLINICS_DATA_DB_PORT")) : 3306,
  waitForConnections: true,
  connectionLimit: 2,
  queueLimit: 0,
});

// ───────────────────────────────────────────────────────────────────────────
// Lambda entry point
// ───────────────────────────────────────────────────────────────────────────
export const handler: Handler<E, R> = async (event) => {
  return controller.handle(event);
};
