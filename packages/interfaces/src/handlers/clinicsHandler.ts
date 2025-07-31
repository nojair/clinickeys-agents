// packages/core/src/interface/handlers/clinicsHandler.ts

import { ClinicRepositoryMySQL } from "@clinickeys-agents/core/infrastructure/clinic";
import { createMySQLPool, getEnvVar } from "@clinickeys-agents/core/infrastructure/helpers";
import { ClinicService } from "@clinickeys-agents/core/application/services";
import { ClinicController } from "../controllers";

import type { Handler, APIGatewayProxyEventV2 as E, APIGatewayProxyResultV2 as R } from "aws-lambda";

createMySQLPool({
  host: getEnvVar("CLINICS_DATA_DB_HOST"),
  user: getEnvVar("CLINICS_DATA_DB_USER"),
  password: getEnvVar("CLINICS_DATA_DB_PASSWORD"),
  database: getEnvVar("CLINICS_DATA_DB_NAME"),
  port: getEnvVar("CLINICS_DATA_DB_PORT") ? Number(getEnvVar("CLINICS_DATA_DB_PORT")) : 3306,
  waitForConnections: true,
  connectionLimit: 2,
  queueLimit: 0,
});

export const handler: Handler<E, R> = async (event) => {
  const clinicRepo = new ClinicRepositoryMySQL();

  // El clinicRepo debe vivir en el scope del handler para cerrarlo en finally
  try {
    const { http: { method, path } } = event.requestContext;
    const qs = event.queryStringParameters ?? {};
    const pathParams = event.pathParameters ?? {};
    const clinicSource = qs.clinicSource || pathParams.clinicSource || "legacy";
    const clinicId = qs.id_clinic || pathParams.id_clinic;
    console.log("Listing clinics with source:", clinicSource);

    const service = new ClinicService(clinicRepo);
    const controller = new ClinicController(service);

    if (method === "GET" && path === "/clinics") {
      const clinics = await controller.listGlobalClinics(clinicSource);
      return { statusCode: 200, body: JSON.stringify(clinics) };
    }

    if (method === "GET" && path.startsWith("/clinic") && clinicId) {
      const clinic = await controller.getClinicById(clinicId, clinicSource);
      if (!clinic) {
        return { statusCode: 404, body: JSON.stringify({ message: "Clinic not found" }) };
      }
      return { statusCode: 200, body: JSON.stringify(clinic) };
    }

    return { statusCode: 404, body: JSON.stringify({ message: "Not found" }) };
  } catch (error: any) {
    console.error("clinicsHandler error:", error);
    return { statusCode: 500, body: JSON.stringify({ message: "Internal server error" }) };
  }
};
