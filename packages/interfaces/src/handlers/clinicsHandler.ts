// packages/core/src/interface/handlers/clinicsHandler.ts

import type { Handler, APIGatewayProxyResult as R } from "aws-lambda";
import { createMySQLPool, getEnvVar } from "@clinickeys-agents/core/infrastructure/config";
import { ClinicRepositoryMySQL } from "@clinickeys-agents/core/infrastructure/clinic";
import { ClinicService } from "@clinickeys-agents/core/application/services";
import { ClinicController } from "../controllers";

export const handler: Handler = async (event): Promise<R> => {
  // ---------- Infra: pool y repo "legacy" ------------------
  const mysqlPool = createMySQLPool({
    host: getEnvVar("CLINICS_DATA_DB_HOST"),
    user: getEnvVar("CLINICS_DATA_DB_USER"),
    password: getEnvVar("CLINICS_DATA_DB_PASSWORD"),
    database: getEnvVar("CLINICS_DATA_DB_NAME"),
    port: Number(getEnvVar("CLINICS_DATA_DB_PORT")),
    waitForConnections: true,
    connectionLimit: 2,
    queueLimit: 0,
  });

  const repo = new ClinicRepositoryMySQL(mysqlPool);
  const service = new ClinicService(repo);
  const controller = new ClinicController(service);

  try {
    const { http: { method, path } } = event.requestContext;
    const qs = event.queryStringParameters ?? {};
    const pathParams = event.pathParameters ?? {};
    
    const clinicSource = qs.clinic_source || pathParams.clinic_source || "legacy";
    const clinicId = qs.id_clinic || pathParams.id_clinic;
    console.log("Listing clinics with source:", clinicSource);

    // -------------------- LIST ------------------------------
    if (method === "GET" && path === "/clinics") {
      const clinics = await controller.listGlobalClinics(clinicSource);
      return { statusCode: 200, body: JSON.stringify(clinics) };
    }

    // -------------------- GET ONE ---------------------------
    if (method === "GET" && path.startsWith("/clinic") && clinicId) {
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
