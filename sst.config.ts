// sst.config.ts

/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: `clinickeys-agents-${input.stage}`,
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
    };
  },
  console: {
    autodeploy: {
      target(event) {
        if (event.type === "branch" && event.branch === "main" && event.action === "pushed") {
          return { stage: "production" };
        } else if (event.type === "branch" && event.branch === "test" && event.action === "pushed") {
          return { stage: "testing" };
        }

        return;
      },
    }
  },
  async run() {
    const apiGateway = await import("./infra/apigateway");
    const databases = await import("./infra/database");
    const lambda = await import("./infra/lambda");
    const cron = await import("./infra/cron");
    await import("./infra/frontend");
    await import("./infra/cron");

    return {
      BotConfigTable: databases.botConfigDynamo.name,
      Gateway: apiGateway.botConfigApiGateway.url,
      ChatbotWebhookFn: lambda.chatbotWebhookFn.url,
      sendNotificationsUrl: cron.sendNotificationsCron.nodes.function.url,
    };
  },
});
