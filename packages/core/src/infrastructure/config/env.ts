// packages/core/src/infrastructure/config/env.ts

/**
 * Utilidad para acceder a variables de entorno desde el runtime del handler.
 * Todas las variables se leen directamente del process.env y se validan al momento de requerirse.
 * En SST V3, asegúrate de pasar explícitamente las envs necesarias desde la definición de la función.
 */

export function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`La variable de entorno '${name}' es requerida y no está definida.`);
  }
  return value;
}

/**
 * Ejemplo de uso en un handler:
 *
 * const dbHost = getEnvVar('DB_HOST');
 * const dbUser = getEnvVar('DB_USER');
 * // ...etc
 */
