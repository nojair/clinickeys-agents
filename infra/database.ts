// infra/database.ts

import { SUFFIX } from "./config";

export const clinicsConfigTable = new sst.aws.Dynamo(`ClinicsConfigDynamo${SUFFIX}`, {
  fields: {
    /** Tipo de entidad para particionar todas las clínicas */
    entity: "string",
    /** Identificador único de la clínica */
    id_clinica: "string",
  },
  primaryIndex: {
    hashKey: "entity",
    rangeKey: "id_clinica",
  },
});
