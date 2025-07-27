// @clinickeys-agents/core/src/utils/MySQLHelpers.ts

import mysql, { Pool, PoolOptions } from "mysql2/promise";

// --- Inicializador singleton del pool ---
let pool: Pool | null = null;

export function createMySQLPool(config: PoolOptions): Pool {
  if (!pool) {
    pool = mysql.createPool(config);
    // Solo usar eventos soportados por mysql2/promise Pool
    // Nota: 'error' y 'connection' no están tipados en Pool de la versión 3.x+
    // Por robustez y para evitar el error de TypeScript, puedes ignorar el tipo con 'any'
    (pool as any).on("connection", async (connection: any) => {
      try {
        await connection.query("SET SESSION wait_timeout=28800");
        await connection.query("SET SESSION interactive_timeout=28800");
      } catch (err) {
        console.error("[ERROR] No se pudo configurar los timeouts de la sesión:", err);
      }
    });
    (pool as any).on("error", (err: any) => {
      console.error("[ERROR] Problema en el pool de conexiones:", err);
      pool = null;
    });
  }
  return pool;
}

export function getMySQLPool(): Pool {
  if (!pool) {
    throw new Error("MySQL pool no inicializado. Usa createMySQLPool primero.");
  }
  return pool;
}

/**
 * Ejecuta una consulta SQL con reintentos automáticos ante timeout de cliente.
 */
export async function ejecutarConReintento(
  consulta: string,
  parametros: any[] = [],
  reintentos = 3
): Promise<any[]> {
  const dbPool = getMySQLPool();
  for (let intento = 1; intento <= reintentos; intento++) {
    let conexion;
    try {
      conexion = await dbPool.getConnection();
      const [rows] = await conexion.execute(consulta, parametros);
      return rows as any[];
    } catch (error: any) {
      console.error(`Intento ${intento} falló:`, error);
      if (
        intento === reintentos ||
        error.code !== "ER_CLIENT_INTERACTION_TIMEOUT"
      ) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } finally {
      if (conexion) conexion.release();
    }
  }
  throw new Error("Fallo inesperado en reintentos de consulta SQL");
}

/**
 * Ejecuta una consulta SQL obteniendo una única fila (o null si no hay resultado).
 */
export async function ejecutarUnicoResultado(
  consulta: string,
  parametros: any[] = [],
  reintentos = 3
): Promise<any | null> {
  const rows = await ejecutarConReintento(consulta, parametros, reintentos);
  return rows[0] || null;
}

export { Pool } from "mysql2/promise";
