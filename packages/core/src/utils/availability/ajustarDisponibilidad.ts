import { DateTime } from "luxon";

/**
 * Ajusta la lista de disponibilidades para que solo incluya slots
 * válidos al menos 3 horas después del tiempo actual.
 *
 * Corrección importante:
 * - En lugar de descartar por fecha (00:00) antes de ajustar, ahora comparamos
 *   con fecha+hora completas del slot. Si el slot es del mismo día y comienza
 *   antes del umbral, se ajusta la hora de inicio mínima a ese umbral.
 *
 * @param disponibilidades Array de slots con campos: fecha_inicio (YYYY-MM-DD),
 *        hora_inicio_minima (HH:mm:ss), hora_inicio_maxima (HH:mm:ss)
 * @param tiempoActual Fecha/hora actual en formato ISO (incluyendo zona)
 * @returns Array de slots filtrados y ajustados, con `fecha_cita` en vez de `fecha_inicio`
 */
export function ajustarDisponibilidad(
  disponibilidades: any[],
  tiempoActual: string
): any[] {
  const DEFAULT_OFFSET_HOURS = 3;
  const now = DateTime.fromISO(tiempoActual);
  const minDT = now.plus({ hours: DEFAULT_OFFSET_HOURS });

  const out: any[] = [];

  for (const item of disponibilidades || []) {
    if (!item || !item.fecha_inicio || !item.hora_inicio_minima || !item.hora_inicio_maxima) {
      continue;
    }
  
    const day = DateTime.fromISO(String(item.fecha_inicio), { zone: minDT.zone });

    // Parse horas
    const [sh, sm, ss] = String(item.hora_inicio_minima).split(":").map((v: string) => parseInt(v, 10) || 0);
    const [eh, em, es] = String(item.hora_inicio_maxima).split(":").map((v: string) => parseInt(v, 10) || 0);

    let startDT = day.set({ hour: sh, minute: sm, second: ss });
    const latestStartDT = day.set({ hour: eh, minute: em, second: es });

    if (latestStartDT <= minDT) {
      continue;
    }
    if (startDT < minDT && startDT.hasSame(minDT, "day")) {
      startDT = minDT;
    }
    if (startDT >= latestStartDT) {
      continue;
    }

    const adjusted = {
      ...item,
      hora_inicio_minima: startDT.toFormat("HH:mm:ss"),
      hora_inicio_maxima: latestStartDT.toFormat("HH:mm:ss"),
    };

    out.push(adjusted);
  }

  // Compatibilidad: convertir fecha_inicio → fecha_cita y remover fecha_inicio/fecha_fin
  return reemplazarFechaCita(out);
}

/**
 * Convierte los campos fecha_inicio a fecha_cita para compatibilidad.
 */
function reemplazarFechaCita(disponibilidades: any[]): any[] {
  return (disponibilidades || []).map((item) => {
    const nuevaDisponibilidad: any = {
      ...item,
      fecha_cita: item.fecha_inicio,
    };
    delete nuevaDisponibilidad.fecha_inicio;
    delete nuevaDisponibilidad.fecha_fin;
    return nuevaDisponibilidad;
  });
}

export default ajustarDisponibilidad;
