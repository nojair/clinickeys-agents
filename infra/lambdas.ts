// infra/lambdas.ts

import { clinicsConfigTable } from "./database";
import { SUFFIX } from "./config";

export const notificationsFunction = new sst.aws.Function(`NotificationsFn${SUFFIX}`, {
  handler: "packages/functions/src/notifications.handler",
  timeout: "15 minutes",
  memory: "1024 MB",
  url: true,
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
});

export const clinicsConfigFunction = new sst.aws.Function(`ClinicsConfigFn${SUFFIX}`, {
  handler: "packages/functions/src/clinics.handler",
  link: [clinicsConfigTable],
  url: true,
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
});