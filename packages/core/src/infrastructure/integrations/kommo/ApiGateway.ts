import { ok, hdr } from "@clinickeys-agents/core/utils";

export interface KommoApiGatewayOptions {
  apiKey: string;
  subdomain: string;
}

export class KommoApiGateway {
  private apiKey: string;
  private subdomain: string;
  private baseUrl: string;
  private fieldCache: Record<string, any> = {};

  constructor({ apiKey, subdomain }: KommoApiGatewayOptions) {
    this.apiKey = apiKey;
    this.subdomain = subdomain;
    this.baseUrl = `https://${subdomain}.kommo.com/api/v4`;
  }

  async patchLead({ leadId, payload }: { leadId: string, payload: any }) {
    const url = `${this.baseUrl}/leads/${leadId}`;
    return ok(await fetch(url, { method: 'PATCH', headers: hdr(this.apiKey), body: JSON.stringify(payload) }), url);
  }

  async runSalesbot({ botId, leadId }: { botId: string, leadId: string }) {
    const url = `https://${this.subdomain}.kommo.com/api/v2/salesbot/run`;
    const body = [{ bot_config_id: botId, entity_id: leadId, entity_type: '2' }];
    console.log('runSalesbot url and body', { url, body });
    return ok(await fetch(url, { method: 'POST', headers: hdr(this.apiKey), body: JSON.stringify(body) }), url);
  }

  async createContact({ body }: { body: any }) {
    const url = `${this.baseUrl}/contacts`;
    return ok(await fetch(url, { method: 'POST', headers: hdr(this.apiKey), body: JSON.stringify(body) }), url);
  }

  async createLead({ body }: { body: any }) {
    const url = `${this.baseUrl}/leads`;
    return ok(await fetch(url, { method: 'POST', headers: hdr(this.apiKey), body: JSON.stringify(body) }), url);
  }

  async searchContactByPhone({ phone }: { phone: string }) {
    const query = encodeURIComponent(phone);
    const url = `${this.baseUrl}/contacts?query=${query}&with=leads,catalog_elements&order[updated_at]=desc`;
    const res = await fetch(url, { headers: hdr(this.apiKey) });
    if (res.status === 204) return null;
    return ok(res, url);
  }

  async getLeadById({ leadId }: { leadId: string }) {
    const url = `${this.baseUrl}/leads/${leadId}?with=contacts`;
    const res = await fetch(url, { headers: hdr(this.apiKey) });
    if (res.status === 204) return null;
    return ok(res, url);
  }

  async fetchCustomFields(entityType: string) {
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
}
