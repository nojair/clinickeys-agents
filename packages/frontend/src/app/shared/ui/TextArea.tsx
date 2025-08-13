import React, { TextareaHTMLAttributes } from 'react';
import clsx from 'clsx';

interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
  label: string | React.ReactNode;
  error?: string;
  className?: string;
  disabled?: boolean;
  rows?: number;
}

export function TextArea({
  value = '',
  onChange,
  label,
  error,
  className = '',
  disabled = false,
  rows = 4,
  ...props
}: TextAreaProps) {
  return (
    <div className="w-full">
      <label className="block mb-1 text-sm font-medium">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange?.(e.target.value)}
        disabled={disabled}
        rows={rows}
        className={clsx(
          'w-full rounded-lg border px-3 py-2 text-sm',
          'focus:outline-none focus:ring-2 focus:ring-blue-300',
          disabled ? 'opacity-50 pointer-events-none bg-gray-50' : 'bg-white',
          error ? 'border-red-500' : 'border-gray-300',
          className
        )}
        {...props}
      />
      {error && <div className="mt-1 text-xs text-red-500">{error}</div>}
    </div>
  );
}
