// src/utils/http.ts

import type { APIGatewayProxyResultV2 } from "aws-lambda";

/**
 * Crea una respuesta HTTP con Content-Type application/json.
 * @param statusCode Código de estado HTTP.
 * @param payload Cuerpo de la respuesta (se serializa a JSON). Si se omite, se retornará un cuerpo vacío.
 * @param extraHeaders Encabezados adicionales opcionales.
 * @returns APIGatewayProxyResultV2 con los headers y body configurados.
 */
export function jsonResponse(
  statusCode: number,
  payload?: unknown,
  extraHeaders: Record<string, string> = {}
): APIGatewayProxyResultV2 {
  const response: APIGatewayProxyResultV2 = {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
    },
    body: payload !== undefined ? JSON.stringify(payload) : "",
  };

  return response;
}
