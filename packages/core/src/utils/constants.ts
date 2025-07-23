// packages/core/src/utils/constants.ts

/**
 * Mapeo de nombres lógicos de fields → keys usados en el payload de notificaciones.
 * Puedes expandirlo o modificarlo según las necesidades de negocio/campos Kommo.
 */
export const PAYLOAD_FIELD_MAP: Record<string, string> = {
  spaceName: 'space_name',
  clinicName: 'clinic_name',
  treatmentName: 'treatment_name',
  doctorFullName: 'doctor_full_name',
  appointmentDate: 'appointment_date',
  patientLastName: 'patient_last_name',
  patientFirstName: 'patient_first_name',
  appointmentEndTime: 'appointment_end_time',
  appointmentStartTime: 'appointment_start_time',
  appointmentWeekdayName: 'appointment_weekday_name',
};

// custom fields para crear en las cuentas de kommo de cada clínica
export const profiles = {
  default_esp: {
    adding_contact: {
      custom_fields_config: [
        {
          field_code: "PHONE",
          enum_code: "WORK"
        }
      ]
    },
    lead: {
      custom_field_config: [
        { field_name: "appointmentWeekdayName" },
        { field_name: "appointmentStartTime" },
        { field_name: "appointmentEndTime" },
        { field_name: "appointmentMessage" },
        { field_name: "triggeredByMachine" },
        { field_name: "patientFirstName" },
        { field_name: "patientLastName" },
        { field_name: "appointmentDate" },
        { field_name: "doctorFullName" },
        { field_name: "idNotification" },
        { field_name: "treatmentName" },
        { field_name: "salesbotLog" },
        { field_name: "clinicName" },
        { field_name: "spaceName" },
      ]
    }
  },
  minimal: {
    adding_contact: { custom_fields_config: [] },
    lead: { custom_field_config: [] }
  }
}
