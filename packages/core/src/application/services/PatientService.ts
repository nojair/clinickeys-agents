// @clinickeys-agents/core/src/application/services/PatientService.ts

import { IPatientRepository } from "@clinickeys-agents/core/domain/patient/IPatientRepository";
import { ISchedulingRepository } from "@clinickeys-agents/core/domain/scheduling/ISchedulingRepository";
import { DateTime } from "luxon";
import { parsePhoneNumberFromString } from "libphonenumber-js";

export interface GetPatientByPhoneOrCreateParams {
  nombre: string;
  apellido: string;
  telefono: string;
  id_clinica: number;
  id_super_clinica: number;
  kommo_lead_id: number;
}

export class PatientService {
  private readonly patientRepo: IPatientRepository;
  private readonly schedulingRepo: ISchedulingRepository;

  constructor(patientRepo: IPatientRepository, schedulingRepo: ISchedulingRepository) {
    this.patientRepo = patientRepo;
    this.schedulingRepo = schedulingRepo;
  }

  async findById(patientId: number): Promise<any | undefined> {
    return await this.patientRepo.findById(patientId);
  }

  async createPatient(params: GetPatientByPhoneOrCreateParams): Promise<any | undefined> {
    return await this.patientRepo.createPatient(params);
  }

  async getPatientByPhoneOrCreate(params: GetPatientByPhoneOrCreateParams) {
    let telefonoNacional = params.telefono;
    try {
      const phoneObj = parsePhoneNumberFromString(params.telefono);
      if (phoneObj) {
        telefonoNacional = phoneObj.nationalNumber;
      }
    } catch {
      // Si falla el parseo, usar el original
    }

    const pacienteExistente = await this.patientRepo.findByNationalPhoneAndClinic(
      telefonoNacional,
      Number(params.id_clinica)
    );
    if (pacienteExistente) return pacienteExistente;

    const id_paciente = await this.patientRepo.createPatient({
      nombre: params.nombre,
      apellido: params.apellido,
      telefono: params.telefono,
      id_clinica: params.id_clinica,
      id_super_clinica: params.id_super_clinica,
      kommo_lead_id: params.kommo_lead_id,
    });

    return { id_paciente, nombre: params.nombre, apellido: params.apellido, telefono: params.telefono };
  }

