// infra/config.ts
export const STAGE = $app.stage;
export const IS_PROD = STAGE === "production";
export const IS_TEST = STAGE === "test";
export const IS_DEV  = !IS_PROD && !IS_TEST;

// sufijo que usarás para tablas, lambdas, buckets, etc.
export const SUFFIX = `-${STAGE}`;