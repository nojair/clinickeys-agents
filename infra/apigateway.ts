import { SUFFIX, ENVIRONMENT } from "./config";

export const botConfigApiGateway = new sst.aws.ApiGatewayV2(`BotConfigApiGateway${SUFFIX}`, {
  cors: {
    allowOrigins: ["*"],
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    maxAge: "24 hours",
  },
});

const PATH_TO_CLINICS_HANDLER = "packages/interfaces/src/handlers/clinicsHandler.handler";
const PATH_TO_BOT_CONFIG_HANDLER = "packages/interfaces/src/handlers/botConfigsHandler.handler";

const routes = [
  // ["GET /placeholders", PATH_TO_BOT_CONFIG_HANDLER],
  ["GET /clinics", PATH_TO_CLINICS_HANDLER],
  ["GET /clinic/{id_clinic}", PATH_TO_CLINICS_HANDLER],
  ["POST /bot-config", PATH_TO_BOT_CONFIG_HANDLER],
  ["GET /bot-config/all", PATH_TO_BOT_CONFIG_HANDLER],
  ["GET /bot-config/{botConfigId}", PATH_TO_BOT_CONFIG_HANDLER],
  ["PUT /bot-config/{botConfigId}", PATH_TO_BOT_CONFIG_HANDLER],
  ["DELETE /bot-config/{botConfigId}", PATH_TO_BOT_CONFIG_HANDLER],
];

for (const [route, handler] of routes) {
  botConfigApiGateway.route(route, { handler, environment: ENVIRONMENT });
}