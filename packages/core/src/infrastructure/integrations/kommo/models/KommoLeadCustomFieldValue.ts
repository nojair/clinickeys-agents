// packages/core/src/infrastructure/integrations/kommo/models/KommoLeadCustomFieldValue.ts

export interface KommoLeadCustomFieldValue {
  field_id: number;
  field_name: string;  // 👈 importante: aquí es field_name
  field_type: string;
  values: Array<{ value: any; enum_id?: number; enum_code?: string }>;
}
