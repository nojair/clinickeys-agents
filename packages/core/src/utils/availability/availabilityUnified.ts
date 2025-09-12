// packages/core/src/utils/availability/availabilityUnified.ts

/*
 * Unified availability pipeline: build windows (general + specific) → merge → subtract appointments → slots
 * No lazy patches. Clean, explicit logic.
 */

// =============================
// Types
// =============================

export type OrigenVentana = 'general' | 'especifica';

export interface EspacioEntrada {
  id_espacio: number;
  nombre_espacio: string;
}

export interface MedicoEntrada {
  id_medico: number;
  nombre_medico: string;
  espacios: EspacioEntrada[];
}

export interface TratamientoEntrada {
  tratamiento: {
    id_tratamiento: number;
    nombre_tratamiento: string;
    duracion_tratamiento: number; // en minutos
  };
  medicos: MedicoEntrada[];
}

export interface ProgramacionMedicoRow {
  id_medico: number;
  fecha_inicio: Date;
  fecha_fin: Date;
  hora_inicio: string; // HH:mm:ss
  hora_fin: string;    // HH:mm:ss
}

export interface ProgramacionEspacioRow {
  id_espacio: number;
  fecha_inicio: Date;
  fecha_fin: Date;
  hora_inicio: string; // HH:mm:ss
  hora_fin: string;    // HH:mm:ss
}

export interface ProgramacionMedicoEspacioRow {
  id_medico: number;
  id_espacio: number;
  fecha_inicio: Date;
  fecha_fin: Date;
  hora_inicio: string; // HH:mm:ss
  hora_fin: string;    // HH:mm:ss
}

export interface CitaProgramadaRow {
  id_medico: number;
  id_espacio: number;
  fecha_cita: Date;
  hora_inicio: string; // HH:mm:ss
  hora_fin: string;    // HH:mm:ss
}

export interface VentanaBase {
  fecha: string; // YYYY-MM-DD
  id_medico: number;
  nombre_medico: string;
  id_espacio: number;
  nombre_espacio: string;
  id_tratamiento: number;
  nombre_tratamiento: string;
  duracion_tratamiento: number; // minutos
}

export interface Ventana extends VentanaBase {
  startMin: number; // minutos desde 00:00
  endMin: number;   // minutos desde 00:00, endMin > startMin
  origen: OrigenVentana;
}

export interface SlotDisponibilidad {
  fecha_inicio: string;          // YYYY-MM-DD (se mantiene para compatibilidad con ajustarDisponibilidad)
  hora_inicio_minima: string;    // HH:mm:ss
  hora_inicio_maxima: string;    // HH:mm:ss
  id_medico: number;
  nombre_medico: string;
  id_espacio: number;
  nombre_espacio: string;
  id_tratamiento: number;
  nombre_tratamiento: string;
  duracion_tratamiento: number;  // minutos
  especifica: boolean;           // true si origen === 'especifica'
  // Campo de presentación opcional (lo rellena ajustarDisponibilidad)
  fecha_legible?: string;
}

// =============================
// Time utilities
// =============================

function toMinutes(hhmmss: string): number {
  const [hRaw, mRaw, sRaw] = (hhmmss ?? "").split(":");
  const h = Number.parseInt(hRaw || "0", 10);
  const m = Number.parseInt(mRaw || "0", 10);
  const s = Number.parseInt(sRaw || "0", 10);
  const hh = Number.isNaN(h) ? 0 : h;
  const mm = Number.isNaN(m) ? 0 : m;
  const ss = Number.isNaN(s) ? 0 : s;
  return hh * 60 + mm + Math.floor(ss / 60);
}

