// packages/functions/src/clinics.ts

import type { Handler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { getPool } from "@clinickeys-agents/core/db";
import type { Clinic } from "@clinickeys-agents/core/types";
import { getAllClinics, getClinicById } from "@clinickeys-agents/core/clinics";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const CLINICS_CONFIG_DB_NAME = process.env.CLINICS_CONFIG_DB_NAME!;

export const handler: Handler = async (event) => {
  const {
    requestContext: {
      http: { method: httpMethod, path },
    },
    queryStringParameters,
    body,
  } = event;
  const id = queryStringParameters?.id;

  console.log("Received event:", httpMethod, path, queryStringParameters);

  try {
    if (httpMethod === "GET" && path === "/saas/clinics") {
      const pool = getPool();
      const [rows] = await pool.query(
        'SELECT id_clinica, id_super_clinica, nombre_clinica, cif, direccion, telefono, ciudad, pais, email, codigo_postal, url_logo FROM clinicas'
      );
      return {
        statusCode: 200,
        body: JSON.stringify(rows),
      };
    }

    if (httpMethod === "GET" && path === "/clinics") {
      const clinics: Clinic[] = await getAllClinics(CLINICS_CONFIG_DB_NAME);
      return {
        statusCode: 200,
        body: JSON.stringify(clinics),
      };
    }

    if (httpMethod === "GET" && id) {
      const clinic = await getClinicById(id, CLINICS_CONFIG_DB_NAME);
      if (!clinic) {
        return {
          statusCode: 404,
          body: JSON.stringify({ message: "Clinic not found" }),
        };
      }
      return {
        statusCode: 200,
        body: JSON.stringify(clinic),
      };
    }

    if (httpMethod === "POST") {
      const clinic: Clinic = JSON.parse(body);
      if (!clinic.id_clinica || !clinic.name) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: "Missing required clinic fields" }),
        };
      }
      await docClient.send(
        new PutCommand({
          TableName: CLINICS_CONFIG_DB_NAME,
          Item: clinic,
        })
      );
      return {
        statusCode: 201,
        body: JSON.stringify(clinic),
      };
    }

    if (httpMethod === "PATCH" && id) {
      const updates: Partial<Clinic> = JSON.parse(body);
      const allowedFields: (keyof Clinic)[] = [
        "name",
        "subdomain",
        "timezone",
        "default_country",
        "id_salesbot",
        "api_key",
        "fields_profile",
      ];
      const filteredUpdates = Object.fromEntries(
        Object.entries(updates).filter(([key]) =>
          allowedFields.includes(key as keyof Clinic)
        )
      );
      if (Object.keys(filteredUpdates).length === 0) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: "No valid fields to update" }),
        };
      }
      const updateExpression = Object.keys(filteredUpdates)
        .map((key) => `#${key} = :${key}`)
        .join(", ");
      const expressionAttributeNames = Object.keys(filteredUpdates).reduce(
        (acc, key) => {
          acc[`#${key}`] = key;
          return acc;
        }, {} as Record<string, string>
      );
      const expressionAttributeValues = Object.entries(filteredUpdates).reduce(
        (acc, [key, value]) => {
          acc[`:${key}`] = value as any;
          return acc;
        }, {} as Record<string, any>
      );
      await docClient.send(
        new UpdateCommand({
          TableName: CLINICS_CONFIG_DB_NAME,
          Key: { id_clinica: id, entity: updates.entity },
          UpdateExpression: `SET ${updateExpression}`,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
        })
      );
      return {
        statusCode: 200,
        body: JSON.stringify({ id_clinica: id, ...filteredUpdates }),
      };
    }

    if (httpMethod === "DELETE" && id) {
      await docClient.send(
        new DeleteCommand({
          TableName: CLINICS_CONFIG_DB_NAME,
          Key: { id_clinica: id },
        })
      );
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Clinic deleted" }),
      };
    }

    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Invalid request" }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};
