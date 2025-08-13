// packages/core/src/infrastructure/kommo/KommoRepository.ts

import {
  KommoContactCustomFieldDefinition,
  KommoLeadCustomFieldDefinition,
  KommoSearchContactResponse,
  KommoCreateContactResponse,
  KommoGetLeadByIdResponse,
  KommoCreateLeadResponse,
  KommoContactResponse,
  KommoUsersResponse,
  KommoApiGateway,
} from '@clinickeys-agents/core/infrastructure/integrations/kommo';
import { IKommoRepository } from '@clinickeys-agents/core/domain/kommo';

export class KommoRepository implements IKommoRepository {
  private gateway: KommoApiGateway;

  constructor(gateway: KommoApiGateway) {
    this.gateway = gateway;
  }

  public async fetchCustomFields(entityType: 'leads'): Promise<KommoLeadCustomFieldDefinition[]>;
  public async fetchCustomFields(entityType: 'contacts'): Promise<KommoContactCustomFieldDefinition[]>;
  public async fetchCustomFields(
    entityType: 'leads' | 'contacts'
  ): Promise<KommoLeadCustomFieldDefinition[] | KommoContactCustomFieldDefinition[]> {
    if (entityType === 'leads') {
      return await this.gateway.fetchCustomFields('leads');
    }
    if (entityType === 'contacts') {
      return await this.gateway.fetchCustomFields('contacts');
    }
    throw new Error('Invalid entityType');
  }

  public async createTask(params: {
    leadId: number;
    message: string;
    minutesSinceNow?: number;
    responsibleUserId: number | string;
  }): Promise<{ success: boolean }> {
    const completeTill = Math.floor(Date.now() / 1000) + (params.minutesSinceNow || 10) * 60;
    const taskPayload = [
      {
        text: params.message,
        entity_id: params.leadId,
        entity_type: 'leads',
        complete_till: completeTill,
        responsible_user_id: params.responsibleUserId,
      },
    ];
    await this.gateway.createTask({ body: taskPayload });
    return { success: true };
  }

  public async createContact(params: { body: any }): Promise<KommoCreateContactResponse> {
    return this.gateway.createContact(params);
  }

  public async createLead(params: { body: any }): Promise<KommoCreateLeadResponse> {
    return this.gateway.createLead(params);
  }

  public async searchContactByPhone(params: { phone: string }): Promise<KommoSearchContactResponse | null> {
    return this.gateway.searchContactByPhone(params);
  }

  public async getLeadById(params: { leadId: number }): Promise<KommoGetLeadByIdResponse | null> {
    return this.gateway.getLeadById(params);
  }

  public async patchLead(params: { leadId: number; payload: any }): Promise<any> {
    return this.gateway.patchLead(params);
  }

  public async runSalesbot(params: { botId: number; leadId: number }): Promise<any> {
    return this.gateway.runSalesbot(params);
  }

  public async getContactById(params: { contactId: number }): Promise<KommoContactResponse | null> {
    return this.gateway.getContactById(params);
  }

  public async getUsers(): Promise<KommoUsersResponse | null> {
    return this.gateway.getUsers();
  }
}
