// packages/core/src/interface/handlers/botConfigsHandler.ts

import type { Handler, APIGatewayProxyResult as R } from "aws-lambda";
import { BotConfigController } from "../controllers/BotConfigController";
import { createDynamoDocumentClient, getEnvVar } from "@clinickeys-agents/core/infrastructure/config";
import { BotConfigRepositoryDynamo } from "@clinickeys-agents/core/infrastructure/botConfig";

// Use‑cases
import {
  AddBotConfigUseCase,
  UpdateBotConfigUseCase,
  DeleteBotConfigUseCase,
  GetBotConfigUseCase,
  ListGlobalBotConfigsUseCase
} from "@clinickeys-agents/core/application/usecases";

// -------------------- DI --------------------
const docClient = createDynamoDocumentClient({ region: getEnvVar("AWS_REGION") });
const botConfigRepo = new BotConfigRepositoryDynamo({
  tableName: getEnvVar("CLINICS_CONFIG_DB_NAME"),
  docClient,
});

const controller = new BotConfigController({
  addUseCase: new AddBotConfigUseCase({ botConfigRepository: botConfigRepo }),
  updateUseCase: new UpdateBotConfigUseCase({ botConfigRepository: botConfigRepo }),
  deleteUseCase: new DeleteBotConfigUseCase({ botConfigRepository: botConfigRepo }),
  getUseCase: new GetBotConfigUseCase({ botConfigRepository: botConfigRepo }),
  listGlobalUseCase: new ListGlobalBotConfigsUseCase({ botConfigRepository: botConfigRepo }),
});

// -------------------- Handler --------------------
export const handler: Handler = async (event): Promise<R> => {
  try {
    const { http: { method, path } } = event.requestContext;
    const qs = event.qs ?? {};
    const body = event.body ? JSON.parse(event.body) : undefined;

    // --- CREATE -------------------------------------------------------------
    if (method === "POST" && path == "/bot-config") {
      await controller.addBotConfig(body);
      return { statusCode: 201, body: JSON.stringify({ ok: true }) };
    }

    // --- UPDATE (PATCH) -----------------------------------------------------
    if (method === "PATCH" && path == "/bot-config") {
      await controller.updateBotConfig(body);
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    // --- DELETE -------------------------------------------------------------
    if (method === "DELETE" && path.startsWith("/bot-config")) {
      const { botConfigId, clinicSource, clinicId } = body ?? {};
      await controller.deleteBotConfig(botConfigId, clinicSource, clinicId);
      return { statusCode: 204, body: "" };
    }

    // --- GET ONE ------------------------------------------------------------
    if (method === "GET" && /\/bot-config\/?$/.test(path)) {
      const { botConfigId, clinicSource, clinicId } = qs || {};
      const config = await controller.getBotConfig(
        botConfigId!,
        clinicSource!,
        Number(clinicId)!
      );
      return { statusCode: 200, body: JSON.stringify(config) };
    }

    // --- LIST GLOBAL --------------------------------------------------------
    if (method === "GET" && path == "/bot-config/all") {
      const limit = qs?.limit ? Number(qs.limit) : undefined;
      const cursor = qs?.cursor ? JSON.parse(qs.cursor) : undefined;
      const result = await controller.listGlobalBotConfigs({ limit, cursor });
      return { statusCode: 200, body: JSON.stringify(result) };
    }

    // Not found --------------------------------------------------------------
    return { statusCode: 404, body: JSON.stringify({ error: "Not found" }) };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message ?? "Internal server error" }),
    };
  }
}
