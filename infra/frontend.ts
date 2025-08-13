// infra/frontend.ts

import { botConfigApiGateway } from "./apigateway";
import { chatbotWebhookFn } from "./lambda";
import { SUFFIX } from "./config";

export const frontend = new sst.aws.Nextjs(`frontend${SUFFIX}`, {
  path: "packages/frontend",
  //domain: "my-app.com",
  environment: {
    NEXT_PUBLIC_API_URL: botConfigApiGateway.url,
    NEXT_PUBLIC_WEBHOOK_BASE_URL: chatbotWebhookFn.url,
    NEXT_PUBLIC_STAGE: $app.stage
  }
});