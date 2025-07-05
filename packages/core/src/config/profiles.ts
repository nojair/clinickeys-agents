// packages/core/src/config/profiles.ts

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
        { field_name: "visitMessage" },
        { field_name: "idNotification" },
        { field_name: "visitTreatment" },
        { field_name: "visitProvider" },
        { field_name: "visitStartTime" },
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
