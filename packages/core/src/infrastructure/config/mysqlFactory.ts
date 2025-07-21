// packages/core/src/infrastructure/config/mysqlFactory.ts

import mysql, { Pool, PoolOptions } from "mysql2/promise";

/**
 * Fábrica para crear un pool de conexiones MySQL.
 * Los valores de conexión deben ser recibidos por parámetro (no por import global de env).
 */
export function createMySQLPool(options: PoolOptions): Pool {
  return mysql.createPool(options);
}

/**
 * Ejemplo de uso en un handler:
 *
 * const pool = createMySQLPool({
 *   host: process.env.DB_HOST!,
 *   user: process.env.DB_USER!,
 *   password: process.env.DB_PASSWORD!,
 *   database: process.env.DB_NAME!,
 * });
 */
