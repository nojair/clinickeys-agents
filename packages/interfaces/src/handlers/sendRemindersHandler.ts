// packages/core/src/interface/handlers/sendRemindersHandler.ts

import { createMySQLPool, createDynamoDocumentClient, getEnvVar } from "@clinickeys-agents/core/infrastructure/config";
import { NotificationRepositoryMySQL } from "@clinickeys-agents/core/infrastructure/notification";
import { BotConfigRepositoryDynamo } from "@clinickeys-agents/core/infrastructure/botConfig";
import { PatientRepositoryMySQL } from "@clinickeys-agents/core/infrastructure/patient/PatientRepositoryMySQL";
import { SendRemindersJob } from "@clinickeys-agents/core/infrastructure/job";
import { APIGatewayProxyResult as R } from "aws-lambda";
import type { Handler } from 'aws-lambda';

export const handler: Handler = async (event, context): Promise<R> => {
  console.log('Lambda execution start');
  // Crear pools y clientes de infraestructura
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

  // Crear repositorios concretos (infrastructure)
  const notificationsRepo = new NotificationRepositoryMySQL(mysqlPool);
  const botConfigRepo = new BotConfigRepositoryDynamo({
    tableName: getEnvVar("BOT_CONFIG_TABLE"),
    docClient,
  });
  const patientRepo = new PatientRepositoryMySQL();

  // Inyectar los repositorios al Job
  const job = new SendRemindersJob({
    notificationsRepo,
    botConfigRepo,
    patientRepo,
    pageSize: 100,
  });

  try {
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
};
