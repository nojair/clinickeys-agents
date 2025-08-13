'use client';
import React, { useMemo } from 'react';
import { useClinics } from "@/app/features/bot-configs/model/useClinics";
import { Select } from "@/app/shared/ui/Select";
import type { Clinic } from "@/app/entities/clinic/types";

interface ClinicSelectorProps {
  name?: string;
  value?: string | number;
  onChange: (value?: string | number, clinic?: Clinic) => void;
  label?: string;
  disabled?: boolean;
  error?: string;
}

export function ClinicSelector({
  name = 'clinic',
  value,
  onChange,
  label = 'Clínica',
  disabled = false,
  error,
}: ClinicSelectorProps) {
  const { data: clinics = [], isLoading } = useClinics();

  const options = useMemo(
    () =>
      clinics.map((clinic) => ({
        value: clinic.clinicId,
        label: `${clinic.name} – ${clinic.clinicId}/${clinic.superClinicId}`,
        clinic,
      })),
    [clinics]
  );

  return (
    <Select
      name={name}
      options={options}
      value={value}
      onChange={(val) => {
        const selected = clinics.find((c) => c.clinicId === val);
        onChange(val, selected);
      }}
      label={label}
      disabled={disabled || isLoading}
      error={error}
      searchable
      placeholder={isLoading ? 'Cargando...' : 'Seleccionar clínica...'}
    />
  );
}
