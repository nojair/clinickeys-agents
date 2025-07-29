export interface PackBono {
  id_pack_bono: number;
  id_clinica: number;
  id_super_clinica: number;
  nombre: string;
  descripcion: string;
  precio: number;
}

export interface PackBonoTratamiento {
  id_pack_bono_tratamientos: number;
  id_pack_bono: number;
  id_par_tratamiento: number;
  id_tratamiento: number;
  total_sesiones: number;
}

export interface PackBonoSesion {
  // Asumes todas las columnas, puedes especificar más si quieres tipo exacto.
  [key: string]: any;
}

export interface IPackBonoRepository {
  /**
   * Obtiene todos los packs bono de una clínica.
   */
  getPackBonosByClinic(id_clinica: number): Promise<PackBono[]>;

  /**
   * Obtiene un pack bono por su ID y clínica.
   */
  getPackBonoById(id_pack_bono: number, id_clinica: number): Promise<PackBono | undefined>;

  /**
   * Obtiene todos los tratamientos asociados a un pack bono.
   */
  getPackBonoTratamientos(id_pack_bono: number): Promise<PackBonoTratamiento[]>;

  /**
   * Obtiene las sesiones de pack bono de un paciente.
   */
  getPackBonosSesionesByPacienteId(id_paciente: number): Promise<PackBonoSesion[]>;

  /**
   * Procesa el pack bono/presupuesto de una cita usando el stored procedure legacy.
   */
  procesarPackbonoPresupuestoDeCita(p_action: string, p_id_cita: number): Promise<any>;
}
