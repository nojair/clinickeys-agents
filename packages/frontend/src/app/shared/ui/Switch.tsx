// /shared/ui/Switch.tsx

import * as RadixSwitch from '@radix-ui/react-switch';
import type { FC } from 'react';
import clsx from 'clsx';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  'aria-label': string;
}

export const Switch: FC<SwitchProps> = ({ checked, onChange, disabled, 'aria-label': ariaLabel }) => {
  return (
    <RadixSwitch.Root
      checked={checked}
      onCheckedChange={onChange}
      disabled={disabled}
      aria-label={ariaLabel}
      className={clsx(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200',
        disabled ? 'opacity-50 pointer-events-none' : '',
        checked ? 'bg-blue-600' : 'bg-gray-300'
      )}
      tabIndex={0}
    >
      <RadixSwitch.Thumb
        className={clsx(
          'inline-block h-5 w-5 bg-white rounded-full shadow-lg transition-transform duration-200',
          checked ? 'translate-x-5' : 'translate-x-1'
        )}
      />
    </RadixSwitch.Root>
  );
};
