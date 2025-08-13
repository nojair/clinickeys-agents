// packages/core/src/infrastructure/integrations/kommo/models/KommoCustomFieldBase.ts

/**
 * Definición base para un campo personalizado de Kommo.
 * Se utiliza tanto para leads como para contacts.
 */
export interface KommoCustomFieldDefinitionBase {
  id: number;
  name: string;
  type: string;
  code?: string;
  enums?: Array<{
    id: number;
    value: string;
    sort: number;
  }>;
}

/**
 * Valor base para un campo personalizado de Kommo.
 * Se utiliza tanto para leads como para contacts.
 */
export interface KommoCustomFieldValueBase {
  field_id: number;
  field_name: string;
  field_type: string;
  field_code?: string;
  values: Array<{
    value: any;
    enum_id?: number;
    enum_code?: string;
  }>;
}

/**
 * Mapa de campos personalizados indexado por nombre y código.
 */
export interface KommoCustomFieldMap<TDefinition extends KommoCustomFieldDefinitionBase = KommoCustomFieldDefinitionBase> {
  byName: Record<string, TDefinition>;
  byCode: Record<string, TDefinition>;
}
