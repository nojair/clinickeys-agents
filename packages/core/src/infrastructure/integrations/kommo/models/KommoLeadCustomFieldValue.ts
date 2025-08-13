// packages/core/src/infrastructure/integrations/kommo/models/KommoLeadCustomFieldValue.ts

import { KommoCustomFieldValueBase } from './KommoCustomFieldBase';

/**
 * Valor de campo personalizado para leads en Kommo.
 * Extiende de la interfaz base unificada.
 */
export interface KommoLeadCustomFieldValue extends KommoCustomFieldValueBase {
  entity_type?: 'leads';
}
