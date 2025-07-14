// packages/core/src/kommo/service.ts

import { getPool } from '../db';
import {
  createContact,
  createLead,
  searchContactByPhone,
  getLeadById,
} from './api';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { loadClinicFieldMappings, getLeadFieldId, getContactFieldData } from './fields';
import { getRelevantFields } from '../config';
import { formatVisitDate, formatVisitTime } from '../utils/date';

// Mapeo de field_name Kommo -> clave en el payload
const PAYLOAD_FIELD_MAP: any = {
  visitTreatment: 'treatment_name',
  visitProvider: 'medic_full_name',
  visitStartTime: 'visit_init_time',
  visitDate: 'visit_date',
};

export async function ensureLead({ clinicCfg, patient, mensaje, id_notificacion, payload }: any) {
  // 1. Normalizar teléfono
  const phoneIntl = (() => {
    const p = parsePhoneNumberFromString(patient.telefono ?? '', clinicCfg.default_country);
    const num = p ? p.number : patient.telefono;
    console.log('[ensureLead] teléfono normalizado', { original: patient.telefono, normalizado: num });
    return num;
  })();

  const pool = getPool();

  // 2. Consultar kommo_lead_id guardado en BD
  const [[row]] = await pool.query(
    'SELECT kommo_lead_id FROM pacientes WHERE id_paciente=?',
    [patient.id_paciente],
  );
  console.log('[ensureLead] lead ID en BD', { bd_lead_id: row?.kommo_lead_id });

  if (row?.kommo_lead_id) {
    console.log('[ensureLead] verificando existencia del lead en Kommo…');
    const okLead = await getLeadById({
      subdomain: clinicCfg.subdomain,
      token: clinicCfg.api_key,
      leadId: row.kommo_lead_id,
    });
    if (okLead) {
      console.log('[ensureLead] lead válido en Kommo — FIN', { leadId: row.kommo_lead_id });
      return row.kommo_lead_id;
    }
    console.log('[ensureLead] lead NO existe en Kommo — se recreará');
  }

  // 3. Buscar contacto por teléfono
  console.log('[ensureLead] buscando contacto por teléfono en Kommo…', { phoneIntl });
  let contactId, leadId;

  const found = await searchContactByPhone({
    subdomain: clinicCfg.subdomain,
    token: clinicCfg.api_key,
    phone: phoneIntl,
  });
  console.log('[ensureLead] resultado searchContactByPhone', JSON.stringify(found));

  if (found && found._embedded?.contacts?.length) {
    const contact = found._embedded.contacts[0];
    contactId = contact.id;
    console.log('[ensureLead] contacto EXISTENTE', { contactId });
    if (contact._embedded?.leads?.length) {
      leadId = contact._embedded.leads[0].id;
      console.log('[ensureLead] lead existía en contacto', { leadId });
    }
  } else {
    console.log('[ensureLead] contacto NO encontrado');
  }

  // Mapeos y configuración dinámica de fields
  const { leadMap, contactMap } = await loadClinicFieldMappings(clinicCfg);
  const { addingContactFields, leadCustomFields } = getRelevantFields(clinicCfg?.fields_profile);

  // 4. Crear contacto si no existe
  if (!contactId) {
    console.log('[ensureLead] creando NUEVO contacto…');
    const contactPayload = [
      {
        name: `${patient.nombre} ${patient.apellido}`,
        custom_fields_values: addingContactFields.map((f: any) => {
          const fieldData = getContactFieldData(contactMap, f);
          if (!fieldData) {
            console.warn('[ensureLead] Contact custom field no encontrado', { f });
            return undefined;
          }
          return {
            field_id: fieldData.field_id,
            values: [{ value: phoneIntl, enum_id: fieldData.enum_id }]
          };
        }).filter(Boolean),
      },
    ];
    console.log('[ensureLead] contactPayload', JSON.stringify(contactPayload, null, 2));
    let contactRes;
    try {
      contactRes = await createContact({
        subdomain: clinicCfg.subdomain,
        token: clinicCfg.api_key,
        body: contactPayload,
      });
      console.log('[ensureLead] contacto creado', JSON.stringify(contactRes));
    } catch (e: any) {
      console.error('[ensureLead][ERROR] Fallo creando contacto', { error: e.message, stack: e.stack });
      throw e;
    }
    contactId = contactRes._embedded.contacts[0].id;
    console.log('[ensureLead] contactId usado en lead', { contactId });
  }

  // 5. Crear lead si no existe
  if (!leadId) {
    console.log('[ensureLead] creando NUEVO lead…');
    const leadPayload = [
      {
        name: `${patient.nombre} ${patient.apellido}`,
        _embedded: { contacts: [{ id: contactId, is_main: true }] },
        custom_fields_values: leadCustomFields.map((f: any) => {
          const field_id = getLeadFieldId(leadMap, f);
          if (!field_id) {
            console.warn('[ensureLead] Lead custom field no encontrado', { f });
            return undefined;
          }
          let value = '';
          if (f.field_name === 'visitMessage') value = `${mensaje}`;
          else if (f.field_name === 'idNotification') value = `${id_notificacion}`;
          else if (PAYLOAD_FIELD_MAP[f.field_name] && payload && payload[PAYLOAD_FIELD_MAP[f.field_name]] !== undefined) {
            let raw = payload[PAYLOAD_FIELD_MAP[f.field_name]];
            if (f.field_name === 'visitDate') value = formatVisitDate(raw);
            else if (f.field_name === 'visitStartTime') value = formatVisitTime(raw);
            else value = `${raw}`;
          }
          else return undefined;
          return { field_id, values: [{ value }] };
        }).filter(Boolean),
      },
    ];
    console.log('[ensureLead] leadPayload', JSON.stringify(leadPayload, null, 2));
    let leadRes;
    try {
      leadRes = await createLead({
        subdomain: clinicCfg.subdomain,
        token: clinicCfg.api_key,
        body: leadPayload,
      });
      console.log('[ensureLead] lead creado', JSON.stringify(leadRes));
    } catch (e: any) {
      // Extra: imprime body del error si viene de Kommo
      if (e && e.message) console.error('[ensureLead][ERROR] Fallo creando lead', { error: e.message, stack: e.stack });
      else console.error('[ensureLead][ERROR] Fallo creando lead', e);
      throw e;
    }
    leadId = leadRes._embedded.leads[0].id;
    console.log('[ensureLead] leadId creado y listo para guardar', { leadId });
  }

  // 6. Guardar leadId en la BD
  try {
    await pool.execute(
      'UPDATE pacientes SET kommo_lead_id=? WHERE id_paciente=?',
      [leadId, patient.id_paciente],
    );
    console.log('[ensureLead] BD actualizada con nuevo leadId', { leadId });
  } catch (e: any) {
    console.error('[ensureLead][ERROR] Fallo al actualizar la BD', { error: e.message, stack: e.stack });
  }

  console.log('[ensureLead] <<< FIN OK', { leadId });
  return leadId;
}
