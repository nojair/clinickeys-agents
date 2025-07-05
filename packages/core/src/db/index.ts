// packages/core/src/db/index.ts

import mysql from 'mysql2/promise';

let pool: any;
const mySqlDbConfig = {
  host: process.env.CLINICS_DATA_DB_HOST || 'clinics_config',
  user: process.env.CLINICS_DATA_DB_USER || 'clinics_config',
  password: process.env.CLINICS_DATA_DB_PASSWORD || 'clinics_config',
  database: process.env.CLINICS_DATA_DB_NAME || 'clinics_config',
};

export function getPool () {
  if (!pool) {
    console.log('[DB] creando pool de conexiones MySQL', JSON.stringify(mySqlDbConfig, null, 2));
    pool = mysql.createPool({
      ...mySqlDbConfig,
      waitForConnections: true,
      connectionLimit: 10,
    });
  }
  return pool;
}