// /shared/ui/Select.tsx

import * as RadixSelect from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

export interface SelectOption {
  value: string | number;
  label: string;
  [key: string]: any;
}

interface SelectProps {
  value: string | number | undefined;
  onChange: (value: string | number) => void;
  options: SelectOption[];
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
}

export function Select({
  value,
  onChange,
  options,
  label,
  placeholder = 'Seleccionar...',
  disabled,
  error,
}: SelectProps) {
  const valueAsString = value === undefined || value === null ? '' : String(value);

  return (
    <div className="w-full">
      {label && <label className="block mb-1 text-sm font-medium">{label}</label>}
      <RadixSelect.Root
        value={valueAsString}
        onValueChange={val => {
          const found = options.find(opt => String(opt.value) === val);
          if (found) onChange(found.value);
        }}
        disabled={disabled}
      >
        <RadixSelect.Trigger
          className={clsx(
            'flex items-center justify-between w-full rounded-lg border px-3 py-2 text-sm bg-white',
            'focus:outline-none focus:ring-2 focus:ring-blue-300',
            disabled ? 'opacity-50 pointer-events-none' : '',
            error ? 'border-red-500' : 'border-gray-300'
          )}
        >
          <RadixSelect.Value placeholder={placeholder} />
          <RadixSelect.Icon>
            <ChevronDown size={18} />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>
        <RadixSelect.Content className="z-50 bg-white rounded-lg shadow-xl border mt-1 max-h-60 overflow-y-auto">
          <RadixSelect.Viewport>
            {options.map(opt => (
              <RadixSelect.Item
                key={opt.value}
                value={String(opt.value)}
                className={clsx(
                  'flex items-center px-3 py-2 cursor-pointer select-none text-sm',
                  'hover:bg-blue-50 focus:bg-blue-100',
                )}
              >
                <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator className="ml-auto">
                  <Check size={16} />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Root>
      {error && <div className="mt-1 text-xs text-red-500">{error}</div>}
    </div>
  );
}
