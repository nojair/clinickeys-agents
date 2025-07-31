// -----------------------------------------------------------------------------
// packages/core/src/interface/handlers/botsHandler.ts
// -----------------------------------------------------------------------------

import { createDynamoDocumentClient, getEnvVar } from "@clinickeys-agents/core/infrastructure/config";
import { BotConfigRepositoryDynamo } from "@clinickeys-agents/core/infrastructure/botConfig";
import { OpenAIGateway } from "@clinickeys-agents/core/infrastructure/integrations/openai";
import { OpenAIAssistantRepository } from "@clinickeys-agents/core/infrastructure/openai";
import { BotConfigService } from "@clinickeys-agents/core/application/services";
import { BotController } from "../controllers/BotController";
import {
  AddBotUseCase,
  UpdateBotConfigUseCase,
  DeleteBotUseCase,
  GetBotConfigUseCase,
  ListGlobalBotConfigsUseCase,
  type AddBotInput,
  type UpdateBotConfigInput,
  type ListGlobalBotConfigsInput,
} from "@clinickeys-agents/core/application/usecases";

import type { Handler, APIGatewayProxyEventV2 as E, APIGatewayProxyResultV2 as R } from "aws-lambda";

// -------------------- DI --------------------
const docClient = createDynamoDocumentClient({
  region: getEnvVar("AWS_REGION"),
});

const tableName = getEnvVar("CLINICS_CONFIG_DB_NAME");
const botConfigRepo = new BotConfigRepositoryDynamo({ tableName, docClient });
const botConfigService = new BotConfigService(botConfigRepo);

// Factory que crea un repositorio de assistants para el token recibido
const openaiRepoFactory = (token: string) =>
  new OpenAIAssistantRepository(new OpenAIGateway({ apiKey: token }));

const controller = new BotController({
  addUseCase: new AddBotUseCase(botConfigRepo, openaiRepoFactory),
  updateUseCase: new UpdateBotConfigUseCase({ botConfigService }),
  deleteUseCase: new DeleteBotUseCase({ botConfigRepo, openaiRepoFactory }),
  getUseCase: new GetBotConfigUseCase({ botConfigService }),
  listGlobalUseCase: new ListGlobalBotConfigsUseCase({ botConfigService }),
});

// -------------------- Handler --------------------
export const handler: Handler<E, R> = async (event) => {
  try {
    const { method, path } = event.requestContext.http;
    const qs = event.queryStringParameters ?? {};
    const body = event.body ? JSON.parse(event.body) : undefined;

    // --- CREATE BOT ---------------------------------------------------------
    if (method === "POST" && path === "/bot") {
      await controller.addBot(body as AddBotInput);
      return { statusCode: 201, body: JSON.stringify({ ok: true }) };
    }

    // --- DELETE BOT ---------------------------------------------------------
    const deleteMatch = path.match(/^\/bot\/([^\/]+)\/([^\/]+)\/([^\/]+)$/);
    if (method === "DELETE" && deleteMatch) {
      const [, botConfigId, clinicSource, clinicIdStr] = deleteMatch;
      await controller.deleteBot(botConfigId, clinicSource, Number(clinicIdStr));
      return { statusCode: 204, body: "" };
    }

    // --- UPDATE BOT-CONFIG --------------------------------------------------
    if (method === "PATCH" && path === "/bot-config") {
      await controller.updateBotConfig(body as UpdateBotConfigInput);
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    // --- GET ONE BOT-CONFIG -------------------------------------------------
    if (method === "GET" && /\/bot-config\/?$/.test(path)) {
      const { botConfigId, clinicSource, clinicId } = qs;
      const config = await controller.getBotConfig(
        botConfigId!,
        clinicSource!,
        Number(clinicId!),
      );
      return { statusCode: 200, body: JSON.stringify(config) };
    }

    // --- LIST GLOBAL BOT-CONFIGS -------------------------------------------
    if (method === "GET" && path === "/bot-config/all") {
      const limit = qs?.limit ? Number(qs.limit) : undefined;
      const cursor = qs?.cursor ? (JSON.parse(qs.cursor) as Record<string, Record<string, any>>) : undefined;
      const result = await controller.listGlobalBotConfigs({
        limit,
        cursor,
      } as ListGlobalBotConfigsInput);
      return { statusCode: 200, body: JSON.stringify(result) };
    }

    // -------------------- Not found ----------------------------------------
    return { statusCode: 404, body: JSON.stringify({ error: "Not found" }) };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message ?? "Internal server error" }),
    };
  }
};
