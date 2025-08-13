'use client';
import React, { useMemo } from 'react';
import SelectLib, { ActionMeta, SingleValue, StylesConfig } from 'react-select';

export interface SelectOption {
  value: string | number;
  label: string;
  [key: string]: unknown;
}

interface SelectProps {
  name?: string;
  value?: string | number;
  onChange: (value?: string | number) => void;
  options: SelectOption[];
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  searchable?: boolean;
  clearable?: boolean;
}

export function Select({
  name = 'select',
  value,
  onChange,
  options,
  label,
  placeholder = 'Seleccionar…',
  disabled = false,
  error,
  searchable = false,
  clearable = true,
}: SelectProps) {
  const selectedOption = useMemo(
    () => options.find(opt => String(opt.value) === String(value)) || null,
    [options, value]
  );

  const styles = useMemo<StylesConfig<SelectOption, false>>(
    () => ({
      control: base => ({
        ...base,
        borderColor: error ? '#EF4444' : base.borderColor,
        boxShadow: error ? '0 0 0 1px #EF4444' : base.boxShadow,
        minHeight: 38,
        fontSize: 14,
        backgroundColor: disabled ? '#F3F4F6' : '#fff',
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }),
      option: (base, { isDisabled }) => ({
        ...base,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
      }),
      menu: base => ({
        ...base,
        zIndex: 999,
      }),
    }),
    [error, disabled]
  );

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={name} className="block mb-1 text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <SelectLib<SelectOption, false>
        inputId={name}
        name={name}
        options={options}
        value={selectedOption}
        isSearchable={searchable}
        placeholder={placeholder}
        onChange={(opt: SingleValue<SelectOption>, action: ActionMeta<SelectOption>) => onChange(opt?.value)}
        isDisabled={disabled}
        isClearable={clearable}
        styles={styles}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
        noOptionsMessage={() => 'Sin resultados'}
      />
      {error && (
        <p id={`${name}-error`} className="mt-1 text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
