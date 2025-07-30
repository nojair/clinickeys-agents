export interface MedicoDTO {
  id_medico: number;
  nombre_medico: string;
  apellido_medico: string;
  colegiatura?: string;
  email?: string;
  telefono?: string;
  especialidad?: string;
  id_estado_registro?: number;
  id_clinica?: number;
  id_super_clinica?: number;
}