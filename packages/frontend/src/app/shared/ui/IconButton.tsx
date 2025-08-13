"use client";

import * as React from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { LoadingSpinner } from '@/app/shared/ui/LoadingSpinner';

export interface IconButtonProps {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon: Icon,
  label,
  onClick,
  loading = false,
  disabled = false,
}) => (
  <Tooltip.Root delayDuration={100}>
    <Tooltip.Trigger asChild>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={
          `p-2 rounded hover:bg-gray-100 transition ` +
          ((loading || disabled)
            ? 'opacity-50 cursor-not-allowed'
            : 'cursor-pointer')
        }
        disabled={loading || disabled}
      >
        {loading ? <LoadingSpinner size={16} /> : <Icon size={18} />}
      </button>
    </Tooltip.Trigger>
    <Tooltip.Portal>
      <Tooltip.Content
        side="top"
        align="center"
        className="z-50 bg-black text-white text-xs rounded px-2 py-1"
      >
        {label}
        <Tooltip.Arrow className="fill-black" />
      </Tooltip.Content>
    </Tooltip.Portal>
  </Tooltip.Root>
);
