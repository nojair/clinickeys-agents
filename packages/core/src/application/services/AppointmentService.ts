// packages/core/src/application/services/AppointmentService.ts

import { AppointmentRepositoryMySQL, AppointmentCreateParams, AppointmentUpdateParams } from "@clinickeys-agents/core/infrastructure/appointment/AppointmentRepositoryMySQL";
import { AppError } from '@clinickeys-agents/core/utils';

export class AppointmentService {
  private appointmentRepository: AppointmentRepositoryMySQL;

  constructor(appointmentRepository: AppointmentRepositoryMySQL) {
    this.appointmentRepository = appointmentRepository;
  }

  async createAppointment(params: AppointmentCreateParams): Promise<number> {
    return await this.appointmentRepository.createAppointment(params);
  }

  async updateAppointment(params: AppointmentUpdateParams): Promise<void> {
    return await this.appointmentRepository.updateAppointment(params);
  }

  async getAppointmentsByPatient(patientId: number, clinicId: number): Promise<any[]> {
    return await this.appointmentRepository.getAppointmentsByPatient(patientId, clinicId);
  }

  async getAppointmentById(appointmentId: number): Promise<any | undefined> {
    return await this.appointmentRepository.findById(appointmentId);
  }

  async deleteAppointment(appointmentId: number): Promise<void> {
    return await this.appointmentRepository.deleteAppointment(appointmentId);
  }

  async cancelAppointment(appointmentId: number): Promise<any | undefined> {
    // Lógica de negocio: Cambiar estado a 'cancelado' y registrar motivo
    const appointment = await this.getAppointmentById(appointmentId);
    if (!appointment) {
      throw new AppError({
        code: 'ERR_APPOINTMENT_NOT_FOUND',
        humanMessage: `No se encontró la cita con id ${appointmentId}`,
        context: { appointmentId }
      });
    }
    const CANCELED_STATUS = 6; // Cambia este valor según tu catálogo de estados
    await this.updateAppointment({
      id_cita: appointmentId,
      id_estado_cita: CANCELED_STATUS,
    });
    return await this.getAppointmentById(appointmentId);
  }

  async insertarCitaPackBonos(params: {
    p_id_clinica: number,
    p_id_super_clinica: number,
    p_id_paciente: number,
    p_id_medico: number,
    p_id_espacio: number,
    p_id_tratamiento: number,
    p_id_presupuesto: number,
    p_id_pack_bono: number,
    p_fecha_cita: string,
    p_hora_inicio: string,
    p_hora_fin: string
  }): Promise<any> {
    return await this.appointmentRepository.insertarCitaPackBonos(params);
  }
}
