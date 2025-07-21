// packages/core/src/interface/handlers/botConfigsHandler.ts

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { BotConfigController } from "../controllers/BotConfigController";
import { createDynamoDocumentClient } from "@clinickeys-agents/core/infrastructure/config/dynamoFactory";
import { getEnvVar } from "@clinickeys-agents/core/infrastructure/config/env";
import { BotConfigRepositoryDynamo } from "@clinickeys-agents/core/infrastructure/BotConfig/BotConfigRepositoryDynamo";

// Use‑cases
import { AddBotConfigUseCase } from "@clinickeys-agents/core/application/usecases/AddBotConfigUseCase";
import { UpdateBotConfigUseCase } from "@clinickeys-agents/core/application/usecases/UpdateBotConfigUseCase";
import { DeleteBotConfigUseCase } from "@clinickeys-agents/core/application/usecases/DeleteBotConfigUseCase";
import { GetBotConfigUseCase } from "@clinickeys-agents/core/application/usecases/GetBotConfigUseCase";
import { ListGlobalBotConfigsUseCase } from "@clinickeys-agents/core/application/usecases/ListGlobalBotConfigsUseCase";

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
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const { httpMethod: method, resource, path, queryStringParameters } = event;
    const route = resource || path; // depends on API Gateway settings
    const body = event.body ? JSON.parse(event.body) : undefined;

    // --- CREATE -------------------------------------------------------------
    if (method === "POST" && route.endsWith("/bot-config")) {
      await controller.addBotConfig(body);
      return { statusCode: 201, body: JSON.stringify({ ok: true }) };
    }

    // --- UPDATE (PATCH) -----------------------------------------------------
    if (method === "PATCH" && route.endsWith("/bot-config")) {
      await controller.updateBotConfig(body);
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    // --- DELETE -------------------------------------------------------------
    if (method === "DELETE" && route.endsWith("/bot-config")) {
      const { bot_config_id, clinic_source, clinic_id } = body ?? {};
      await controller.deleteBotConfig(bot_config_id, clinic_source, clinic_id);
      return { statusCode: 204, body: "" };
    }

    // --- GET ONE ------------------------------------------------------------
    if (method === "GET" && /\/bot-config\/?$/.test(route)) {
      const { bot_config_id, clinic_source, clinic_id } = queryStringParameters || {};
      const config = await controller.getBotConfig(
        bot_config_id!,
        clinic_source!,
        clinic_id!
      );
      return { statusCode: 200, body: JSON.stringify(config) };
    }

    // --- LIST GLOBAL --------------------------------------------------------
    if (method === "GET" && route.endsWith("/bot-config/all")) {
      const limit = queryStringParameters?.limit ? Number(queryStringParameters.limit) : undefined;
      const cursor = queryStringParameters?.cursor ? JSON.parse(queryStringParameters.cursor) : undefined;
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
