// packages/core/src/infrastructure/integrations/kommo/Mappers.ts

import { KommoCustomFieldMap, KommoCustomFieldDefinitionBase } from './models/KommoCustomFieldBase';
import { getEnumData } from '@clinickeys-agents/core/utils';

/**
 * Obtiene el ID de un campo personalizado por nombre o código.
 */
export function getFieldId(
  fieldMap: KommoCustomFieldMap,
  configItem: { field_name?: string; field_code?: string }
): number | undefined {
  let field: KommoCustomFieldDefinitionBase | undefined;
  if (configItem.field_name && fieldMap.byName[configItem.field_name]) {
    field = fieldMap.byName[configItem.field_name];
  } else if (configItem.field_code) {
    const code = configItem.field_code.toUpperCase();
    if (fieldMap.byCode[code]) {
      field = fieldMap.byCode[code];
    }
  }
  return field?.id;
}

/**
 * Obtiene la información de enum para un campo personalizado.
 */
export function getFieldEnumData(
  fieldMap: KommoCustomFieldMap,
  configItem: { field_name?: string; field_code?: string; enum_code?: string }
): { enum_id?: number; enum_code?: string } {
  let field: KommoCustomFieldDefinitionBase | undefined;
  if (configItem.field_name && fieldMap.byName[configItem.field_name]) {
    field = fieldMap.byName[configItem.field_name];
  } else if (configItem.field_code) {
    const code = configItem.field_code.toUpperCase();
    if (fieldMap.byCode[code]) {
      field = fieldMap.byCode[code];
    }
  }
  return getEnumData(field, configItem.enum_code);
}
