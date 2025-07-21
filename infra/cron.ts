// infra/cron.ts

import { SUFFIX, ENVIRONMENT } from "./config";
import { botConfigDynamo } from "./database";

export const sendNotificationsCron = new sst.aws.Cron(`SendNotificationsCron${SUFFIX}`, {
  schedule: "rate(1 hour)",
  function: {
    handler: "packages/interfaces/src/handlers/sendRemindersHandler.handler",
    link: [botConfigDynamo],
    timeout: "15 minutes",
    memory: "1024 MB",
    url: true,
    environment: {
      ...ENVIRONMENT,
      CLINICS_CONFIG_DB_NAME: botConfigDynamo.name,
    },
    permissions: [
      {
        actions: ["*"],
        resources: ["*"]
      }
    ]
  },
});