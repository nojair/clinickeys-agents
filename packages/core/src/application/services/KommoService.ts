// packages/core/src/application/services/KommoService.ts

import { KommoApiGateway, getLeadFieldId, getContactFieldData } from '@clinickeys-agents/core/infrastructure/integrations/kommo';
import type { KommoLeadCustomField } from '@clinickeys-agents/core/infrastructure/integrations/kommo';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { formatVisitDate, formatVisitTime } from '@clinickeys-agents/core/utils/date';
import { getKommoMapFields, getKommoRelevantFields } from '@clinickeys-agents/core/utils/helpers';
import { PAYLOAD_FIELD_MAP } from '@clinickeys-agents/core/utils/constants';
import type { Pool } from 'mysql2/promise';

interface EnsureLeadParams {
  clinicCfg: any; // Considera definir un tipo específico si es posible
  patient: any;
  mensaje: string;
  id_notificacion: number;
  payload: any;
}

export class KommoService {
  private gateway: KommoApiGateway;
  private pool?: Pool;
  private clinicFieldCache: { leadMap: any; contactMap: any } | null = null;

  constructor(gateway: KommoApiGateway, pool?: Pool) {
    this.gateway = gateway;
    this.pool = pool;
  }

  private async loadClinicFieldMappings(clinicCfg: { subdomain: string; api_key: string }) {
    if (this.clinicFieldCache) return this.clinicFieldCache;
    const [leadFields, contactFields] = await Promise.all([
      this.gateway.fetchCustomFields('leads'),
      this.gateway.fetchCustomFields('contacts')
    ]);
    const leadMap = getKommoMapFields(leadFields);
    const contactMap = getKommoMapFields(contactFields);
    this.clinicFieldCache = { leadMap, contactMap };
    return this.clinicFieldCache;
  }

  public async getClinicFieldMappings(clinicCfg: { subdomain: string; api_key: string }): Promise<{ leadMap: any; contactMap: any }> {
    return this.loadClinicFieldMappings(clinicCfg);
  }

  /**
   * Asegura que el lead y contacto existan en Kommo y la BD, o los crea si faltan.
   */
  async ensureLead({ clinicCfg, patient, mensaje, id_notificacion, payload }: EnsureLeadParams): Promise<string> {
    if (!this.pool) {
      throw new Error("MySQL pool is required for ensureLead");
    }
    const phoneIntl = (() => {
      const p = parsePhoneNumberFromString(patient.telefono ?? '', clinicCfg.default_country);
      const num = p ? p.number : patient.telefono;
      console.log('[ensureLead] teléfono normalizado', { original: patient.telefono, normalizado: num });
      return num;
    })();
    console.log('[KommoService.ensureLead] teléfono normalizado', { original: patient.telefono, normalizado: phoneIntl });

    const [rows] = await this.pool.query(
      'SELECT kommo_lead_id FROM pacientes WHERE id_paciente=?',
      [patient.id_paciente],
    );
    const row = (rows as { kommo_lead_id?: string }[])[0] ?? null;
    console.log('[KommoService.ensureLead] lead ID en BD', { bd_lead_id: row?.kommo_lead_id });

    if (row?.kommo_lead_id) {
      const okLead = await this.gateway.getLeadById({ leadId: row.kommo_lead_id })
      if (okLead) {
        console.log('[KommoService.ensureLead] lead válido en Kommo — FIN', { leadId: row.kommo_lead_id });
        return row.kommo_lead_id;
      }
      console.log('[KommoService.ensureLead] lead NO existe en Kommo — se recreará');
    }

    let contactId: string | undefined;
    let leadId: string | undefined;

    const found = await this.gateway.searchContactByPhone({ phone: phoneIntl });
    if (found && found._embedded?.contacts?.length) {
      const contact = found._embedded.contacts[0];
      contactId = contact.id;
      if (contact._embedded?.leads?.length) {
        leadId = contact._embedded.leads[0].id;
      }
      console.log('[KommoService.ensureLead] contacto EXISTENTE', { contactId, leadId });
    } else {
      console.log('[KommoService.ensureLead] contacto NO encontrado');
    }

    const { leadMap, contactMap } = await this.loadClinicFieldMappings(clinicCfg);
    const { addingKommoContactFields, kommoLeadCustomFields } = getKommoRelevantFields(clinicCfg.fields_profile);

    if (!contactId) {
      const contactPayload = [
        {
          name: `${patient.nombre} ${patient.apellido}`,
          custom_fields_values: addingKommoContactFields.map((f: any) => {
            const fieldData = getContactFieldData(contactMap, f);
            if (!fieldData) return undefined;
            return {
              field_id: fieldData.field_id,
              values: [{ value: phoneIntl, enum_id: fieldData.enum_id }]
            };
          }).filter(Boolean),
        },
      ];
      let contactRes;
      try {
        contactRes = await this.gateway.createContact({ body: contactPayload });
      } catch (e: any) {
        console.error('[KommoService.ensureLead][ERROR] Fallo creando contacto', { error: e.message, stack: e.stack });
        throw e;
      }
      contactId = contactRes?._embedded?.contacts?.[0]?.id;
      if (!contactId) {
        throw new Error('[KommoService.ensureLead] No se pudo obtener el contactId después de crear el contacto');
      }
      console.log('[KommoService.ensureLead] contacto creado', { contactId });
    }

    if (!leadId) {
      const leadPayload = [
        {
          name: `${patient.nombre} ${patient.apellido}`,
          _embedded: { contacts: [{ id: contactId, is_main: true }] },
          custom_fields_values: kommoLeadCustomFields.map((f: any) => {
            const field_id = getLeadFieldId(leadMap, f);
            if (!field_id) return undefined;
            let value = '';
            if (f.field_name === 'visitMessage') value = `${mensaje}`;
            else if (f.field_name === 'idNotification') value = `${id_notificacion}`;
            else if (PAYLOAD_FIELD_MAP[f.field_name] && payload && payload[PAYLOAD_FIELD_MAP[f.field_name]] !== undefined) {
              let raw = payload[PAYLOAD_FIELD_MAP[f.field_name]];
              if (f.field_name === 'visitDate') value = formatVisitDate(raw);
              else if (f.field_name === 'visitStartTime') value = formatVisitTime(raw);
              else if (f.field_name === 'visitEndTime') value = formatVisitTime(raw);
              else value = `${raw}`;
            } else return undefined;
            return { field_id, values: [{ value }] };
          }).filter(Boolean),
        },
      ];
      let leadRes;
      try {
        leadRes = await this.gateway.createLead({ body: leadPayload });
      } catch (e: any) {
        console.error('[KommoService.ensureLead][ERROR] Fallo creando lead', { error: e.message, stack: e.stack });
        throw e;
      }
      leadId = leadRes?._embedded?.leads?.[0]?.id;
      if (!leadId) {
        throw new Error('[KommoService.ensureLead] No se pudo obtener el leadId después de crear el lead');
      }
      console.log('[KommoService.ensureLead] lead creado', { leadId });
    }

    try {
      await this.pool.execute(
        'UPDATE pacientes SET kommo_lead_id=? WHERE id_paciente=?',
        [leadId, patient.id_paciente],
      );
      console.log('[KommoService.ensureLead] BD actualizada con nuevo leadId', { leadId });
    } catch (e: any) {
      console.error('[KommoService.ensureLead][ERROR] Fallo al actualizar la BD', { error: e.message, stack: e.stack });
    }

    console.log('[KommoService.ensureLead] <<< FIN OK', { leadId });
    return leadId;
  }

