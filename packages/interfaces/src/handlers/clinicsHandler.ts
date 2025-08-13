// packages/core/src/interface/handlers/clinicsHandler.ts

import { ClinicRepositoryMySQL } from "@clinickeys-agents/core/infrastructure/clinic";
import { createMySQLPool, getEnvVar } from "@clinickeys-agents/core/infrastructure/helpers";
import { ClinicService } from "@clinickeys-agents/core/application/services";
import { ClinicController } from "../controllers";
import { jsonResponse } from "@clinickeys-agents/core/utils";

import type { Handler, APIGatewayProxyEventV2 as E, APIGatewayProxyResultV2 as R } from "aws-lambda";

// Inicializar pool de MySQL una vez al cargar el handler
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

  try {
    const {
      http: { method, path },
    } = event.requestContext;
    const qs = event.queryStringParameters ?? {};
    const pathParams = event.pathParameters ?? {};
    const clinicSource = qs.clinicSource || pathParams.clinicSource || "legacy";
    const clinicId = qs.id_clinic || pathParams.id_clinic;

    const service = new ClinicService(clinicRepo);
    const controller = new ClinicController(service);

    // Listar todas las clínicas
    if (method === "GET" && path === "/clinics") {
      const clinics = await controller.listGlobalClinics(clinicSource as string);
      return jsonResponse(200, clinics);
    }

    // Obtener clínica por ID
    if (method === "GET" && path.startsWith("/clinic") && clinicId) {
      const clinic = await controller.getClinicById(clinicId, clinicSource as string);
      if (!clinic) {
        return jsonResponse(404, { message: "Clinic not found" });
      }
      return jsonResponse(200, clinic);
    }

    // Ruta no encontrada
    return jsonResponse(404, { message: "Not found" });
  } catch (error: any) {
    console.error("clinicsHandler error:", error);
    return jsonResponse(500, { message: "Internal server error" });
  }
};
