// packages/core/src/infrastructure/integrations/kommo/models/KommoContactCustomFieldValue.ts

import { KommoCustomFieldValueBase } from './KommoCustomFieldBase';

/**
 * Valor de campo personalizado para contactos en Kommo.
 * Extiende de la interfaz base unificada.
 */
export interface KommoContactCustomFieldValue extends KommoCustomFieldValueBase {
  entity_type?: 'contacts';
}
