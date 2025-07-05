// infra/cron.ts

import { SUFFIX } from "./config";
import { clinicsConfigTable } from "./database";

export const SendNotificationsCron = new sst.aws.Cron(`SendNotificationsCron${SUFFIX}`, {
  function: {
    handler: "packages/functions/src/notifications.handler",
    timeout: "15 minutes",
    memory: "1024 MB",
    environment: {
      CLINICS_CONFIG_DB_NAME: clinicsConfigTable.name,
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
  schedule: "rate(1 hour)",
});