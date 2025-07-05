// infra/frontend.ts

import { clinicsConfigFunction } from "./lambdas";
import { SUFFIX } from "./config";

export const frontend = new sst.aws.Nextjs(`frontend${SUFFIX}`, {
  path: "packages/frontend",
  //domain: "my-app.com",
  environment: {
    NEXT_PUBLIC_API_URL: clinicsConfigFunction.url,
    NEXT_PUBLIC_STAGE: $app.stage
  }
});