// packages/core/src/interface/handlers/leadWebhook.ts

import {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from "aws-lambda";

import { LeadWebhookController } from "../controllers";
import { ProcessLeadWebhookUseCase } from "@clinickeys-agents/core/application/usecases";
import { SqsMessagePublisher } from "@clinickeys-agents/core/infrastructure/services/SqsMessagePublisher";
import { getEnvVar } from "@clinickeys-agents/core/infrastructure/config/env";
import { Logger } from "@clinickeys-agents/core/infrastructure/external";

// ───────────────────────────────────────────────────────────────────────────
// Bootstrap (ejecutado una sola vez en frío)
// ───────────────────────────────────────────────────────────────────────────
const queueUrl = getEnvVar("LEADS_DEBOUNCE_QUEUE_URL");
const messagePublisher = new SqsMessagePublisher({ queueUrl, logger: Logger });
const processUC = new ProcessLeadWebhookUseCase(Logger);
const controller = new LeadWebhookController(processUC, messagePublisher, Logger);

// ───────────────────────────────────────────────────────────────────────────
// Lambda entry point
// ───────────────────────────────────────────────────────────────────────────
export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> => {
  return controller.handle(event);
};
