// packages/core/src/application/usecases/GetKommoUsersUseCase.ts

import type { KommoRepository } from "@clinickeys-agents/core/infrastructure/kommo";
import type { KommoUsersResponse } from "@clinickeys-agents/core/infrastructure/integrations/kommo";

export interface GetKommoUsersUseCaseProps {
  kommoRepo: KommoRepository;
}

export class GetKommoUsersUseCase {
  private readonly kommoRepo: KommoRepository;

  constructor(props: GetKommoUsersUseCaseProps) {
    this.kommoRepo = props.kommoRepo;
  }

  /**
   * Devuelve los usuarios de la cuenta Kommo asociada al repo.
   */
  async execute(): Promise<KommoUsersResponse["_embedded"]["users"]> {
    const result = await this.kommoRepo.getUsers();
    if (!result || !result._embedded || !Array.isArray(result._embedded.users)) {
      throw new Error("No users found or invalid Kommo response");
    }
    return result._embedded.users;
  }
}
