// packages/core/src/utils/AppError.ts

/**
 * Clase base para errores de aplicación (custom business errors) en ClinicKeys.
 * Permite códigos, mensajes humanos, contexto adicional y marcaje para logs.
 */
export class AppError extends Error {
  code: string;
  context: Record<string, any>;
  isLogOnly: boolean;

  constructor({ code, humanMessage, context = {}, isLogOnly = false }: {
    code: string;
    humanMessage: string;
    context?: Record<string, any>;
    isLogOnly?: boolean;
  }) {
    super(humanMessage);
    this.name = "AppError";
    this.code = code;
    this.context = context;
    this.isLogOnly = isLogOnly;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convierte el error a un objeto amigable para la API/UI.
   */
  toJSON() {
    return {
      success: false,
      code: this.code,
      message: this.message,
      context: this.context,
    };
  }

  /**
   * String para logs (CloudWatch, Sentry, etc).
   */
  toString() {
    let base = `[${this.code}] ${this.message}`;
    if (Object.keys(this.context).length > 0) {
      base += ` | Context: ${JSON.stringify(this.context)}`;
    }
    return base;
  }

  // -----------------------------------
  // Métodos estáticos por tipo de error (domain-specific)
  // -----------------------------------

  static FALTA_ID_CLINICA() {
    return new AppError({
      code: "ERR100",
      humanMessage: "Falta el ID de la clínica en la solicitud. Por favor avisar al equipo de desarrollo.",
    });
  }

  static CLINICA_NO_ENCONTRADA(id_clinica: number) {
    return new AppError({
      code: "ERR202",
      humanMessage: `No se encontró la clínica con ID ${id_clinica}. Por favor, verifique la información o contacte al soporte.`,
      context: { id_clinica },
    });
  }

  static NINGUN_TRATAMIENTO_SELECCIONADO() {
    return new AppError({
      code: "ERR101",
      humanMessage: "No se ha detectado ningún tratamiento en la solicitud. Por favor avisar al equipo de desarrollo.",
    });
  }

  static NINGUNA_FECHA_SELECCIONADA() {
    return new AppError({
      code: "ERR102",
      humanMessage: "No se ha detectado ninguna fecha en la solicitud. Por favor avisar al equipo de desarrollo.",
    });
  }

  static TRATAMIENTOS_NO_ENCONTRADOS(tratamientos: string[] = []) {
    return new AppError({
      code: "ERR200",
      humanMessage: `Los tratamientos en la solicitud no existen en la base de datos: ${tratamientos.join(", ")}. Por favor, revise si existe o cree los tratamientos.`,
      context: { tratamientos },
    });
  }

  static TRATAMIENTOS_NO_EXACTOS(tratamientos: string[] = []) {
    return new AppError({
      code: "ERR201",
      humanMessage: `Ninguno de los tratamientos proporcionados coincide exactamente en la base de datos: ${tratamientos.join(", ")}. Por favor, revise o ajuste los nombres de los tratamientos.`,
      context: { tratamientos },
    });
  }

  static NINGUN_MEDICO_ENCONTRADO(tratamientos: string[] = []) {
    const tratamientosStr = tratamientos.join(", ");
    return new AppError({
      code: "ERR202",
      humanMessage: `No hay médicos configurados para el tratamiento(s) "${tratamientosStr}". Por favor, asigne el tratamiento a un médico.`,
      context: { tratamientos },
    });
  }

  static MEDICOS_SOLICITADOS_NO_ENCONTRADOS(medicos: string[] = []) {
    const medicosStr = medicos.join(", ");
    return new AppError({
      code: "ERR203",
      humanMessage: `Los médicos solicitados no se encontraron: "${medicosStr}". Por favor, verifique si los nombres solicitados existen en la base de datos.`,
      context: { medicos },
    });
  }

  static MEDICO_NO_ASOCIADO_A_TRATAMIENTO(medicos: string[] = [], tratamientos: string[] = []) {
    const medicosStr = medicos.join(", ");
    const tratamientosStr = tratamientos.join(", ");
    return new AppError({
      code: "ERR203",
      humanMessage: `El médico(s) "${medicosStr}" no está asociado a los tratamientos "${tratamientosStr}". Por favor, asigne el tratamiento al médico o seleccione un médico diferente.`,
      context: { medicos, tratamientos }
    });
  }

  static NINGUN_ESPACIO_ENCONTRADO(tratamientos: string[] = [], medicos: string[] = []) {
    return new AppError({
      code: "ERR203",
      humanMessage: `No hay espacios disponibles para el tratamiento(s) "${tratamientos.join(", ")}" con los médicos [${medicos.join(", ")}]. Por favor configure espacios para el tratamiento y/o verifique que ese espacio esté habilitado para un médico.`,
      context: { tratamientos, medicos },
    });
  }

  static ERROR_CONSULTA_SQL(errorOriginal: Error) {
    return new AppError({
      code: "ERR204",
      humanMessage: `Ha ocurrido un error interno al consultar la base de datos. Por favor avisar al equipo de desarrollo. Detalle: ${errorOriginal.message}`,
      context: { errorOriginal },
    });
  }

  static NO_PROG_MEDICOS(medicos: string[] = [], fechas: string[] = []) {
    return new AppError({
      code: "ERR210",
      humanMessage: `No se encontró programación para los médicos [${medicos.join(", ")}] en las fechas [${fechas.join(", ")}]. Por favor registre la programación en esas fechas.`,
      context: { medicos, fechas },
    });
  }

  static NO_PROG_ESPACIOS(espacios: string[] = [], fechas: string[] = []) {
    return new AppError({
      code: "ERR211",
      humanMessage: `No se encontró programación de espacios para [${espacios.join(", ")}] en las fechas [${fechas.join(", ")}]. Por favor registre la programación en esas fechas.`,
      context: { espacios, fechas },
    });
  }

  static SIN_HORARIOS_DISPONIBLES(tratamientos: string[] = [], fechas: any[] = []) {
    const tratamientosStr = tratamientos.join(", ");
    const fechasFormateadas = fechas.map(fechaObj => {
      const fechaDate = new Date(fechaObj.fecha);
      const dia = String(fechaDate.getDate()).padStart(2, "0");
      const mes = String(fechaDate.getMonth() + 1).padStart(2, "0");
      const anio = fechaDate.getFullYear();
      let fechaStr = `${dia}/${mes}/${anio}`;
      const horasPresentes = (fechaObj.horas || []).filter((horaObj: any) => horaObj.hora_inicio || horaObj.hora_fin);
      const horasStr = horasPresentes.map((horaObj: any) => {
        const { hora_inicio, hora_fin } = horaObj;
        if (hora_inicio && hora_fin) {
          return `entre las ${hora_inicio} y las ${hora_fin}`;
        } else if (hora_inicio) {
          return `a partir de las ${hora_inicio}`;
        } else if (hora_fin) {
          return `hasta las ${hora_fin}`;
        } else {
          return "";
        }
      }).filter((s: string) => s !== "").join(", ");
      if (horasStr) {
        return `${fechaStr} ${horasStr}`;
      } else {
        return `${fechaStr}`;
      }
    });
    const fechasStr = fechasFormateadas.join(", ");
    const humanMessage = `No se encontraron horarios disponibles para los tratamientos [${tratamientosStr}] en las siguientes fechas: ${fechasStr}.`;
    return new AppError({
      code: "ERR300",
      humanMessage,
      context: { tratamientos, fechas },
      isLogOnly: true,
    });
  }

  static ERROR_CALCULO_DISPONIBILIDAD() {
    return new AppError({
      code: "ERR301",
      humanMessage: "Ocurrió un error al calcular la disponibilidad. Por favor avisar al equipo de desarrollo.",
    });
  }

  static CONEXION_BD() {
    return new AppError({
      code: "ERR400",
      humanMessage: "Se ha perdido la conexión a la base de datos. Por favor avisar al equipo de desarrollo.",
    });
  }

  static TIEMPO_ESPERA_BD() {
    return new AppError({
      code: "ERR401",
      humanMessage: "La consulta a la base de datos tardó demasiado. Por favor avisar al equipo de desarrollo.",
    });
  }

  static ERROR_INTERNO_SERVIDOR() {
    return new AppError({
      code: "ERR500",
      humanMessage: "Error interno en el servidor. Por favor avisar al equipo de desarrollo.",
    });
  }

  static ERROR_DESCONOCIDO(error: any) {
    return new AppError({
      code: "ERR501",
      humanMessage: `Error desconocido: ${error.message}. Por favor avisar al equipo de desarrollo.`,
      context: { error },
    });
  }
}
