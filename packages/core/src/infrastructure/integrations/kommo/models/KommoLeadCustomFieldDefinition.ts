// packages/core/src/infrastructure/integrations/kommo/models/KommoLeadCustomFieldDefinition.ts

import { KommoCustomFieldDefinitionBase } from './KommoCustomFieldBase';

/**
 * Definición de campo personalizado para leads en Kommo.
 * Extiende de la interfaz base unificada.
 */
export interface KommoLeadCustomFieldDefinition extends KommoCustomFieldDefinitionBase {
  entity_type?: 'leads';
}
