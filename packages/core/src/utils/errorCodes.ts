// packages/core/src/utils/errorCodes.ts

/**
 * Catálogo centralizado de códigos y descripciones de errores para la aplicación.
 * Este archivo permite mapear códigos a mensajes técnicos y humanos reutilizables.
 * Úsalo para mantener la consistencia en la generación y mapeo de errores.
 */

export const ErrorCodes = {
  // ────── Genéricos ──────
  UNKNOWN: {
    code: "ERR000",
    message: "Error desconocido.",
    humanMessage: "Ha ocurrido un error desconocido. Por favor avisar al equipo de desarrollo.",
  },
  INTERNAL_SERVER_ERROR: {
    code: "ERR500",
    message: "Error interno del servidor.",
    humanMessage: "Error interno en el servidor. Por favor avisar al equipo de desarrollo.",
  },

  // ────── Disponibilidad y Agenda ──────
  FALTA_ID_CLINICA: {
    code: "ERR100",
    message: "Falta el ID de la clínica en la solicitud.",
    humanMessage: "Falta el ID de la clínica en la solicitud. Por favor avisar al equipo de desarrollo.",
  },
  CLINICA_NO_ENCONTRADA: {
    code: "ERR101",
    message: "No se encontró la clínica con el ID proporcionado.",
    humanMessage: "No se encontró la clínica solicitada. Por favor, verifique o contacte soporte.",
  },
  NINGUN_TRATAMIENTO_SELECCIONADO: {
    code: "ERR102",
    message: "No se ha seleccionado ningún tratamiento.",
    humanMessage: "No se ha detectado ningún tratamiento en la solicitud. Por favor seleccione al menos uno.",
  },
  NINGUNA_FECHA_SELECCIONADA: {
    code: "ERR103",
    message: "No se ha seleccionado ninguna fecha.",
    humanMessage: "No se ha detectado ninguna fecha en la solicitud.",
  },
  TRATAMIENTOS_NO_ENCONTRADOS: {
    code: "ERR104",
    message: "Tratamientos no encontrados en la base de datos.",
    humanMessage: "Algunos tratamientos no existen en el sistema. Por favor revise o cree los tratamientos.",
  },
  NINGUN_MEDICO_ENCONTRADO: {
    code: "ERR105",
    message: "No se encontraron médicos para los tratamientos.",
    humanMessage: "No hay médicos asignados para el/los tratamientos seleccionados.",
  },
  MEDICO_NO_ASOCIADO_A_TRATAMIENTO: {
    code: "ERR106",
    message: "El médico no está asociado a los tratamientos indicados.",
    humanMessage: "El médico seleccionado no tiene asignados los tratamientos requeridos.",
  },
  NINGUN_ESPACIO_ENCONTRADO: {
    code: "ERR107",
    message: "No se encontraron espacios disponibles.",
    humanMessage: "No hay espacios configurados para el tratamiento y médico seleccionado.",
  },
  MEDICOS_SOLICITADOS_NO_ENCONTRADOS: {
    code: "ERR108",
    message: "No se encontraron médicos para los tratamientos.",
    humanMessage: "No hay médicos asignados para el/los tratamientos seleccionados.",
  },
  ERROR_CONSULTA_SQL: {
    code: "ERR200",
    message: "Error interno al consultar la base de datos.",
    humanMessage: "Ocurrió un error al consultar la base de datos. Por favor avisar al equipo de desarrollo.",
  },
  NO_PROG_MEDICOS: {
    code: "ERR210",
    message: "No hay programación de médicos en las fechas indicadas.",
    humanMessage: "No hay programación de médicos para las fechas seleccionadas.",
  },
  NO_PROG_ESPACIOS: {
    code: "ERR211",
    message: "No hay programación de espacios en las fechas indicadas.",
    humanMessage: "No hay programación de espacios para las fechas seleccionadas.",
  },
  SIN_HORARIOS_DISPONIBLES: {
    code: "ERR300",
    message: "No se encontraron horarios disponibles.",
    humanMessage: "No hay horarios disponibles para la(s) fecha(s) y tratamiento(s) solicitados.",
  },
  ERROR_CALCULO_DISPONIBILIDAD: {
    code: "ERR301",
    message: "Error al calcular la disponibilidad.",
    humanMessage: "Ocurrió un error al calcular la disponibilidad de horarios.",
  },
  CONEXION_BD: {
    code: "ERR400",
    message: "Error de conexión a la base de datos.",
    humanMessage: "No fue posible conectar con la base de datos.",
  },
  TIEMPO_ESPERA_BD: {
    code: "ERR401",
    message: "Tiempo de espera agotado en la base de datos.",
    humanMessage: "La consulta a la base de datos tardó demasiado.",
  },

  // ────── Otros contextos (agrega según el dominio) ──────
  // Ejemplo:
  // PACK_BONO_NO_ENCONTRADO: {
  //   code: "ERR600",
  //   message: "No se encontró el pack/bono solicitado.",
  //   humanMessage: "El pack o bono solicitado no existe o fue eliminado.",
  // },
} as const;

export type ErrorCodeKey = keyof typeof ErrorCodes;
