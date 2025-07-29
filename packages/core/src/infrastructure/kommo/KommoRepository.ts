// packages/core/src/infrastructure/kommo/KommoRepository.ts

import {
  KommoContactCustomFieldDefinition,
  KommoLeadCustomFieldDefinition,
  KommoSearchContactResponse,
  KommoCreateContactResponse,
  KommoGetLeadByIdResponse,
  KommoCreateLeadResponse,
  KommoContactResponse,
  KommoApiGateway,
} from "@clinickeys-agents/core/infrastructure/integrations/kommo";

export class KommoRepository {
  private gateway: KommoApiGateway;

  constructor(gateway: KommoApiGateway) {
    this.gateway = gateway;
  }

  // --------- FIELDS ---------
  public async fetchCustomFields(entityType: 'leads'): Promise<KommoLeadCustomFieldDefinition[]>;
  public async fetchCustomFields(entityType: 'contacts'): Promise<KommoContactCustomFieldDefinition[]>;
  public async fetchCustomFields(entityType: 'leads' | 'contacts'):
    Promise<KommoLeadCustomFieldDefinition[] | KommoContactCustomFieldDefinition[]> {
    if (entityType === 'leads') {
      return await this.gateway.fetchCustomFields('leads');
    }
    if (entityType === 'contacts') {
      return await this.gateway.fetchCustomFields('contacts');
    }
    throw new Error('Invalid entityType');
  }

  // --------- TASKS ---------
  public async createTask({
    leadId,
    message,
    minutesSinceNow = 10,
    responsibleUserId
  }: {
    leadId: number | number;
    message: string;
    minutesSinceNow?: number;
    responsibleUserId: number | string;
  }): Promise<{ success: boolean }> {
    const completeTill = Math.floor(Date.now() / 1000) + minutesSinceNow * 60;
    const taskPayload = [
      {
        text: message,
        entity_id: leadId,
        entity_type: 'leads',
        complete_till: completeTill,
        responsible_user_id: responsibleUserId
      }
    ];
    await this.gateway.createTask({ body: taskPayload });
    return { success: true };
  }

  // --------- CRUD KOMMO CONTACTS ---------
  public async createContact(params: { body: any }): Promise<KommoCreateContactResponse> {
    return await this.gateway.createContact(params);
  }

  public async createLead(params: { body: any }): Promise<KommoCreateLeadResponse> {
    return await this.gateway.createLead(params);
  }

  public async searchContactByPhone(params: { phone: string }): Promise<KommoSearchContactResponse | null> {
    return await this.gateway.searchContactByPhone(params);
  }

  public async getLeadById(params: { leadId: number }): Promise<KommoGetLeadByIdResponse | null> {
    return await this.gateway.getLeadById(params);
  }

  // --------- PATCH LEAD DIRECTO ---------
  public async patchLead(params: { leadId: number; payload: any }): Promise<any> {
    return await this.gateway.patchLead(params);
  }

  // --------- RUN SALESBOT ---------
  public async runSalesbot(params: { botId: number; leadId: number }): Promise<any> {
    return await this.gateway.runSalesbot(params);
  }

  // --------- GET CONTACT BY ID ---------
  public async getContactById(params: { contactId: number }): Promise<KommoContactResponse | null> {
    return await this.gateway.getContactById(params);
  }
}
