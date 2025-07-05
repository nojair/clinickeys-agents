// packages/core/src/clinics/index.ts

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  QueryCommand,
  GetCommand,
} from '@aws-sdk/lib-dynamodb';
import type { Clinic } from '../types';
import { profiles } from '../config/profiles';
import { getKommoLeadsCustomFields } from '../kommo/fields';

const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient);
const ENTITY_VALUE = 'CLINIC';

/**
 * Obtiene todas las clínicas sin escanear la tabla completa.
 */
export async function getAllClinics(tableName: string): Promise<Clinic[]> {
  const result = await ddb.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'entity = :entity',
      ExpressionAttributeValues: {
        ':entity': ENTITY_VALUE,
      },
    }),
  );
  const items = result.Items ?? [];
  return Promise.all(items.map(enrichClinic));
}

/**
 * Obtiene una clínica por su ID.
 */
export async function getClinicById(id: string, tableName: string): Promise<Clinic | null> {
  const result = await ddb.send(
    new GetCommand({
      TableName: tableName,
      Key: { entity: ENTITY_VALUE, id_clinica: id },
    }),
  );
  if (!result.Item) return null;
  return enrichClinic(result.Item);
}

/**
 * Completa los datos de una clínica con campos de Kommo y estado de preparación.
 */
async function enrichClinic(item: Record<string, any>): Promise<Clinic> {
  const profileKey = item.fields_profile as keyof typeof profiles;
  const config = profiles[profileKey].lead.custom_field_config;
  const fieldNames = config.map((c) => c.field_name);

  const kommo_leads_custom_fields = await getKommoLeadsCustomFields(
    item.subdomain,
    item.api_key,
    fieldNames,
  );

  const requiredProps = [
    'id_clinica',
    'name',
    'subdomain',
    'timezone',
    'default_country',
    'id_salesbot',
    'api_key',
    'fields_profile',
  ];

  const hasAll = requiredProps.every(
    (prop) => item[prop] !== undefined && item[prop] !== null && item[prop] !== '',
  );
  const is_ready = hasAll && kommo_leads_custom_fields.every((f) => f.exists);

  return {
    id_clinica: item.id_clinica,
    name: item.name,
    subdomain: item.subdomain,
    timezone: item.timezone,
    default_country: item.default_country,
    id_salesbot: item.id_salesbot,
    api_key: item.api_key,
    fields_profile: item.fields_profile,
    kommo_leads_custom_fields,
    is_ready,
    entity: item.entity || '',
  };
}
