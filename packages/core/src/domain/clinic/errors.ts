// packages/core/src/domain/clinic/errors.ts

/**
 * Errores específicos del dominio Clinic
 */

export class ClinicNotFoundError extends Error {
  constructor(id: number | string) {
    super(`No se encontró la clínica con id: ${id}`);
    this.name = 'ClinicNotFoundError';
  }
}

export class ClinicRepositoryError extends Error {
  constructor(message: string) {
    super(`Clinic repository error: ${message}`);
    this.name = 'ClinicRepositoryError';
  }
}
