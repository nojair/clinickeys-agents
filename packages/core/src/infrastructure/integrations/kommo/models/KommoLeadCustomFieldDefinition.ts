// packages/core/src/infrastructure/integrations/kommo/models/KommoLeadCustomFieldDefinition.ts

export interface KommoLeadCustomFieldDefinition {
  id: number;
  name: string;
  type: string;
  code?: string;
  enums?: Array<{ id: number; value: string; sort: number }>;
}
