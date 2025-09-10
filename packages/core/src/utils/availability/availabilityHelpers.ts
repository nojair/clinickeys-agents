// packages/core/src/utils/availability/availabilityHelpers.ts

/**
 * Genera una consulta SQL para distintos tipos de tablas de agenda (citas, programación de médicos, espacios, médico-espacio).
 * 
 * @param nombreTabla         "citas" | "prog_medicos" | "prog_espacios" | "prog_medico_espacio"
 * @param listaFechas         Array de objetos { fecha: string }
 * @param listaIdMedicos      Array de IDs de médico
 * @param listaIdEspacios     Array de IDs de espacio
 * @param idClinica           ID de la clínica
 * @returns                   SQL string para consulta parametrizada
 */
function generarConsultaSQL({
  nombreTabla,
  listaFechas,
  listaIdMedicos = [],
  listaIdEspacios = [],
  idClinica,
}: {
  nombreTabla: string;
  listaFechas: { fecha: string }[];
  listaIdMedicos?: number[];
  listaIdEspacios?: number[];
  idClinica: number;
}): string {
  const condicionesTiempo = listaFechas.map((fechaObj) =>
    nombreTabla === "citas"
      ? `(fecha_cita = '${fechaObj.fecha}')`
      : `('${fechaObj.fecha}' BETWEEN fecha_inicio AND fecha_fin)`
  );

  const condicionesIds: string[] = [];
  if (
    listaIdMedicos.length > 0 &&
    ["citas", "prog_medicos", "prog_medico_espacio"].includes(nombreTabla)
  ) {
    condicionesIds.push(`id_medico IN (${listaIdMedicos.join(", ")})`);
  }
  if (
    listaIdEspacios.length > 0 &&
    ["citas", "prog_espacios", "prog_medico_espacio"].includes(nombreTabla)
  ) {
    condicionesIds.push(`id_espacio IN (${listaIdEspacios.join(", ")})`);
  }

  const condicionesClinica = [`id_clinica = ${idClinica}`];
  const condicionesEstado =
    nombreTabla === "citas" ? ["id_estado_cita IN (1, 4, 7, 8, 9)"] : [];

  // Combinar todas las condiciones
  const whereConditions = [
    `(\n  ${condicionesTiempo.join(" OR\n  ")}\n)`,
    ...(condicionesIds.length > 0
      ? [`(\n  ${condicionesIds.join(" OR ")}\n)`]
      : []),
    `(\n  ${condicionesClinica.join(" AND ")}\n)`,
    ...(condicionesEstado.length > 0
      ? [`(\n  ${condicionesEstado.join(" AND ")}\n)`]
      : []),
  ];

  return `
SELECT *
FROM ${nombreTabla}
WHERE
  ${whereConditions.join(" AND\n  ")}
`.trim();
}

/**
 * Genera el set completo de consultas SQL para obtener citas y programaciones por fechas y recursos.
 * 
 * @param fechas      Array de fechas [{fecha: string}]
 * @param id_medicos  Array de IDs de médico
 * @param id_espacios Array de IDs de espacio
 * @param id_clinica  ID clínica
 * @returns           Objeto con SQLs para cada consulta clave
 */
export function generarConsultasSQL({
  fechas,
  id_medicos,
  id_espacios,
  id_clinica,
}: {
  fechas: { fecha: string }[];
  id_medicos: number[];
  id_espacios: number[];
  id_clinica: number;
}): {
  sql_citas: string;
  sql_prog_medicos: string;
  sql_prog_espacios: string;
  sql_prog_medico_espacio: string;
} {
  if (!fechas || !id_clinica) {
    throw new Error("Los campos 'fechas' e 'id_clinica' son obligatorios.");
  }

  return {
    sql_citas: generarConsultaSQL({
      nombreTabla: "citas",
      listaFechas: fechas,
      listaIdMedicos: id_medicos || [],
      listaIdEspacios: id_espacios || [],
      idClinica: id_clinica,
    }),
    sql_prog_medicos: generarConsultaSQL({
      nombreTabla: "prog_medicos",
      listaFechas: fechas,
      listaIdMedicos: id_medicos || [],
      listaIdEspacios: [],
      idClinica: id_clinica,
    }),
    sql_prog_espacios: generarConsultaSQL({
      nombreTabla: "prog_espacios",
      listaFechas: fechas,
      listaIdMedicos: [],
      listaIdEspacios: id_espacios || [],
      idClinica: id_clinica,
    }),
    sql_prog_medico_espacio: generarConsultaSQL({
      nombreTabla: "prog_medico_espacio",
      listaFechas: fechas,
      listaIdMedicos: id_medicos || [],
      listaIdEspacios: id_espacios || [],
      idClinica: id_clinica,
    }),
  };
}