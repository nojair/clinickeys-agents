// packages/core/src/application/services/PackBonoService.ts

import { IPackBonoRepository } from "@clinickeys-agents/core/domain/packBono";

export class PackBonoService {
  private packBonoRepository: IPackBonoRepository;

  constructor(packBonoRepository: IPackBonoRepository) {
    this.packBonoRepository = packBonoRepository;
  }

  async getPackBonosByClinic(id_clinica: number): Promise<any[]> {
    return await this.packBonoRepository.getPackBonosByClinic(id_clinica);
  }

  async getPackBonoById(id_pack_bono: number, id_clinica: number): Promise<any | undefined> {
    return await this.packBonoRepository.getPackBonoById(id_pack_bono, id_clinica);
  }

  async getPackBonoTratamientos(id_pack_bono: number): Promise<any[]> {
    return await this.packBonoRepository.getPackBonoTratamientos(id_pack_bono);
  }

  async getPackBonosSesionesByPacienteId(id_paciente: number): Promise<any[]> {
    return await this.packBonoRepository.getPackBonosSesionesByPacienteId(id_paciente);
  }

  async procesarPackbonoPresupuestoDeCita(action: string, appointmentId: number): Promise<any> {
    return await this.packBonoRepository.procesarPackbonoPresupuestoDeCita(action, appointmentId);
  }
}
