export interface MedicoDTO {
  id_medico: number;
  nombre_medico: string;
  id_estado_registro?: number;
  id_clinica?: number;
  id_super_clinica?: number;
}