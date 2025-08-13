export interface KommoCustomFieldExistence {
  field_name: string | undefined;
  field_type: string | undefined;
  exists: boolean;
}

export interface KommoAccountUser {
  id: number;
  name: string;
  email: string;
}
