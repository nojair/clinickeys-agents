// packages/core/src/infrastructure/integrations/kommo/models/KommoContactCustomFieldValue.ts

export interface KommoContactCustomFieldValue {
  field_id: number;
  field_name: string;
  field_type: string;
  values: Array<{ value: any; enum_id?: number; enum_code?: string }>;
}
