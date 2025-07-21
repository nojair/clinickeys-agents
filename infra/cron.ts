// infra/cron.ts

import { SUFFIX } from "./config";
import { botConfigTable } from "./database";

export const sendNotificationsCron = new sst.aws.Cron(`SendNotificationsCron${SUFFIX}`, {
  schedule: "rate(1 hour)",
  function: {
    handler: "packages/interfaces/src/handlers/sendRemindersHandler.handler",
    link: [botConfigTable],
    timeout: "15 minutes",
    memory: "1024 MB",
    url: true,
    environment: {
      CLINICS_CONFIG_DB_NAME: botConfigTable.name,
      CLINICS_DATA_DB_HOST: process.env.CLINICS_DATA_DB_HOST ?? "",
      CLINICS_DATA_DB_USER: process.env.CLINICS_DATA_DB_USER ?? "",
      CLINICS_DATA_DB_PASSWORD: process.env.CLINICS_DATA_DB_PASSWORD ?? "",
      CLINICS_DATA_DB_NAME: process.env.CLINICS_DATA_DB_NAME ?? "",
    },
    permissions: [
      {
        actions: ["*"],
        resources: ["*"]
      }
    ]
  },
});