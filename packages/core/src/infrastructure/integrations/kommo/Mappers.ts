// packages/core/src/infrastructure/integrations/kommo/Mappers.ts

import {
  KommoLeadCustomFieldDefinition,
  KommoContactCustomFieldDefinition
} from './models';

// ---------- TIPOS AUXILIARES ----------

export interface LeadMap {
  byName: Record<string, KommoLeadCustomFieldDefinition>;
  byCode: Record<string, KommoLeadCustomFieldDefinition>;
}

export interface ContactMap {
  byName: Record<string, KommoContactCustomFieldDefinition>;
  byCode: Record<string, KommoContactCustomFieldDefinition>;
}

// ---------- MAPPER DE LEAD ----------

export function getLeadFieldId(
  leadMap: LeadMap,
  configItem: { field_name?: string; field_code?: string; enum_code?: string }
): number | undefined {
  let field: KommoLeadCustomFieldDefinition | undefined;
  if (configItem.field_name && leadMap.byName[configItem.field_name]) {
    field = leadMap.byName[configItem.field_name];
  } else if (configItem.field_code) {
    const code = configItem.field_code.toUpperCase();
    if (leadMap.byCode[code]) {
      field = leadMap.byCode[code];
    }
  }
  if (!field) return undefined;
  return field.id;
}

export function getLeadEnumData(
  leadMap: LeadMap,
  configItem: { field_name?: string; field_code?: string; enum_code?: string }
): { enum_id?: number; enum_code?: string } {
  let field: KommoLeadCustomFieldDefinition | undefined;
  if (configItem.field_name && leadMap.byName[configItem.field_name]) {
    field = leadMap.byName[configItem.field_name];
  } else if (configItem.field_code) {
    const code = configItem.field_code.toUpperCase();
    if (leadMap.byCode[code]) {
      field = leadMap.byCode[code];
    }
  }
  if (!field || !configItem.enum_code || !field.enums) return {};

  const enumObj = field.enums.find(
    e => (e.value || '').toUpperCase() === configItem.enum_code!.toUpperCase()
  );
  if (!enumObj) return {};
  return { enum_id: enumObj.id, enum_code: enumObj.value };
}

// ---------- MAPPER DE CONTACTO ----------

export function getContactFieldData(
  contactMap: ContactMap,
  configItem: { field_code?: string; enum_code?: string }
): { field_id: number; enum_id?: number; enum_code?: string } | undefined {
  if (!configItem.field_code) return undefined;
  const code = configItem.field_code.toUpperCase();
  const field = contactMap.byCode[code];
  if (!field) return undefined;

  let enum_id: number | undefined;
  let enum_code: string | undefined;
  if (configItem.enum_code && Array.isArray(field.enums)) {
    const enumObj = field.enums.find(
      e => (e.value || '').toUpperCase() === configItem.enum_code!.toUpperCase()
    );
    if (enumObj) {
      enum_id = enumObj.id;
      enum_code = enumObj.value;
    }
  }

  return { field_id: field.id, enum_id, enum_code };
}

export function getContactEnumData(
  contactMap: ContactMap,
  configItem: { field_code?: string; enum_code?: string }
): { enum_id?: number; enum_code?: string } {
  if (!configItem.field_code) return {};
  const code = configItem.field_code.toUpperCase();
  const field = contactMap.byCode[code];
  if (!field || !configItem.enum_code || !Array.isArray(field.enums)) return {};

  const enumObj = field.enums.find(
    e => (e.value || '').toUpperCase() === configItem.enum_code!.toUpperCase()
  );
  if (!enumObj) return {};
  return { enum_id: enumObj.id, enum_code: enumObj.value };
}
