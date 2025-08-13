// packages/core/src/interface/controllers/KommoUsersController.ts

import type { GetKommoUsersUseCase } from "@clinickeys-agents/core/application/usecases/GetKommoUsersUseCase";

export class KommoUsersController {
  private readonly getKommoUsersUseCase: GetKommoUsersUseCase;

  constructor(getKommoUsersUseCase: GetKommoUsersUseCase) {
    this.getKommoUsersUseCase = getKommoUsersUseCase;
  }

  /**
   * Devuelve la lista de usuarios de Kommo de la cuenta indicada.
   */
  async getUsers() {
    // El usecase ya instancia el repo con el gateway correcto
    return this.getKommoUsersUseCase.execute();
  }
}
