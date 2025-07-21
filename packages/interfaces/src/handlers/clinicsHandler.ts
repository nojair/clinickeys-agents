// packages/core/src/interface/handlers/clinicsHandler.ts

import type { Handler, APIGatewayProxyEvent as E, Context as C, APIGatewayProxyResult as R } from "aws-lambda";
import { createMySQLPool } from "@clinickeys-agents/core/infrastructure/config/mysqlFactory";
import { getEnvVar } from "@clinickeys-agents/core/infrastructure/config/env";
import { ClinicRepositoryMySQL } from "@clinickeys-agents/core/infrastructure/clinic/ClinicRepositoryMySQL";
import { ClinicService } from "@clinickeys-agents/core/application/services/ClinicService";
import { ClinicController } from "../controllers/ClinicController";

export const handler: Handler = async (event: E, context: C): Promise<R> => {
  console.log(process.env["CLINICS_DATA_DB_HOST"], "CLINICS_DATA_DB_HOST");
  // ---------- Infra: pool y repo "legacy" ------------------
  const mysqlPool = createMySQLPool({
    host: getEnvVar("CLINICS_DATA_DB_HOST"),
    user: getEnvVar("CLINICS_DATA_DB_USER"),
    password: getEnvVar("CLINICS_DATA_DB_PASSWORD"),
    database: getEnvVar("CLINICS_DATA_DB_NAME"),
    port: Number(getEnvVar("CLINICS_DATA_DB_PORT") || 3306),
    waitForConnections: true,
    connectionLimit: 2,
    queueLimit: 0,
  });

  const repo = new ClinicRepositoryMySQL(mysqlPool);
  const service = new ClinicService(repo);
  const controller = new ClinicController(service);

  try {
    const method = event.httpMethod;
    const route = event.resource || event.path;
    const qs = event.queryStringParameters ?? {};
    const pathParams = event.pathParameters ?? {};

    const clinicSource = qs.clinic_source || pathParams.clinic_source || "legacy";
    const clinicId = qs.id_clinic || pathParams.id_clinic;
    console.log("Listing clinics with source:", clinicSource);

    // -------------------- LIST ------------------------------
    if (method === "GET" && (route.endsWith("/clinics") || route === "/clinics")) {
      const clinics = await controller.listGlobalClinics(clinicSource);
      return { statusCode: 200, body: JSON.stringify(clinics) };
    }

    // -------------------- GET ONE ---------------------------
    if (method === "GET" && (route.endsWith("/clinic") || route === "/clinic") && clinicId) {
      const clinic = await controller.getClinicById(clinicId, clinicSource);
      if (!clinic) {
        return { statusCode: 404, body: JSON.stringify({ message: "Clinic not found" }) };
      }
      return { statusCode: 200, body: JSON.stringify(clinic) };
    }

    // -------------------- NOT FOUND -------------------------
    return { statusCode: 404, body: JSON.stringify({ message: "Not found" }) };
  } catch (error: any) {
    console.error("clinicsHandler error:", error);
    return { statusCode: 500, body: JSON.stringify({ message: "Internal server error" }) };
  } finally {
    await mysqlPool.end();
  }
};
