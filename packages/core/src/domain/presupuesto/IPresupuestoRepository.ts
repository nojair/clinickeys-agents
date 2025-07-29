export interface Presupuesto {
  id_presupuesto: number;
  fecha: string; // ISO date string (YYYY-MM-DD)
  monto_total: number;
  monto_pagado: number;
  saldo_pendiente: number;
  id_tipo_pago: number;
  nombre_tipo_pago: string;
  nombre_estado: string;
}

export interface CreatePresupuestoParams {
  id_paciente: number;
  id_clinica: number;
  fecha: string; // ISO date string (YYYY-MM-DD)
  monto_total: number;
  monto_pagado: number;
  saldo_pendiente: number;
  id_tipo_pago: number;
  id_estado: number;
}

export interface IPresupuestoRepository {
  /**
   * Obtiene todos los presupuestos pendientes de un paciente en una clínica.
   */
  getPresupuestosByPacienteId(id_paciente: number, id_clinica: number): Promise<Presupuesto[]>;

  /**
   * Obtiene un presupuesto por su ID y clínica.
   */
  getPresupuestoById(id_presupuesto: number, id_clinica: number): Promise<Presupuesto | undefined>;

  /**
   * Crea un presupuesto nuevo.
   */
  createPresupuesto(params: CreatePresupuestoParams): Promise<number>;
}
