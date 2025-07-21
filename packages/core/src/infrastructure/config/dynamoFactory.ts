// packages/core/src/infrastructure/config/dynamoFactory.ts

import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

/**
 * Fábrica para crear un cliente de DynamoDB DocumentClient.
 * El parámetro clientConfig es obligatorio.
 */
export function createDynamoDocumentClient(clientConfig: DynamoDBClientConfig) {
  const client = new DynamoDBClient(clientConfig);
  return DynamoDBDocumentClient.from(client);
}

/**
 * Ejemplo de uso en un handler:
 *
 * const ddb = createDynamoDocumentClient({ region: process.env.AWS_REGION });
 */
