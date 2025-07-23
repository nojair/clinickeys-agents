// packages/core/src/infrastructure/integrations/kommo/models/KommoContactCustomFieldDefinition.ts

export interface KommoContactCustomFieldDefinition {
  id: number;
  name: string;
  type: string;
  code?: string;
  enums?: Array<{ id: number; value: string; sort: number }>;
}
