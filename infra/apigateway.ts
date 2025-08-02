import { SUFFIX, ENVIRONMENT } from "./config";
import { botConfigDynamo } from "./database";

export const botConfigApiGateway = new sst.aws.ApiGatewayV2(`BotConfigApiGateway${SUFFIX}`, {
  cors: {
    allowOrigins: ["*"],
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    maxAge: "24 hours",
  },
  link: [botConfigDynamo],
});

const PATH_TO_CLINICS_HANDLER = "packages/interfaces/src/handlers/clinicsHandler.handler";
const PATH_TO_BOT_CONFIG_HANDLER = "packages/interfaces/src/handlers/botsHandler.handler";

const routes = [
  // ["GET /placeholders", PATH_TO_BOT_CONFIG_HANDLER],
  ["GET /clinics", PATH_TO_CLINICS_HANDLER],
  ["GET /clinic/{id_clinic}", PATH_TO_CLINICS_HANDLER],

  ["POST /bot", PATH_TO_BOT_CONFIG_HANDLER],
  ["GET /bot-config/all", PATH_TO_BOT_CONFIG_HANDLER],
  ["GET /bot-config", PATH_TO_BOT_CONFIG_HANDLER],
  ["PATCH /bot-config/{botConfigId}", PATH_TO_BOT_CONFIG_HANDLER],
  ["DELETE /bot/{botConfigType}/{botConfigId}/{clinicSource}/{clinicId}", PATH_TO_BOT_CONFIG_HANDLER],
];

for (const [route, handler] of routes) {
  botConfigApiGateway.route(route, {
    handler,
    permissions: [
      {
        actions: ["*"],
        resources: ["*"],
      },
    ],
    environment: {
      ...ENVIRONMENT,
      CLINICS_CONFIG_DB_NAME: botConfigDynamo.name
    }
  });
}