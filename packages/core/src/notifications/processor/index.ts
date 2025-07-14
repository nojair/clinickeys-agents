// packages/core/src/notifications/processor/index.ts

import { clinicNow, parseClinicDate, formatVisitDate, formatVisitStartTime } from '../../utils/date';
import { ensureLead } from '../../kommo/service';
import { patchLead, runSalesbot } from '../../kommo/api';
import { mark } from '../repository';
import { loadClinicFieldMappings, getLeadFieldId } from '../../kommo/fields';
import { getRelevantFields } from '../../config';
import { logger } from '../../utils/logger';

const PAYLOAD_FIELD_MAP: any = {
  clinicName: 'clinic_name',
  firstName: 'patient_firstname',
  lastName: 'patient_lastname',
  visitProvider: 'medic_full_name',
  visitTreatment: 'treatment_name',
  visitDate: 'visit_date',
  visitStartTime: 'visit_init_time',
  visitEndTime: 'visit_end_time',
  visitWeekDay: 'visit_week_day_name',
  visitSpace: 'visit_space_name',
};


export default async function processClinicBatch(clinicCfg: any, batch: any) {
  const tz = clinicCfg.timezone;
  const now = clinicNow(tz);
  const hourNow = now.hour;

  console.log('[PROCESS] Iniciando procesamiento de clínica', {
    id_clinica: clinicCfg.id_clinica,
    timezone: tz,
    notificaciones: batch.length,
    now: now.toISO(),
    hourNow
  });

  const { leadMap } = await loadClinicFieldMappings(clinicCfg);
  const { leadCustomFields } = getRelevantFields(clinicCfg?.fields_profile);

  for (const n of batch) {
    const progDate = parseClinicDate(n.fecha_envio_programada, tz).toISODate();

    console.log('[PROCESS] Analizando notificación', {
      id_notificacion: n.id_notificacion,
      telefono: n.telefono,
      progDate,
      hora_local: hourNow,
      mensaje: n.mensaje,
    });

    if (hourNow < 10) {
      console.log('[PENDIENTE] Hora local < 10:00, se mantiene pendiente', {
        hora_actual: hourNow,
        notificacion: n.id_notificacion
      });
      continue;
    }

    try {
      console.log('[ENVIANDO] Asegurando lead para paciente', {
        id_paciente: n.id_paciente,
        nombre: n.nombre,
        apellido: n.apellido,
        telefono: n.telefono,
      });

      const leadId = await ensureLead({
        clinicCfg,
        patient: n,
        mensaje: n.mensaje,
        id_notificacion: n.id_notificacion,
        payload: n.payload,
      });

      // Construir todos los custom fields dinámicamente
      logger.info('Actualizando lead', leadId, 'con leadCustomFields:', { leadCustomFields });
      const custom_fields_values = leadCustomFields
        .map((f: any) => {
          const field_id = getLeadFieldId(leadMap, f);
          if (!field_id) return undefined;
          let value = '';
          if (f.field_name === 'visitMessage') value = `${n.mensaje}`;
          else if (f.field_name === 'idNotification') value = `${n.id_notificacion}`;
          else if (PAYLOAD_FIELD_MAP[f.field_name] && n.payload && n.payload[PAYLOAD_FIELD_MAP[f.field_name]] !== undefined) {
            let raw = n.payload[PAYLOAD_FIELD_MAP[f.field_name]];
            if (f.field_name === 'visitDate') value = formatVisitDate(raw);
            else if (f.field_name === 'visitStartTime') value = formatVisitStartTime(raw);
            else value = `${raw}`;
          }
          else return undefined;
          return { field_id, values: [{ value }] };
        })
        .filter(Boolean);

      if (custom_fields_values.length > 0) {
        logger.info('Actualizando lead', leadId, 'con payload:', { custom_fields_values });

        await patchLead({
          subdomain: clinicCfg.subdomain,
          token: clinicCfg.api_key,
          leadId,
          payload: { custom_fields_values },
        });
      }

      console.log('[BOT] Ejecutando Salesbot', {
        botId: clinicCfg.id_salesbot,
        leadId
      });

      await runSalesbot({
        subdomain: clinicCfg.subdomain,
        token: clinicCfg.api_key,
        botId: clinicCfg.id_salesbot,
        leadId
      });

      await mark(n.id_notificacion, 'enviado');
      console.log('[ENVIADO] Notificación marcada como enviada', {
        id_notificacion: n.id_notificacion
      });
    } catch (err) {
      logger.error('Fallo al procesar notificación:', err);
      await mark(n.id_notificacion, 'fallido');
    }
  }

  console.log('[PROCESS] Finalizado lote para clínica', {
    id_clinica: clinicCfg.id_clinica
  });
}
