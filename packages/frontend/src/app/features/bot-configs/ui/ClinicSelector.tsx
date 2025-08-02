// /features/bot-configs/ui/ClinicSelector.tsx

import { useState } from 'react';
import { useClinics } from '@/app/features/bot-configs/model/useClinics';
import { Select } from '@/app/shared/ui/Select';
import type { Clinic } from '@/app/entities/clinic/types';

interface ClinicSelectorProps {
  value?: string | number;
  onChange: (value: string | number, clinic: Clinic) => void;
  label?: string;
  disabled?: boolean;
  error?: string;
}

export function ClinicSelector({ value, onChange, label = 'Clínica', disabled, error }: ClinicSelectorProps) {
  const { data: clinics, isLoading } = useClinics();
  const [search, setSearch] = useState('');

  // Opciones para el select
  const options = clinics
    .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    .map((clinic) => ({
      value: clinic.id_clinica,
      label: `${clinic.name} (ID: ${clinic.id_clinica}, SuperID: ${clinic.id_super_clinica})`,
      clinic,
    }));

  return (
    <div>
      <label className="block mb-1 font-medium text-sm">{label}</label>
      <input
        type="text"
        placeholder="Buscar clínica..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-2 w-full px-2 py-1 border rounded"
        disabled={disabled || isLoading}
      />
      <Select
        value={value ?? ''}
        onChange={(val) => {
          const selected = clinics.find((c) => c.id_clinica === val);
          if (selected) {
            onChange(val, selected);
          }
        }}
        options={options}
        label={label}
        disabled={disabled || isLoading}
        error={error}
      />
    </div>
  );
}
