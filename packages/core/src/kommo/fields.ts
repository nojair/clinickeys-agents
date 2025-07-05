// packages/core/src/kommo/fields.ts

import type { KommoLeadCustomField } from '../types';

export async function fetchCustomFields(
  entityType: string,
  subdomain: string,
  token: string
) {
  const url = `https://${subdomain}.kommo.com/api/v4/${entityType}/custom_fields`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  if (!res.ok) {
    throw new Error(`Error fetching ${entityType} custom fields: ${res.status}`);
  }
  const data: any = await res.json();
  return data._embedded?.custom_fields || [];
}

export function mapFields(fields: any[]) {
  const byName: Record<string, any> = {};
  const byCode: Record<string, any> = {};
  for (const field of fields) {
    if (field.name) {
      byName[field.name] = field;
    }
    if (field.code) {
      byCode[field.code.toUpperCase()] = field;
    }
  }
  return { byName, byCode };
}

export async function loadClinicFieldMappings(
  clinicCfg: { subdomain: string; api_key: string; fields_profile: string }
) {
  const [leadFields, contactFields] = await Promise.all([
    fetchCustomFields('leads', clinicCfg.subdomain, clinicCfg.api_key),
    fetchCustomFields('contacts', clinicCfg.subdomain, clinicCfg.api_key)
  ]);
  const leadMap = mapFields(leadFields);
  const contactMap = mapFields(contactFields);
  return { leadMap, contactMap };
}

export function getLeadFieldId(
  leadMap: { byName: Record<string, any>; byCode: Record<string, any> },
  configItem: { field_name?: string; field_code?: string; enum_code?: string }
) {
  let field: any;
  if (configItem.field_name && leadMap.byName[configItem.field_name]) {
    field = leadMap.byName[configItem.field_name];
  } else if (configItem.field_code) {
    const code = configItem.field_code.toUpperCase();
    if (leadMap.byCode[code]) {
      field = leadMap.byCode[code];
    }
  }
  if (!field) {
    return undefined;
  }

  const enumsArray = Array.isArray(field.enums) ? field.enums : [];
  const enumCode = configItem.enum_code;
  let enum_id: number | undefined;
  let enum_code: string | undefined;
  if (enumCode) {
    const enumObj = enumsArray.find(
      (e: any) => (e.value || '').toUpperCase() === enumCode.toUpperCase()
    );
    if (enumObj) {
      enum_id = enumObj.id;
      enum_code = enumObj.value;
    }
  }

  return field.id;
}

export function getContactFieldData(
  contactMap: { byName: Record<string, any>; byCode: Record<string, any> },
  configItem: { field_code?: string; enum_code?: string }
) {
  if (!configItem.field_code) {
    return undefined;
  }
  const code = configItem.field_code.toUpperCase();
  const field = contactMap.byCode[code];
  if (!field) {
    return undefined;
  }

  const enumsArray = Array.isArray(field.enums) ? field.enums : [];
  const enumCode = configItem.enum_code;
  let enum_id: number | undefined;
  let enum_code: string | undefined;
  if (enumCode) {
    const enumObj = enumsArray.find(
      (e: any) => (e.value || '').toUpperCase() === enumCode.toUpperCase()
    );
    if (enumObj) {
      enum_id = enumObj.id;
      enum_code = enumObj.value;
    }
  }

  return { field_id: field.id, enum_id, enum_code };
}

export async function getKommoLeadsCustomFields(
  subdomain: string,
  apiKey: string,
  configFields: string[]
): Promise<KommoLeadCustomField[]> {
  const fetchedFields = await fetchCustomFields('leads', subdomain, apiKey);
  const namesSet = new Set(fetchedFields.map((field: any) => field.name));
  return configFields.map((name) => ({ field_name: name, exists: namesSet.has(name) }));
}
