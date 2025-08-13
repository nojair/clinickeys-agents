// packages/core/src/interface/handlers/kommoUsersHandler.ts

import { KommoApiGateway } from "@clinickeys-agents/core/infrastructure/integrations/kommo";
import { KommoRepository } from "@clinickeys-agents/core/infrastructure/kommo";
import { Logger } from "@clinickeys-agents/core/infrastructure/external";
import { KommoUsersController } from "../controllers/KommoUsersController";
import { jsonResponse } from "@clinickeys-agents/core/utils";
import { GetKommoUsersUseCase } from "@clinickeys-agents/core/application/usecases";

import type { Handler, APIGatewayProxyEventV2 as E, APIGatewayProxyResultV2 as R } from "aws-lambda";

export const handler: Handler<E, R> = async (event) => {
  try {
    const body = typeof event.body == 'string' ? JSON.parse(event.body) : {};
    const { subdomain, token } = typeof body == 'string' ? JSON.parse(body || "{}") : body;
    if (!subdomain || !token) {
      return jsonResponse(400, { message: "Missing subdomain or token" });
    }

    // Instanciar gateway y repo en cada request (stateless)
    const gateway = new KommoApiGateway({ longLivedToken: token, subdomain });
    const repo = new KommoRepository(gateway);
    const useCase = new GetKommoUsersUseCase({ kommoRepo: repo });
    const controller = new KommoUsersController(useCase);

    // Ejecutar controller
    const result = await controller.getUsers();
    return jsonResponse(200, result);
  } catch (error: any) {
    Logger.error("kommoUsersHandler error:", error.status, error);
    if (error?.status === 404) {
      return jsonResponse(404, { message: "Unauthorized: Invalid token or subdomain" });
    }
    return jsonResponse(500, { message: "Internal server error" });
  }
};
