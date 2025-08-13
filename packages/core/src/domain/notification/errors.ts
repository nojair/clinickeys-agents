// packages/core/src/domain/notification/errors.ts

/**
 * Errores específicos del dominio Notification
 */

export class NotificationNotFoundError extends Error {
  constructor(id_clinica: number) {
    super(`No se encontró notificaciones para la id clinica: ${id_clinica}`);
    this.name = 'NotificationNotFoundError';
  }
}

export class NotificationStateUpdateError extends Error {
  constructor(id_notificacion: number, estado: string) {
    super(`No se pudo actualizar el estado de la notificación ${id_notificacion} a ${estado}`);
    this.name = 'NotificationStateUpdateError';
  }
}
