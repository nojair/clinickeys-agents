// infra/database.ts

import { SUFFIX } from "./config";

/**
 * BotConfig table
 *
 *  PK → "CLINIC#<clinic_source>#<clinic_id>"
 *  SK → "BOT_CONFIG#<bot_config_id>"
 *
 *  GSIs disponibles:
 *   • byCrm → listado/lookup por CRM + subdominio
 */
export const botConfigTable = new sst.aws.Dynamo(`BotConfigDynamo${SUFFIX}`, {
  fields: {
    // Claves primarias
    pk: "string", // "CLINIC#<clinic_source>#<clinic_id>"
    sk: "string", // "BOT_CONFIG#<bot_config_id>"

    // Shard bucket para feed global
    bucket: "number", // hash(bot_config_id) % N (0‑9)

    // Identidad del bot
    // bot_config_id: "string",

    // Clínica multi‑fuente (desnormalizado)
    // clinic_id: "string",
    clinic_source: "string", // "legacy", "v2", ...

    // CRM genérico
    crm_type: "string",      // "kommo", "hubspot", ...
    crm_subdomain: "string", // "clinicA.kommo.com"

    // Estado y metadatos
    // isActive: "binary",
    // name: "string",
    // description: "string",

    // Fechas (epoch millis)
    createdAt: "number",
    // updatedAt: "number",
  },

  primaryIndex: {
    hashKey: "pk",
    rangeKey: "sk",
  },

  globalIndexes: {
    /** Lookup y listado por CRM + subdominio */
    byCrm: {
      hashKey: "crm_type",
      rangeKey: "crm_subdomain",
      projection: "all",
    },

    /** Feed global shard‑bucket → creado más reciente */
    byBucketCreated: {
      hashKey: "bucket",
      rangeKey: "createdAt",
      projection: "all",
    },

    /** Feed por fuente */
    bySourceCreated: {
      hashKey: "clinic_source",
      rangeKey: "createdAt",
      projection: "all",
    },
  },
});
