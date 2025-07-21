// infra/config.ts
export const STAGE = $app.stage;
export const IS_PROD = STAGE === "production";
export const IS_TEST = STAGE === "test";
export const IS_DEV  = !IS_PROD && !IS_TEST;

// sufijo que usarás para tablas, lambdas, buckets, etc.
export const SUFFIX = `-${STAGE}`;

export const ENVIRONMENT = {
  CLINICS_DATA_DB_PASSWORD: process.env.CLINICS_DATA_DB_PASSWORD,
  CLINICS_DATA_DB_HOST: process.env.CLINICS_DATA_DB_HOST,
  CLINICS_DATA_DB_USER: process.env.CLINICS_DATA_DB_USER,
  CLINICS_DATA_DB_NAME: process.env.CLINICS_DATA_DB_NAME,
  CLINICS_DATA_DB_PORT: process.env.CLINICS_DATA_DB_PORT,
}