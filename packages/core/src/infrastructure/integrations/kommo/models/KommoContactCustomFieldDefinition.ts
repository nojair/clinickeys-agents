// packages/core/src/infrastructure/integrations/kommo/models/KommoContactCustomFieldDefinition.ts

import { KommoCustomFieldDefinitionBase } from './KommoCustomFieldBase';

/**
 * Definición de campo personalizado para contactos en Kommo.
 * Extiende de la interfaz base unificada.
 */
export interface KommoContactCustomFieldDefinition extends KommoCustomFieldDefinitionBase {
  entity_type?: 'contacts';
}
