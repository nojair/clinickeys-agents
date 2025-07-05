// packages/core/src/kommo/api.ts
const json = (r: any) => r.json();
const ok = async (r: any, url: any) => {
  if (!r.ok) throw r;
  return json(r);
};
const hdr = (t: any) => ({ 'Authorization': `Bearer ${t}`, 'Content-Type': 'application/json' });

export async function patchLead({ subdomain, token, leadId, payload }: any) {
  const url = `https://${subdomain}.kommo.com/api/v4/leads/${leadId}`;
  return ok(await fetch(url, { method: 'PATCH', headers: hdr(token), body: JSON.stringify(payload) }), url);
}

export async function runSalesbot({ subdomain, token, botId, leadId }: any) {
  const url = `https://${subdomain}.kommo.com/api/v2/salesbot/run`;
  const body = [{ bot_id: botId, entity_id: leadId, entity_type: '2' }];
  console.log('runSalesbot url and body', { url, body });
  return ok(await fetch(url, { method: 'POST', headers: hdr(token), body: JSON.stringify(body) }), url);
}

export async function createContact({ subdomain, token, body }: any) {
  const url = `https://${subdomain}.kommo.com/api/v4/contacts`;
  return ok(await fetch(url, { method: 'POST', headers: hdr(token), body: JSON.stringify(body) }), url);
}

export async function createLead({ subdomain, token, body }: any) {
  const url = `https://${subdomain}.kommo.com/api/v4/leads`;
  return ok(await fetch(url, { method: 'POST', headers: hdr(token), body: JSON.stringify(body) }), url);
}

export async function searchContactByPhone({ subdomain, token, phone }: any) {
  const query = encodeURIComponent(phone);
  const url   = `https://${subdomain}.kommo.com/api/v4/contacts?query=${query}&with=leads,catalog_elements&order[updated_at]=desc`;
  const res   = await fetch(url, { headers: hdr(token) });
  if (res.status === 204) return null;          // Kommo → sin contenido
  return ok(res, url);
}

export async function getLeadById({ subdomain, token, leadId }: any) {
  const url = `https://${subdomain}.kommo.com/api/v4/leads/${leadId}?with=contacts`;
  const res = await fetch(url, { headers: hdr(token) });
  if (res.status === 204) return null;
  return ok(res, url);
}