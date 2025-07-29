// packages/core/src/utils/constants.ts

// --- Custom Field Constants --- //
export const PATIENT_FIRST_NAME = "patientFirstName";
export const PATIENT_LAST_NAME = "patientLastName";
export const PATIENT_LEAD_ID = "patientLeadId";
export const PATIENT_PHONE = "patientPhone";
export const PATIENT_ID = "patientId";

export const CLINIC_NAME = "clinicName";
export const CLINIC_ID = "clinicId";

export const APPOINTMENT_WEEKDAY_NAME = "appointmentWeekdayName";
export const APPOINTMENT_START_TIME = "appointmentStartTime";
export const APPOINTMENT_END_TIME = "appointmentEndTime";
export const APPOINTMENT_DATE = "appointmentDate";

export const DOCTOR_FULL_NAME = "doctorFullName";
export const DOCTOR_ID = "doctorId";

export const TREATMENT_NAME = "treatmentName";
export const TREATMENT_ID = "treatmentId";

export const SPACE_NAME = "spaceName";
export const SPACE_ID = "spaceId";

export const REMINDER_MESSAGE = "reminderMessage";

// Otros campos usados directamente en los perfiles:
export const TRIGGERED_BY_MACHINE = "triggeredByMachine";
export const PLEASE_WAIT_MESSAGE = "pleaseWaitMessage";
export const ID_NOTIFICATION = "idNotification";
export const PATIENT_MESSAGE = "patientMessage";
export const SALESBOT_LOG = "salesbotLog";
export const BOT_MESSAGE = "botMessage";
export const THREAD_ID = "threadId";

// --- Profiles --- //
export const profiles = {
  default_kommo_profile: {
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
        { field_name: APPOINTMENT_WEEKDAY_NAME },
        { field_name: APPOINTMENT_START_TIME },
        { field_name: APPOINTMENT_END_TIME },
        { field_name: APPOINTMENT_DATE },

        { field_name: REMINDER_MESSAGE },
        { field_name: PATIENT_LEAD_ID },
        { field_name: CLINIC_ID },
        { field_name: DOCTOR_ID },
        { field_name: TREATMENT_ID },
        { field_name: SPACE_ID },

        { field_name: PATIENT_FIRST_NAME },
        { field_name: PATIENT_LAST_NAME },
        { field_name: PATIENT_PHONE },
        { field_name: PATIENT_ID },

        { field_name: DOCTOR_FULL_NAME },
        { field_name: SPACE_NAME },

        { field_name: TRIGGERED_BY_MACHINE },
        { field_name: PLEASE_WAIT_MESSAGE },
        { field_name: ID_NOTIFICATION },
        { field_name: PATIENT_MESSAGE },
        { field_name: TREATMENT_NAME },
        { field_name: SALESBOT_LOG },
        { field_name: BOT_MESSAGE },
        { field_name: CLINIC_NAME },
        { field_name: THREAD_ID },
      ]
    }
  },
  default_minimal_profile: {
    adding_contact: { custom_fields_config: [] },
    lead: { custom_field_config: [] }
  }
};
