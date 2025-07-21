// /config/openaiTools.js

export const openaiTools = [
  {
    type: "function",
    function: {
      name: "consulta_agendar",
      description: "Busca huecos disponibles para agendar una cita.",
      parameters: {
        type: "object",
        properties: {
          tratamiento: {
            type: "string",
            description: "Tratamiento solicitado por el paciente (NO PUEDE ESTAR VACÍO)"
          },
          medico: {
            type: ["string", "null"],
            description: "Nombre opcional del médico que indica el paciente (ES OPCIONAL)"
          },
          fechas: {
            type: "string",
            description: "Fechas solicitadas por el paciente (NO PUEDE ESTAR VACÍO)"
          },
          horas: {
            type: "string",
            description: "Horas solicitadas por el paciente (NO PUEDE ESTAR VACÍO)"
          }
        },
        required: ["tratamiento", "medico", "fechas", "horas"],
        additionalProperties: false
      },
      strict: true
    }
  },
  {
    type: "function",
    function: {
      name: "agendar_cita",
      description: "Formaliza la agenda de una cita con datos del paciente.",
      parameters: {
        type: "object",
        properties: {
          nombre: {
            type: "string",
            description: "Nombre del paciente (NO PUEDE ESTAR VACÍO)"
          },
          apellido: {
            type: "string",
            description: "Apellido del paciente (NO PUEDE ESTAR VACÍO)"
          },
          telefono: {
            type: "string",
            description: "Teléfono del paciente (NO PUEDE ESTAR VACÍO)"
          },
          tratamiento: {
            type: "string",
            description: "Tratamiento solicitado por el paciente (NO PUEDE ESTAR VACÍO)"
          },
          medico: {
            type: ["string", "null"],
            description: "Nombre opcional del médico que indica el paciente (ES OPCIONAL)"
          },
          fechas: {
            type: "string",
            description: "Fechas solicitadas por el paciente (NO PUEDE ESTAR VACÍO)"
          },
          horas: {
            type: "string",
            description: "Horas solicitadas por el paciente (NO PUEDE ESTAR VACÍO)"
          },
          id_pack_bono: {
            type: ["integer", "null"],
            description: "Id del pack/bono si el paciente quiere usarlo (ES OPCIONAL)"
          },
          id_presupuesto: {
            type: ["integer", "null"],
            description: "Id del presupuesto si el paciente quiere usarlo (ES OPCIONAL)"
          }
        },
        required: ["nombre", "apellido", "telefono", "tratamiento", "medico", "fechas", "horas", "id_pack_bono", "id_presupuesto"],
        additionalProperties: false
      },
      strict: true
    }
  },
  {
    type: "function",
    function: {
      name: "consulta_reprogramar",
      description: "Busca huecos disponibles para reprogramar una cita existente.",
      parameters: {
        type: "object",
        properties: {
          id_cita: {
            type: "integer",
            description: "ID de la cita que se quiere reprogramar (NO PUEDE ESTAR VACÍO)"
          },
          id_tratamiento: {
            type: "integer",
            description: "id_tratamiento referente a la id_cita (NO PUEDE ESTAR VACÍO)"
          },
          tratamiento: {
            type: "string",
            description: "Tratamiento de la id_cita (NO PUEDE ESTAR VACÍO)"
          },
          id_medico: {
            type: "integer",
            description: "id_medico del médico de la id_cita o de un profesional que indique el paciente (NO PUEDE ESTAR VACÍO)"
          },
          medico: {
            type: "string",
            description: "Nombre del médico de la id_cita o de un profesional que indique el paciente (NO PUEDE ESTAR VACÍO)"
          },
          fechas: {
            type: "string",
            description: "Fechas solicitadas por el paciente (NO PUEDE ESTAR VACÍO)"
          },
          horas: {
            type: "string",
            description: "Horas solicitadas por el paciente (NO PUEDE ESTAR VACÍO)"
          }
        },
        required: ["id_cita", "id_tratamiento", "tratamiento", "id_medico", "medico", "fechas", "horas"],
        additionalProperties: false
      },
      strict: true
    }
  },
  {
    type: "function",
    function: {
      name: "reprogramar_cita",
      description: "Reagenda una cita existente al nuevo horario proporcionado.",
      parameters: {
        type: "object",
        properties: {
          nombre: {
            type: "string",
            description: "Nombre del paciente (NO PUEDE ESTAR VACÍO)"
          },
          apellido: {
            type: "string",
            description: "Apellido del paciente (NO PUEDE ESTAR VACÍO)"
          },
          telefono: {
            type: "string",
            description: "Teléfono del paciente (NO PUEDE ESTAR VACÍO)"
          },
          id_cita: {
            type: "integer",
            description: "ID de la cita a reprogramar (NO PUEDE ESTAR VACÍO)"
          },
          id_tratamiento: {
            type: "integer",
            description: "id_tratamiento referente a la id_cita (NO PUEDE ESTAR VACÍO)"
          },
          tratamiento: {
            type: "string",
            description: "Tratamiento de la id_cita (NO PUEDE ESTAR VACÍO)"
          },
          id_medico: {
            type: "integer",
            description: "id_medico del médico de la id_cita o de un profesional que indique el paciente (NO PUEDE ESTAR VACÍO)"
          },
          medico: {
            type: "string",
            description: "Nombre del médico de la id_cita o de un profesional que indique el paciente (NO PUEDE ESTAR VACÍO)"
          },
          fechas: {
            type: "string",
            description: "Fechas solicitadas por el paciente (NO PUEDE ESTAR VACÍO)"
          },
          horas: {
            type: "string",
            description: "Horas solicitadas por el paciente (NO PUEDE ESTAR VACÍO)"
          }
        },
        required: ["nombre", "apellido", "telefono", "id_cita", "id_tratamiento", "tratamiento", "id_medico", "medico", "fechas", "horas"],
        additionalProperties: false
      },
      strict: true
    }
  },
  {
    type: "function",
    function: {
      name: "cancelar_cita",
      description: "Cancela una cita programada.",
      parameters: {
        type: "object",
        properties: {
          nombre: {
            type: "string",
            description: "Nombre del paciente (NO PUEDE ESTAR VACÍO)"
          },
          apellido: {
            type: "string",
            description: "Apellido del paciente (NO PUEDE ESTAR VACÍO)"
          },
          telefono: {
            type: "string",
            description: "Teléfono del paciente (NO PUEDE ESTAR VACÍO)"
          },
          id_cita: {
            type: "integer",
            description: "ID de la cita a cancelar (NO PUEDE ESTAR VACÍO)."
          },
        },
        required: ["nombre", "apellido", "telefono", "id_cita"],
        additionalProperties: false
      },
      strict: true
    }
  },
  {
    type: "function",
    function: {
      name: "urgencia",
      description: "Gestiona una urgencia médica registrando datos y motivo.",
      parameters: {
        type: "object",
        properties: {
          nombre: {
            type: "string",
            description: "Nombre del paciente (NO PUEDE ESTAR VACÍO)"
          },
          apellido: {
            type: "string",
            description: "Apellido del paciente (NO PUEDE ESTAR VACÍO)"
          },
          telefono: {
            type: "string",
            description: "Teléfono del paciente (NO PUEDE ESTAR VACÍO)"
          },
          motivo: {
            type: "string",
            description: "Motivo de la urgencia (NO PUEDE ESTAR VACÍO)"
          }
        },
        required: ["nombre", "apellido", "telefono", "motivo"],
        additionalProperties: false
      },
      strict: true
    }
  },
  {
    type: "function",
    function: {
      name: "escalamiento",
      description: "Escala una solicitud o caso administrativo registrando datos y medio de contacto.",
      parameters: {
        type: "object",
        properties: {
          nombre: {
            type: "string",
            description: "Nombre del paciente (NO PUEDE ESTAR VACÍO)"
          },
          apellido: {
            type: "string",
            description: "Apellido del paciente (NO PUEDE ESTAR VACÍO)"
          },
          telefono: {
            type: "string",
            description: "Teléfono del paciente (NO PUEDE ESTAR VACÍO)"
          },
          motivo: {
            type: "string",
            description: "Motivo de la urgencia (NO PUEDE ESTAR VACÍO)"
          },
          canal_preferido: {
            type: "string",
            enum: ["llamada", "WhatsApp"],
            description: "Canal preferido para contacto"
          }
        },
        required: ["nombre", "apellido", "telefono", "motivo", "canal_preferido"],
        additionalProperties: false
      },
      strict: true
    }
  },
  {
    type: "function",
    function: {
      name: "tarea",
      description: "Crea una tarea administrativa registrando datos y motivo.",
      parameters: {
        type: "object",
        properties: {
          nombre: {
            type: "string",
            description: "Nombre del paciente (NO PUEDE ESTAR VACÍO)"
          },
          apellido: {
            type: "string",
            description: "Apellido del paciente (NO PUEDE ESTAR VACÍO)"
          },
          telefono: {
            type: "string",
            description: "Teléfono del paciente (NO PUEDE ESTAR VACÍO)"
          },
          motivo: {
            type: "string",
            description: "Motivo de la tarea (NO PUEDE ESTAR VACÍO)"
          },
          canal_preferido: {
            type: "string",
            enum: ["llamada", "WhatsApp"],
            description: "Canal preferido para contacto"
          }
        },
        required: ["nombre", "apellido", "telefono", "motivo", "canal_preferido"],
        additionalProperties: false
      },
      strict: true
    }
  }
];