  /**
   * Orquesta la consulta completa de info de paciente, citas, packs y presupuestos.
   */
  async getPatientInfo(tiempoActualDT: DateTime, id_clinica: number, lead_phones: any): Promise<any> {
    // Validaciones mínimas
    if (!id_clinica) {
      return {
        success: false,
        message: "Falta id_clinica en la solicitud",
        paciente: {}, citas: [], packsBonos: [], presupuestos: []
      };
    }
    if (!lead_phones || typeof lead_phones !== "object") {
      return {
        success: true,
        message: "No se pudo encontrar el paciente",
        paciente: {}, citas: [], packsBonos: [], presupuestos: []
      };
    }
    // Seleccionar el teléfono en orden de prioridad
    let telefono = lead_phones.in_conversation?.trim() || lead_phones.in_field?.trim() || lead_phones.in_contact?.trim();
    if (!telefono) {
      return {
        success: true,
        message: "No se pudo encontrar el paciente",
        paciente: {}, citas: [], packsBonos: [], presupuestos: []
      };
    }
    // Extraer nacional
    let telefonoSinPrefijo = telefono;
    try {
      const phoneNumber = parsePhoneNumberFromString(telefono);
      if (phoneNumber) telefonoSinPrefijo = phoneNumber.nationalNumber;
    } catch (_) { }

    // Buscar paciente (solo activos)
    const paciente = await this.patientRepo.findByNationalPhoneAndClinic(telefonoSinPrefijo, id_clinica);
    if (!paciente) {
      return {
        success: true,
        message: "[ERROR_NO_PATIENT_FOUND] No se pudo encontrar el paciente",
        paciente: {}, citas: [], packsBonos: [], presupuestos: []
      };
    }
    const idPaciente = paciente.id_paciente;

    // Obtener presupuestos
    const presupuestos = await this.schedulingRepo.getPresupuestosByPacienteId(idPaciente, id_clinica);
    const presupuestosMapped = (presupuestos || []).map((p: any) => ({
      id_presupuesto: p.id_presupuesto,
      fecha: p.fecha,
      url_presupuesto: `https://clinickeys.com/clients/presupuesto/pdf-generate/?id_presupuesto=${p.id_presupuesto}`,
      monto_total: p.monto_total,
      monto_pagado: p.monto_pagado,
      saldo_pendiente: p.saldo_pendiente,
      id_tipo_pago: p.id_tipo_pago,
      nombre_tipo_pago: p.nombre_tipo_pago,
      nombre_estado: p.nombre_estado
    }));

    // Obtener citas futuras/activas
    const citasRaw = await this.schedulingRepo.getCitasByPacienteId(idPaciente, id_clinica);
    const citasFiltradas = (citasRaw || []).filter((cita: any) => {
      const fecha = cita.fecha_cita instanceof Date
        ? DateTime.fromJSDate(cita.fecha_cita).toISODate()
        : cita.fecha_cita;
      const hora = cita.hora_inicio || '00:00:00';
      const fechaHoraISO = `${fecha}T${hora}`;
      const zone = tiempoActualDT.zoneName ?? 'UTC';
      const citaDT = DateTime.fromISO(fechaHoraISO, { zone });
      return citaDT > tiempoActualDT;
    });
    const citas = citasFiltradas.map((cita: any) => ({
      id_cita: cita.id_cita,
      id_medico: cita.id_medico,
      id_tratamiento: cita.id_tratamiento,
      fecha_cita: cita.fecha_cita,
      hora_inicio: cita.hora_inicio,
      hora_fin: cita.hora_fin,
      id_espacio: cita.id_espacio,
      id_presupuesto: cita.id_presupuesto,
      id_pack_bono: cita.id_pack_bono,
      nombre_espacio: cita.nombre_espacio,
      nombre_tratamiento: cita.nombre_tratamiento,
      nombre_medico: cita.nombre_medico,
      apellido_medico: cita.apellido_medico
    }));

    // Packs/bonos: sesiones y detalles
    const packSesiones = await this.schedulingRepo.getPackBonosSesionesByPacienteId(idPaciente);
    const citasDetalle = await this.schedulingRepo.getCitasDetallePorPackTratamiento(idPaciente, id_clinica);
    const lookupCitas: Record<string, any[]> = {};
    (citasDetalle || []).forEach(row => {
      const key = `${row.id_pack_bono}_${row.id_tratamiento}`;
      if (!lookupCitas[key]) lookupCitas[key] = [];
      lookupCitas[key].push(row.id_cita);
    });
    const packsBonos = await Promise.all(
      (packSesiones || []).map(async (sesion: any) => {
        // Info pack bono
        const packBono = await this.schedulingRepo.getPackBonoById(sesion.id_pack_bono, id_clinica);
        if (!packBono) return null;
        // Tratamientos asociados
        const tratamientos = await this.schedulingRepo.getPackBonoTratamientos(sesion.id_pack_bono);
        const tratamientosConUso = (tratamientos || []).map((tratamiento: any) => {
          const key = `${sesion.id_pack_bono}_${tratamiento.id_tratamiento}`;
          const citas_id = lookupCitas[key] || [];
          const sesiones_usadas = citas_id.length;
          return {
            id_pack_bono: sesion.id_pack_bono,
            id_tratamiento: tratamiento.id_tratamiento,
            total_sesiones: tratamiento.total_sesiones,
            sesiones_usadas,
            citas_id
          };
        });
        const total_sesiones = tratamientosConUso.reduce((sum: number, t: any) => sum + Number(t.total_sesiones), 0);
        const total_sesiones_utilizadas = tratamientosConUso.reduce((sum: number, t: any) => sum + Number(t.sesiones_usadas), 0);
        return {
          packBono: {
            id_pack_bono: packBono.id_pack_bono,
            id_paciente: idPaciente,
            id_clinica: packBono.id_clinica,
            id_super_clinica: packBono.id_super_clinica,
            nombre: packBono.nombre,
            descripcion: packBono.descripcion,
            precio: packBono.precio,
            total_sesiones,
            total_sesiones_utilizadas,
            tratamientos: tratamientosConUso
          }
        };
      })
    );
    return {
      success: true,
      message: null,
      paciente,
      citas,
      packsBonos: packsBonos.filter(item => item !== null),
      presupuestos: presupuestosMapped
    };
  }
}
