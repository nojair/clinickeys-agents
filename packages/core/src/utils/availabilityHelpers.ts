// packages/core/src/utils/availabilityHelpers.ts

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

// packages/core/src/utils/availability/calcularDisponibilidad.ts

/**
 * Calcula las disponibilidades combinando la programación de médicos, espacios y citas bloqueantes.
 * 
 * @param entrada { tratamientos, citas_programadas, prog_medicos, prog_espacios, prog_medico_espacio }
 * @returns Array de slots de disponibilidad combinada
 */
export function calcularDisponibilidad(entrada: {
  tratamientos: any[];
  citas_programadas: any[];
  prog_medicos: any[];
  prog_espacios: any[];
  prog_medico_espacio: any[];
}): any[] {
  const {
    tratamientos,
    citas_programadas,
    prog_medicos,
    prog_espacios,
    prog_medico_espacio,
  } = entrada;

  const listaDisponiblesGeneral: any[] = [];

  const convertirHoraAMinutos = (horaStr: string) => {
    const [horas, minutos] = horaStr.split(":").map(Number);
    return horas * 60 + minutos;
  };

  const convertirMinutosAHora = (minutosTotales: number) => {
    const horas = Math.floor(minutosTotales / 60);
    const minutos = minutosTotales % 60;
    return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}:00`;
  };

  // --- 1. Disponibilidad general (a partir de prog_medicos y prog_espacios) ---
  tratamientos.forEach(({ tratamiento, medicos }) => {
    medicos.forEach((medico: any) => {
      medico.espacios.forEach((espacio: any) => {
        const programacionEspacio = prog_espacios.filter(
          (p: any) => p.id_espacio === espacio.id_espacio
        );
        const programacionMedico = prog_medicos.filter(
          (p: any) => p.id_medico === medico.id_medico
        );

        programacionEspacio.forEach((progEsp: any) => {
          programacionMedico.forEach((progMed: any) => {
            if (
              progEsp.fecha_inicio.getTime() !== progMed.fecha_inicio.getTime() ||
              progEsp.fecha_fin.getTime() !== progMed.fecha_fin.getTime()
            ) {
              return;
            }

            const inicioEsp = convertirHoraAMinutos(progEsp.hora_inicio);
            const finEsp = convertirHoraAMinutos(progEsp.hora_fin);
            const inicioMed = convertirHoraAMinutos(progMed.hora_inicio);
            const finMed = convertirHoraAMinutos(progMed.hora_fin);

            const ventanaInicio = Math.max(inicioEsp, inicioMed);
            const ventanaFin = Math.min(finEsp, finMed);
            if (ventanaInicio >= ventanaFin) return;

            const citasBloqueantes = citas_programadas
              .filter((c: any) => c.fecha_cita.getTime() === progEsp.fecha_inicio.getTime())
              .filter((c: any) => c.id_espacio === espacio.id_espacio || c.id_medico === medico.id_medico)
              .filter((c: any) => {
                const cInicio = convertirHoraAMinutos(c.hora_inicio);
                const cFin = convertirHoraAMinutos(c.hora_fin);
                return !(cFin <= ventanaInicio || cInicio >= ventanaFin);
              })
              .map((c: any) => ({
                inicio: convertirHoraAMinutos(c.hora_inicio),
                fin: convertirHoraAMinutos(c.hora_fin),
              }))
              .sort((a: any, b: any) => a.inicio - b.inicio);

            let ultimoFin = ventanaInicio;
            const intervalosLibres = [];

            for (const cita of citasBloqueantes) {
              if (cita.inicio > ultimoFin) {
                intervalosLibres.push({ start: ultimoFin, end: cita.inicio });
              }
              ultimoFin = Math.max(ultimoFin, cita.fin);
            }
            if (ultimoFin < ventanaFin) {
              intervalosLibres.push({ start: ultimoFin, end: ventanaFin });
            }

            intervalosLibres.forEach(({ start, end }) => {
              const inicioPosibleMasTarde = end - tratamiento.duracion_tratamiento;
              if (inicioPosibleMasTarde >= start) {
                listaDisponiblesGeneral.push({
                  fecha_inicio: progEsp.fecha_inicio.toISOString().slice(0, 10),
                  fecha_fin: progEsp.fecha_fin.toISOString().slice(0, 10),
                  hora_inicio_minima: convertirMinutosAHora(start),
                  hora_inicio_maxima: convertirMinutosAHora(inicioPosibleMasTarde),
                  id_medico: medico.id_medico,
                  nombre_medico: medico.nombre_medico,
                  id_espacio: espacio.id_espacio,
                  nombre_espacio: espacio.nombre_espacio,
                  id_tratamiento: tratamiento.id_tratamiento,
                  nombre_tratamiento: tratamiento.nombre_tratamiento,
                  duracion_tratamiento: tratamiento.duracion_tratamiento,
                  especifica: false,
                });
              }
            });
          });
        });
      });
    });
  });

  // --- 2. Disponibilidad específica (a partir de prog_medico_espacio) ---
  const listaDisponiblesEspecifica = prog_medico_espacio.reduce((acum: any[], prog: any) => {
    let infoTratamiento: any = null;
    for (const { tratamiento, medicos } of tratamientos) {
      for (const medico of medicos) {
        if (medico.id_medico === prog.id_medico) {
          const espacioEncontrado = medico.espacios.find(
            (esp: any) => esp.id_espacio === prog.id_espacio
          );
          if (espacioEncontrado) {
            infoTratamiento = {
              id_tratamiento: tratamiento.id_tratamiento,
              nombre_tratamiento: tratamiento.nombre_tratamiento,
              duracion_tratamiento: tratamiento.duracion_tratamiento,
              nombre_medico: medico.nombre_medico,
              nombre_espacio: espacioEncontrado.nombre_espacio,
            };
            break;
          }
        }
      }
      if (infoTratamiento) break;
    }

    if (!infoTratamiento) {
      return acum;
    }

    const fechaInicio = prog.fecha_inicio.toISOString().slice(0, 10);
    const inicioProg = convertirHoraAMinutos(prog.hora_inicio);
    const finProg = convertirHoraAMinutos(prog.hora_fin);

    const citasBloqueantes = citas_programadas
      .filter((c: any) => c.fecha_cita.getTime() === prog.fecha_inicio.getTime())
      .filter((c: any) => c.id_espacio === prog.id_espacio || c.id_medico === prog.id_medico)
      .filter((c: any) => {
        const cInicio = convertirHoraAMinutos(c.hora_inicio);
        const cFin = convertirHoraAMinutos(c.hora_fin);
        return !(cFin <= inicioProg || cInicio >= finProg);
      })
      .map((c: any) => ({
        inicio: convertirHoraAMinutos(c.hora_inicio),
        fin: convertirHoraAMinutos(c.hora_fin),
      }))
      .sort((a: any, b: any) => a.inicio - b.inicio);

    let ultimoFin = inicioProg;
    const intervalosLibres = [];

    for (const cita of citasBloqueantes) {
      if (cita.inicio > ultimoFin) {
        intervalosLibres.push({ start: ultimoFin, end: cita.inicio });
      }
      ultimoFin = Math.max(ultimoFin, cita.fin);
    }
    if (ultimoFin < finProg) {
      intervalosLibres.push({ start: ultimoFin, end: finProg });
    }

    intervalosLibres.forEach(({ start, end }) => {
      const inicioPosibleMasTarde = end - infoTratamiento.duracion_tratamiento;
      if (inicioPosibleMasTarde >= start) {
        acum.push({
          fecha_inicio: fechaInicio,
          fecha_fin: prog.fecha_fin.toISOString().slice(0, 10),
          hora_inicio_minima: convertirMinutosAHora(start),
          hora_inicio_maxima: convertirMinutosAHora(inicioPosibleMasTarde),
          id_medico: prog.id_medico,
          nombre_medico: infoTratamiento.nombre_medico,
          id_espacio: prog.id_espacio,
          nombre_espacio: infoTratamiento.nombre_espacio,
          id_tratamiento: infoTratamiento.id_tratamiento,
          nombre_tratamiento: infoTratamiento.nombre_tratamiento,
          duracion_tratamiento: infoTratamiento.duracion_tratamiento,
          especifica: true,
        });
      }
    });

    return acum;
  }, []);

  // --- 3. Combinar disponibilidades generales y específicas ---
  function restarIntervalo(intervaloGeneral: any, intervaloEspecifico: any) {
    const inicioGeneral = convertirHoraAMinutos(intervaloGeneral.hora_inicio_minima);
    const finGeneral = convertirHoraAMinutos(intervaloGeneral.hora_inicio_maxima);
    const inicioEsp = convertirHoraAMinutos(intervaloEspecifico.hora_inicio_minima);
    const finEsp = convertirHoraAMinutos(intervaloEspecifico.hora_inicio_maxima);

    if (finEsp <= inicioGeneral || inicioEsp >= finGeneral) {
      return [intervaloGeneral];
    }

    const resultado: any[] = [];
    if (inicioEsp > inicioGeneral) {
      resultado.push({
        ...intervaloGeneral,
        hora_inicio_minima: convertirMinutosAHora(inicioGeneral),
        hora_inicio_maxima: convertirMinutosAHora(inicioEsp),
      });
    }
    if (finEsp < finGeneral) {
      resultado.push({
        ...intervaloGeneral,
        hora_inicio_minima: convertirMinutosAHora(finEsp),
        hora_inicio_maxima: convertirMinutosAHora(finGeneral),
      });
    }
    return resultado;
  }

  function combinarDisponibilidades(general: any[], especifica: any[]) {
    let generalModificada: any[] = [];
    for (const gen of general) {
      const especificasCoincidentes = especifica.filter(
        (esp: any) =>
          esp.id_medico === gen.id_medico &&
          esp.id_espacio === gen.id_espacio &&
          esp.fecha_inicio === gen.fecha_inicio
      );
      let intervalos = [gen];
      for (const esp of especificasCoincidentes) {
        let nuevosIntervalos: any[] = [];
        for (const intvl of intervalos) {
          nuevosIntervalos.push(...restarIntervalo(intvl, esp));
        }
        intervalos = nuevosIntervalos;
      }
      generalModificada.push(...intervalos);
    }
    return [...generalModificada, ...especifica];
  }

  const disponibilidadFinal = combinarDisponibilidades(listaDisponiblesGeneral, listaDisponiblesEspecifica);
  return disponibilidadFinal;
}

// packages/core/src/utils/availability/ajustarDisponibilidad.ts

import { DateTime } from "luxon";

/**
 * Ajusta la lista de disponibilidades para que solo incluya slots
 * válidos al menos 3 horas después del tiempo actual.
 * 
 * @param disponibilidades Array de slots con campos fecha_inicio, hora_inicio_minima, hora_inicio_maxima
 * @param tiempoActual Fecha/hora actual en formato ISO (string)
 * @returns Array de slots filtrados y ajustados
 */
export function ajustarDisponibilidad(
  disponibilidades: any[],
  tiempoActual: string
): any[] {
  const DEFAULT_OFFSET_HOURS = 3;
  const tiempoActualDT = DateTime.fromISO(tiempoActual);
  const tiempoMinimoDT = tiempoActualDT.plus({ hours: DEFAULT_OFFSET_HOURS });

  const nuevasDisponibilidades = disponibilidades.filter((item, idx) => {
    const fechaItemDT = DateTime.fromISO(item.fecha_inicio);

    // Descarta si la fecha de disponibilidad es anterior al mínimo permitido
    if (fechaItemDT <= tiempoMinimoDT) {
      return false;
    }

    // Si es el mismo día, ajusta las horas mínimas y máximas
    if (fechaItemDT.hasSame(tiempoMinimoDT, 'day')) {
      const [hmin, mmin] = item.hora_inicio_minima.split(":").map(Number);
      const horaMinimaDT = fechaItemDT.set({ hour: hmin, minute: mmin, second: 0 });
      if (horaMinimaDT <= tiempoMinimoDT) {
        const nuevaHora = tiempoMinimoDT.toFormat("HH:mm:ss");
        item.hora_inicio_minima = nuevaHora;
      }
      const [hmax, mmax] = item.hora_inicio_maxima.split(":").map(Number);
      const horaMaximaDT = fechaItemDT.set({ hour: hmax, minute: mmax, second: 0 });
      if (horaMaximaDT <= tiempoMinimoDT) {
        return false;
      }
    }

    return true;
  });

  return reemplazarFechaCita(nuevasDisponibilidades);
}

/**
 * Convierte los campos fecha_inicio a fecha_cita para compatibilidad.
 */
function reemplazarFechaCita(disponibilidades: any[]): any[] {
  return disponibilidades.map((item) => {
    const nuevaDisponibilidad = {
      ...item,
      fecha_cita: item.fecha_inicio,
    };
    delete nuevaDisponibilidad.fecha_inicio;
    delete nuevaDisponibilidad.fecha_fin;
    return nuevaDisponibilidad;
  });
}
