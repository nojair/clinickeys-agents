export interface Appointment {
  id_cita: number;
  id_paciente: number;
  id_clinica: number;
  id_super_clinica: number;
  id_medico: number;
  id_tratamiento: number;
  id_espacio: number;
  fecha_cita: string;
  hora_inicio: string;
  hora_fin: string;
  id_presupuesto?: number | null;
  id_pack_bono?: number | null;
  id_estado_cita?: number;
  // joins:
  nombre_espacio?: string;
  nombre_tratamiento?: string;
  nombre_medico?: string;
  apellido_medico?: string;
  [key: string]: any; // Para campos adicionales en joins
}

export interface AppointmentCreateParams {
  id_paciente: number;
  id_clinica: number;
  id_super_clinica: number;
  id_medico: number;
  id_tratamiento: number;
  id_espacio: number;
  fecha_cita: string;
  hora_inicio: string;
  hora_fin: string;
  id_presupuesto?: number | null;
  id_pack_bono?: number | null;
  [key: string]: any;
}

export interface AppointmentUpdateParams {
  id_cita: number;
  id_medico?: number;
  fecha_cita?: string;
  hora_inicio?: string;
  hora_fin?: string;
  id_espacio?: number;
  id_estado_cita?: number;
  [key: string]: any;
}

export interface InsertarCitaPackBonosParams {
  p_id_clinica: number;
  p_id_super_clinica: number;
  p_id_paciente: number;
  p_id_medico: number;
  p_id_espacio: number;
  p_id_tratamiento: number;
  p_id_presupuesto: number;
  p_id_pack_bono: number;
  p_fecha_cita: string;
  p_hora_inicio: string;
  p_hora_fin: string;
}

export interface IAppointmentRepository {
  createAppointment(params: AppointmentCreateParams): Promise<number>;
  updateAppointment(params: AppointmentUpdateParams): Promise<void>;
  getAppointmentsByPatient(patientId: number, clinicId: number): Promise<Appointment[]>;
  findById(id_cita: number): Promise<Appointment | undefined>;
  deleteAppointment(id_cita: number): Promise<void>;
  insertarCitaPackBonos(params: InsertarCitaPackBonosParams): Promise<any>;
  getCitasDetallePorPackTratamiento(id_paciente: number, id_clinica: number): Promise<any | undefined>;
}
