// packages/core/src/domain/botConfig/errors.ts

/**
 * Errores específicos del dominio BotConfig
 */

export class BotConfigNotFoundError extends Error {
  constructor(botConfigId: string, clinicId: number) {
    super(`No se encontró configuración del bot para botConfigId: ${botConfigId} y clínica: ${clinicId}`);
    this.name = 'BotConfigNotFoundError';
  }
}

export class BotConfigRepositoryError extends Error {
  constructor(message: string) {
    super(`BotConfig repository error: ${message}`);
    this.name = 'BotConfigRepositoryError';
  }
}

export class BotConfigUpdateError extends Error {
  constructor(botConfigId: string, clinicId: number) {
    super(`No se pudo actualizar configuración del bot para botConfigId: ${botConfigId} y clínica: ${clinicId}`);
    this.name = 'BotConfigUpdateError';
  }
}