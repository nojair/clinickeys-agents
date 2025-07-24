// packages/core/src/infrastructure/integrations/kommo/ApiGateway.ts

import { ok, hdr } from "@clinickeys-agents/core/utils";
import type {
  KommoContactCustomFieldDefinition,
  KommoLeadCustomFieldDefinition,
} from "@clinickeys-agents/core/infrastructure/integrations/kommo/models";

// ---------- TIPOS DE RESPUESTA KOMMO ----------

export interface KommoContactLead {
  id: string;
  _embedded?: {
    leads?: Array<{ id: string }>;
  };
}

export interface KommoSearchContactResponse {
  _embedded?: {
    contacts?: KommoContactLead[];
  };
}

export interface KommoGetLeadByIdResponse {
  id: string;
  custom_fields_values: Array<any>; // Puedes tipar mejor si lo necesitas
  _embedded?: {
    contacts?: Array<{ id: string }>;
  };
}

export interface KommoCreateContactResponse {
  _embedded?: {
    contacts?: Array<{ id: string }>;
  };
}

export interface KommoCreateLeadResponse {
  _embedded?: {
    leads?: Array<{ id: string }>;
  };
}

// ---------- GATEWAY KOMMO PROFESIONAL ----------

export interface KommoApiGatewayOptions {
  apiKey: string;
  subdomain: string;
}

export class KommoApiGateway {
  private apiKey: string;
  private subdomain: string;
  private baseUrl: string;
  private fieldCache: Record<string, KommoLeadCustomFieldDefinition[] | KommoContactCustomFieldDefinition[]> = {};

  constructor({ apiKey, subdomain }: KommoApiGatewayOptions) {
    this.apiKey = apiKey;
    this.subdomain = subdomain;
    this.baseUrl = `https://${subdomain}.kommo.com/api/v4`;
  }

  async patchLead({ leadId, payload }: { leadId: string, payload: any }) {
    const url = `${this.baseUrl}/leads/${leadId}`;
    return ok(await fetch(url, { method: 'PATCH', headers: hdr(this.apiKey), body: JSON.stringify(payload) }), url);
  }

  async runSalesbot({ botId, leadId }: { botId: number, leadId: string }) {
    const url = `https://${this.subdomain}.kommo.com/api/v2/salesbot/run`;
    const body = [{ botConfigId: botId, entity_id: leadId, entity_type: '2' }];
    console.log('runSalesbot url and body', { url, body });
    return ok(await fetch(url, { method: 'POST', headers: hdr(this.apiKey), body: JSON.stringify(body) }), url);
  }

  async createContact({ body }: { body: any }): Promise<KommoCreateContactResponse> {
    const url = `${this.baseUrl}/contacts`;
    return ok(await fetch(url, { method: 'POST', headers: hdr(this.apiKey), body: JSON.stringify(body) }), url) as Promise<KommoCreateContactResponse>;
  }

  async createLead({ body }: { body: any }): Promise<KommoCreateLeadResponse> {
    const url = `${this.baseUrl}/leads`;
    return ok(await fetch(url, { method: 'POST', headers: hdr(this.apiKey), body: JSON.stringify(body) }), url) as Promise<KommoCreateLeadResponse>;
  }

  async searchContactByPhone({ phone }: { phone: string }): Promise<KommoSearchContactResponse | null> {
    const query = encodeURIComponent(phone);
    const url = `${this.baseUrl}/contacts?query=${query}&with=leads,catalog_elements&order[updated_at]=desc`;
    const res = await fetch(url, { headers: hdr(this.apiKey) });
    if (res.status === 204) return null;
    return ok(res, url) as Promise<KommoSearchContactResponse>;
  }

  async getLeadById({ leadId }: { leadId: string }): Promise<KommoGetLeadByIdResponse | null> {
    const url = `${this.baseUrl}/leads/${leadId}?with=contacts`;
    const res = await fetch(url, { headers: hdr(this.apiKey) });
    if (res.status === 204) return null;
    return ok(res, url) as Promise<KommoGetLeadByIdResponse>;
  }

  async fetchCustomFields(entityType: 'leads'): Promise<KommoLeadCustomFieldDefinition[]>;
  async fetchCustomFields(entityType: 'contacts'): Promise<KommoContactCustomFieldDefinition[]>;
  async fetchCustomFields(entityType: string): Promise<any[]> {
    if (this.fieldCache[entityType]) return this.fieldCache[entityType];
    const url = `${this.baseUrl}/${entityType}/custom_fields`;
    const res = await fetch(url, { headers: hdr(this.apiKey) });
    if (!res.ok) {
      throw new Error(`Error fetching ${entityType} custom fields: ${res.status}`);
    }
    const data: any = await res.json();
    this.fieldCache[entityType] = data._embedded?.custom_fields || [];
    return this.fieldCache[entityType];
  }

  async createTask({ body }: { body: any }) {
    const url = `${this.baseUrl}/tasks`;
    return ok(await fetch(url, { method: 'POST', headers: hdr(this.apiKey), body: JSON.stringify(body) }), url);
  }
}
