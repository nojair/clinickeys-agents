// packages/core/src/domain/kommo/IKommoRepository.ts

import {
  KommoLeadCustomFieldDefinition,
  KommoContactCustomFieldDefinition,
  KommoCreateContactResponse,
  KommoCreateLeadResponse,
  KommoSearchContactResponse,
  KommoGetLeadByIdResponse,
} from "@clinickeys-agents/core/infrastructure/integrations/kommo";

export interface IKommoRepository {
  // --------- FIELDS ---------
  fetchCustomFields(entityType: 'leads'): Promise<KommoLeadCustomFieldDefinition[]>;
  fetchCustomFields(entityType: 'contacts'): Promise<KommoContactCustomFieldDefinition[]>;
  fetchCustomFields(entityType: 'leads' | 'contacts'): Promise<KommoLeadCustomFieldDefinition[] | KommoContactCustomFieldDefinition[]>;

  // --------- TASKS ---------
  createTask(params: {
    leadId: string | number;
    message: string;
    minutesSinceNow?: number;
    responsibleUserId: number | string;
  }): Promise<{ success: boolean }>;

  // --------- CRUD KOMMO CONTACTS ---------
  createContact(params: { body: any }): Promise<KommoCreateContactResponse>;
  createLead(params: { body: any }): Promise<KommoCreateLeadResponse>;
  searchContactByPhone(params: { phone: string }): Promise<KommoSearchContactResponse | null>;
  getLeadById(params: { leadId: string }): Promise<KommoGetLeadByIdResponse | null>;

  // --------- PATCH LEAD DIRECTO ---------
  patchLead(params: { leadId: string; payload: any }): Promise<any>;

  // --------- RUN SALESBOT ---------
  runSalesbot(params: { botId: number; leadId: string }): Promise<any>;
}
