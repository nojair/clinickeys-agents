// packages/core/src/interface/handlers/sendRemindersHandler.ts

import { createMySQLPool, createDynamoDocumentClient, getEnvVar } from "@clinickeys-agents/core/infrastructure/config";
import { SendRemindersJob } from "@clinickeys-agents/core/infrastructure/job";
import { invokeSelf } from '@clinickeys-agents/core/utils';
import { APIGatewayProxyResult as R } from "aws-lambda";
import type { Handler } from 'aws-lambda';

export const handler: Handler = async (event, context): Promise<R> => {
  console.log('Lambda execution start');
  // Leer variables de entorno
  const mysqlPool = createMySQLPool({
    host: getEnvVar("CLINICS_DATA_DB_HOST"),
    user: getEnvVar("CLINICS_DATA_DB_USER"),
    password: getEnvVar("CLINICS_DATA_DB_PASSWORD"),
    database: getEnvVar("CLINICS_DATA_DB_NAME"),
    port: getEnvVar("CLINICS_DATA_DB_PORT") ? Number(getEnvVar("CLINICS_DATA_DB_PORT")) : 3306,
    waitForConnections: true,
    connectionLimit: 2,
    queueLimit: 0,
  });

  const docClient = createDynamoDocumentClient({
    region: getEnvVar("AWS_REGION"),
  });

  const job = new SendRemindersJob({
    mysqlPool,
    dynamoClient: docClient,
    botConfigTable: getEnvVar("BOT_CONFIG_TABLE")
  });

  try {    
    if (context.getRemainingTimeInMillis() < 15_000) {
      console.log('Re-invoking Lambda asynchronously to re-check at ≥10:00');
      await invokeSelf(event, context);
      return {
        statusCode: 202,
        body: JSON.stringify({ ok: true, reinvoked: true }),
      };
    }

    await job.execute();

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Internal server error" }),
    };
  } finally {
    await mysqlPool.end();
    console.log('Lambda execution end');
  }
}
