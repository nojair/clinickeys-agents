// packages/core/src/interface/handlers/clinicsHandler.ts

import { ClinicRepositoryFactory } from "@clinickeys-agents/core/infrastructure/clinic/ClinicRepositoryFactory";
import { ClinicService } from "@clinickeys-agents/core/application/services";
import { ClinicController } from "../controllers";

import type { Handler, APIGatewayProxyEventV2 as E, APIGatewayProxyResultV2 as R } from "aws-lambda";

export const handler: Handler<E, R> = async (event) => {
  const factory = new ClinicRepositoryFactory();

  // El repo debe vivir en el scope del handler para cerrarlo en finally
  let repo;
  try {
    const { http: { method, path } } = event.requestContext;
    const qs = event.queryStringParameters ?? {};
    const pathParams = event.pathParameters ?? {};
    const clinicSource = qs.clinicSource || pathParams.clinicSource || "legacy";
    const clinicId = qs.id_clinic || pathParams.id_clinic;
    console.log("Listing clinics with source:", clinicSource);

    repo = factory.get(clinicSource);
    const service = new ClinicService(repo);
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
  } finally {
    // Solo si el repo concreto soporta closeConnection
    if (repo && typeof (repo as any).closeConnection === "function") {
      await (repo as any).closeConnection();
    }
  }
};