  /**
   * Actualiza los custom fields dinámicos de un lead en Kommo.
   */
  async updateLeadCustomFields({ clinicCfg, leadId, notification }: { clinicCfg: any, leadId: string, notification: any }) {
    const { leadMap } = await this.loadClinicFieldMappings(clinicCfg);
    const { kommoLeadCustomFields } = getKommoRelevantFields(clinicCfg.fields_profile);
    const custom_fields_values = kommoLeadCustomFields
      .map((f: any) => {
        const field_id = getLeadFieldId(leadMap, f);
        if (!field_id) return undefined;
        let value = '';
        if (f.field_name === 'visitMessage') value = `${notification.mensaje}`;
        else if (f.field_name === 'idNotification') value = `${notification.id_notificacion}`;
        else if (PAYLOAD_FIELD_MAP[f.field_name] && notification.payload && notification.payload[PAYLOAD_FIELD_MAP[f.field_name]] !== undefined) {
          let raw = notification.payload[PAYLOAD_FIELD_MAP[f.field_name]];
          if (f.field_name === 'visitDate') value = formatVisitDate(raw);
          else if (f.field_name === 'visitStartTime') value = formatVisitTime(raw);
          else if (f.field_name === 'visitEndTime') value = formatVisitTime(raw);
          else value = `${raw}`;
        }
        else return undefined;
        return { field_id, values: [{ value }] };
      })
      .filter(Boolean);

    if (custom_fields_values.length > 0) {
      await this.gateway.patchLead({
        leadId,
        payload: { custom_fields_values },
      });
      console.log('[KommoService.updateLeadCustomFields] Lead actualizado', { leadId, custom_fields_values });
    }
  }

  async getKommoLeadsCustomFields(configFields: string[]): Promise<KommoLeadCustomField[]> {
    const fetchedFields = await this.gateway.fetchCustomFields('leads')
    const namesSet = new Set(fetchedFields.map((field: any) => field.name));
    return configFields.map((name) => ({ field_name: name, exists: namesSet.has(name) }));
  }
}
