// packages/core/src/utils/constants.ts

/**
 * Mapeo de nombres lógicos de fields → keys usados en el payload de notificaciones.
 * Puedes expandirlo o modificarlo según las necesidades de negocio/campos Kommo.
 */
export const PAYLOAD_FIELD_MAP: Record<string, string> = {
  visitDate: 'visit_date',
  clinicName: 'clinic_name',
  lastName: 'patient_lastname',
  firstName: 'patient_firstname',
  visitEndTime: 'visit_end_time',
  visitSpace: 'visit_space_name',
  visitProvider: 'medic_full_name',
  visitTreatment: 'treatment_name',
  visitStartTime: 'visit_init_time',
  visitWeekDay: 'visit_week_day_name',
};

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
        { field_name: "clinicName" },
        { field_name: "firstName" },
        { field_name: "lastName" },
        { field_name: "visitMessage" },
        { field_name: "idNotification" },
        { field_name: "visitTreatment" },
        { field_name: "visitProvider" },
        { field_name: "visitStartTime" },
        { field_name: "visitWeekDay" },
        { field_name: "visitEndTime" },
        { field_name: "visitSpace" },
        { field_name: "visitDate" },
        { field_name: "triggeredByMachine" },
        { field_name: "salesbotLog" }
      ]
    }
  },
  minimal: {
    adding_contact: { custom_fields_config: [] },
    lead: { custom_field_config: [] }
  }
}
