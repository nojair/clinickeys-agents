// sst.config.ts

/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: `clinickeys-agents-${input.stage}`,
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
    };
  },
  console: {
    autodeploy: {
      target(event) {
        if (event.type === "branch" && event.branch === "main" && event.action === "pushed") {
          return { stage: "production" };
        } else if (event.type === "branch" && event.branch === "test" && event.action === "pushed") {
          return { stage: "testing" };
        }

        return;
      },
    }
  },
  async run() {
    const databases = await import("./infra/database");
    await import("./infra/cron");
    await import("./infra/frontend");
    await import("./infra/lambdas");

    return {
      ClinicsTable: databases.clinicsConfigTable.name,
    };
  },
});
