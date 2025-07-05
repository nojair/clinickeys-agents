// packages/core/src/config/index.ts

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { profiles } from './profiles';
import type { Clinic } from '../types';

const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient);
const ENTITY_VALUE = 'CLINIC';

/**
 * Obtiene todas las clínicas sin escanear la tabla completa.
 */
export async function getActiveClinics(tableName: string): Promise<Clinic[]> {
  const result = await ddb.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'entity = :e',
      ExpressionAttributeValues: { ':e': ENTITY_VALUE },
    }),
  );
  return (result.Items ?? []) as Clinic[];
}

/**
 * Obtiene los campos personalizados de Kommo configurados para un perfil.
 */
export function getRelevantFields(profileKey: keyof typeof profiles) {
  const profile = profiles[profileKey];
  if (!profile) {
    throw new Error(`Perfil '${profileKey}' no encontrado`);
  }
  const addingContactFields =
    profile.adding_contact?.custom_fields_config?.map((f) => ({
      field_code: f.field_code,
      enum_code: f.enum_code,
    })) ?? [];
  const leadCustomFields =
    profile.lead?.custom_field_config?.map((f) => ({
      field_name: f.field_name,
    })) ?? [];
  return { addingContactFields, leadCustomFields };
}
