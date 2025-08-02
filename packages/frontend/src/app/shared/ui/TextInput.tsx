// /shared/ui/TextInput.tsx

import type { InputHTMLAttributes } from 'react';
import clsx from 'clsx';

interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
  label: string;
  error?: string;
}

export function TextInput({
  value = '',
  onChange,
  label,
  error,
  className = '',
  disabled = false,
  type = 'text',
  ...props
}: TextInputProps) {
  return (
    <div className="w-full">
      <label className="block mb-1 text-sm font-medium">{label}</label>
      <input
        value={value}
        onChange={e => onChange?.(e.target.value)}
        type={type}
        className={clsx(
          'w-full rounded-lg border px-3 py-2 text-sm',
          'focus:outline-none focus:ring-2 focus:ring-blue-300',
          disabled ? 'opacity-50 pointer-events-none bg-gray-50' : 'bg-white',
          error ? 'border-red-500' : 'border-gray-300',
          className
        )}
        disabled={disabled}
        {...props}
      />
      {error && <div className="mt-1 text-xs text-red-500">{error}</div>}
    </div>
  );
}
