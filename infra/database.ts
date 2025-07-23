// infra/database.ts

import { SUFFIX } from "./config";

/**
 * BotConfig table
 *
 *  PK → "CLINIC#<clinicSource>#<clinicId>"
 *  SK → "BOT_CONFIG#<botConfigId>"
 *
 *  GSIs disponibles:
 *   • byCrm → listado/lookup por CRM + subdominio
 */
export const botConfigDynamo = new sst.aws.Dynamo(`BotConfigDynamo${SUFFIX}`, {
  fields: {
    // Claves primarias
    pk: "string", // "CLINIC#<clinicSource>#<clinicId>"
    sk: "string", // "BOT_CONFIG#<botConfigId>"

    // Shard bucket para feed global
    bucket: "number", // hash(botConfigId) % N (0‑9)

    // Identidad del bot
    // botConfigId: "string",

    // Clínica multi‑fuente (desnormalizado)
    // clinicId: "string",
    clinicSource: "string", // "legacy", "v2", ...

    // CRM genérico
    crmType: "string",      // "kommo", "hubspot", ...
    crmSubdomain: "string", // "clinicA.kommo.com"

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
      hashKey: "crmType",
      rangeKey: "crmSubdomain",
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
      hashKey: "clinicSource",
      rangeKey: "createdAt",
      projection: "all",
    },
  },
});
