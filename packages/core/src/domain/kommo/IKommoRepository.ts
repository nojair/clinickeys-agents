// packages/core/src/domain/kommo/IKommoRepository.ts

import type {
  KommoLeadCustomFieldDefinition,
  KommoContactCustomFieldDefinition,
  KommoSearchContactResponse,
  KommoCreateContactResponse,
  KommoGetLeadByIdResponse,
  KommoCreateLeadResponse,
  KommoContactResponse,
  KommoUsersResponse,
} from '@clinickeys-agents/core/infrastructure/integrations/kommo';

/**
 * Defines the contract for interacting with Kommo entities.
 */
export interface IKommoRepository {
  /** Fetch custom fields for leads or contacts */
  fetchCustomFields(entityType: 'leads'): Promise<KommoLeadCustomFieldDefinition[]>;
  fetchCustomFields(entityType: 'contacts'): Promise<KommoContactCustomFieldDefinition[]>;

  /** Create a task on a lead */
  createTask(params: {
    leadId: number | number;
    message: string;
    minutesSinceNow?: number;
    responsibleUserId: number | string;
  }): Promise<{ success: boolean }>;

  /** Create a new contact */
  createContact(params: { body: any }): Promise<KommoCreateContactResponse>;

  /** Create a new lead */
  createLead(params: { body: any }): Promise<KommoCreateLeadResponse>;

  /** Search for contacts by phone number */
  searchContactByPhone(params: { phone: string }): Promise<KommoSearchContactResponse | null>;

  /** Retrieve a lead by its ID */
  getLeadById(params: { leadId: number }): Promise<KommoGetLeadByIdResponse | null>;

  /** Patch custom fields on a lead */
  patchLead(params: { leadId: number; payload: any }): Promise<any>;

  /** Execute a salesbot for a lead */
  runSalesbot(params: { botId: number; leadId: number }): Promise<any>;

  /** Retrieve a contact by its ID */
  getContactById(params: { contactId: number }): Promise<KommoContactResponse | null>;

  /** Get users from the account */
  getUsers(): Promise<KommoUsersResponse | null>;
}
