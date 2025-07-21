// packages/core/src/domain/BotConfig/errors.ts

/**
 * Errores específicos del dominio BotConfig
 */

export class BotConfigNotFoundError extends Error {
  constructor(bot_config_id: string, id_clinica: number) {
    super(`No se encontró configuración del bot para bot_config_id: ${bot_config_id} y clínica: ${id_clinica}`);
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
  constructor(bot_config_id: string, id_clinica: number) {
    super(`No se pudo actualizar configuración del bot para bot_config_id: ${bot_config_id} y clínica: ${id_clinica}`);
    this.name = 'BotConfigUpdateError';
  }
}