function toHHMMSS(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:00`;
}

function ymd(date: Date): string {
  // Mantener alineado con el comportamiento previo que usaba toISOString().slice(0,10)
  return new Date(date.getTime()).toISOString().slice(0, 10);
}

function isSameYMD(a: Date, b: Date): boolean {
  return ymd(a) === ymd(b);
}

// Intersección de ventanas de tiempo en minutos. Retorna [start,end) si hay traslape, sino null.
function intersectRange(aStart: number, aEnd: number, bStart: number, bEnd: number): [number, number] | null {
  const start = Math.max(aStart, bStart);
  const end = Math.min(aEnd, bEnd);
  return start < end ? [start, end] : null;
}

// =============================
// Builders (raw windows)
// =============================

/**
 * Construye ventanas generales (intersección prog_medicos × prog_espacios) por tratamiento/medico/espacio.
 * No aplica bloqueos/citas. No requiere igualdad estricta de fechas; se usa fecha (YYYY-MM-DD) y traslape horario.
 */
export function buildGeneralRaw(
  tratamientos: TratamientoEntrada[],
  prog_medicos: ProgramacionMedicoRow[],
  prog_espacios: ProgramacionEspacioRow[]
): Ventana[] {
  const out: Ventana[] = [];

  for (const t of tratamientos) {
    const { id_tratamiento, nombre_tratamiento, duracion_tratamiento } = t.tratamiento;

    for (const med of t.medicos) {
      const pmList = prog_medicos.filter((pm) => pm.id_medico === med.id_medico);

      for (const esp of med.espacios) {
        const peList = prog_espacios.filter((pe) => pe.id_espacio === esp.id_espacio);

        for (const pm of pmList) {
          for (const pe of peList) {
            // mismodia por diseño actual; si en un futuro hay rangos multi-día, se puede segmentar
            if (!isSameYMD(pm.fecha_inicio, pe.fecha_inicio)) continue;

            const r = intersectRange(toMinutes(pm.hora_inicio), toMinutes(pm.hora_fin), toMinutes(pe.hora_inicio), toMinutes(pe.hora_fin));
            if (!r) continue;

            out.push({
              fecha: ymd(pm.fecha_inicio),
              id_medico: med.id_medico,
              nombre_medico: med.nombre_medico,
              id_espacio: esp.id_espacio,
              nombre_espacio: esp.nombre_espacio,
              id_tratamiento,
              nombre_tratamiento,
              duracion_tratamiento,
              startMin: r[0],
              endMin: r[1],
              origen: 'general',
            });
          }
        }
      }
    }
  }

  return out;
}

/**
 * Construye ventanas específicas desde prog_medico_espacio, mapeadas a tratamientos que permiten ese par (médico, espacio).
 * No aplica bloqueos/citas.
 */
export function buildSpecificRaw(
  tratamientos: TratamientoEntrada[],
  prog_medico_espacio: ProgramacionMedicoEspacioRow[]
): Ventana[] {
  const out: Ventana[] = [];

  for (const pme of prog_medico_espacio) {
    const fecha = ymd(pme.fecha_inicio);
    const start = toMinutes(pme.hora_inicio);
    const end = toMinutes(pme.hora_fin);
    if (start >= end) continue;

    for (const t of tratamientos) {
      const { id_tratamiento, nombre_tratamiento, duracion_tratamiento } = t.tratamiento;

      const medico = t.medicos.find((m) => m.id_medico === pme.id_medico);
      if (!medico) continue;
      const espacio = medico.espacios.find((e) => e.id_espacio === pme.id_espacio);
      if (!espacio) continue;

      out.push({
        fecha,
        id_medico: medico.id_medico,
        nombre_medico: medico.nombre_medico,
        id_espacio: espacio.id_espacio,
        nombre_espacio: espacio.nombre_espacio,
        id_tratamiento,
        nombre_tratamiento,
        duracion_tratamiento,
        startMin: start,
        endMin: end,
        origen: 'especifica',
      });
    }
  }

  return out;
}

// =============================
// Merge & dedup
// =============================

function ventanaKey(v: Ventana): string {
  return [v.fecha, v.id_medico, v.id_espacio, v.id_tratamiento, v.startMin, v.endMin].join('|');
}

/**
 * Unión + deduplicación exacta (no fusiona rangos). Mantiene "especifica" si cualquiera de los duplicados lo es.
 */
export function mergeWindows(a: Ventana[], b: Ventana[]): Ventana[] {
  const map = new Map<string, Ventana>();
  const add = (v: Ventana) => {
    const k = ventanaKey(v);
    if (!map.has(k)) {
      map.set(k, { ...v });
    } else {
      const prev = map.get(k)!;
      // Si cualquiera es específica, marcamos específica
      if (v.origen === 'especifica' || prev.origen === 'especifica') {
        map.set(k, { ...prev, origen: 'especifica' });
      }
    }
  };

  a.forEach(add);
  b.forEach(add);
  return Array.from(map.values());
}

// =============================
// Subtract appointments (apply once)
// =============================

interface Range { start: number; end: number; }

function subtractRanges(base: Range, blocks: Range[]): Range[] {
  if (blocks.length === 0) return [base];
  // Ordenar por inicio
  const sorted = [...blocks].sort((x, y) => x.start - y.start);
  const result: Range[] = [];
  let cursor = base.start;

  for (const b of sorted) {
    if (b.end <= cursor) continue;           // bloque termina antes de cursor
    if (b.start >= base.end) break;          // bloque empieza después del final del base

    if (b.start > cursor) {
      result.push({ start: cursor, end: Math.min(b.start, base.end) });
    }
    cursor = Math.max(cursor, b.end);
    if (cursor >= base.end) break;
  }

  if (cursor < base.end) {
    result.push({ start: cursor, end: base.end });
  }

  // Filtrar segmentos vacíos
  return result.filter((r) => r.end > r.start);
}

/**
 * Aplica citas/bloqueos a las ventanas: una cita bloquea si coincide el **médico** o el **espacio** en la misma fecha y traslapa horarios.
 */
export function subtractAppointments(
  ventanas: Ventana[],
  citas: CitaProgramadaRow[]
): Ventana[] {
  if (!ventanas.length) return [];
  if (!citas || !citas.length) return ventanas;

  const citasByFecha = new Map<string, CitaProgramadaRow[]>();
  for (const c of citas) {
    const f = ymd(c.fecha_cita);
    const list = citasByFecha.get(f) || [];
    list.push(c);
    citasByFecha.set(f, list);
  }

  const out: Ventana[] = [];

  for (const v of ventanas) {
    const dayCitas = citasByFecha.get(v.fecha) || [];

    // Recolectar bloques que aplican por médico o por espacio
    const blocks: Range[] = [];
    for (const c of dayCitas) {
      if (c.id_medico !== v.id_medico && c.id_espacio !== v.id_espacio) continue; // no bloquea este par
      const r = intersectRange(v.startMin, v.endMin, toMinutes(c.hora_inicio), toMinutes(c.hora_fin));
      if (r) blocks.push({ start: r[0], end: r[1] });
    }

    const free = subtractRanges({ start: v.startMin, end: v.endMin }, blocks);
    for (const fr of free) {
      out.push({ ...v, startMin: fr.start, endMin: fr.end });
    }
  }

  return out;
}

// =============================
// Windows → Slots
// =============================

/**
 * Convierte ventanas libres a slots: calcula hora_inicio_minima y hora_inicio_maxima = end - duracion.
 * Descarta segmentos en los que no cabe el tratamiento.
 */
export function windowsToSlots(ventanas: Ventana[]): SlotDisponibilidad[] {
  const slots: SlotDisponibilidad[] = [];

  for (const v of ventanas) {
    const latestStart = v.endMin - v.duracion_tratamiento;
    if (latestStart < v.startMin) continue; // no cabe

    slots.push({
      fecha_inicio: v.fecha,
      hora_inicio_minima: toHHMMSS(v.startMin),
      hora_inicio_maxima: toHHMMSS(latestStart),
      id_medico: v.id_medico,
      nombre_medico: v.nombre_medico,
      id_espacio: v.id_espacio,
      nombre_espacio: v.nombre_espacio,
      id_tratamiento: v.id_tratamiento,
      nombre_tratamiento: v.nombre_tratamiento,
      duracion_tratamiento: v.duracion_tratamiento,
      especifica: v.origen === 'especifica',
    });
  }

  return slots;
}

// =============================
// Orquestador principal (para reemplazar calcularDisponibilidad)
// =============================

export function calcularDisponibilidadUnificada(input: {
  tratamientos: TratamientoEntrada[];
  citas_programadas: CitaProgramadaRow[];
  prog_medicos: ProgramacionMedicoRow[];
  prog_espacios: ProgramacionEspacioRow[];
  prog_medico_espacio: ProgramacionMedicoEspacioRow[];
}): SlotDisponibilidad[] {
  const generalRaw = buildGeneralRaw(input.tratamientos, input.prog_medicos, input.prog_espacios);
  const specificRaw = buildSpecificRaw(input.tratamientos, input.prog_medico_espacio);
  const allRaw = mergeWindows(generalRaw, specificRaw);
  const freeWindows = subtractAppointments(allRaw, input.citas_programadas);
  const slots = windowsToSlots(freeWindows);
  return slots;
}
