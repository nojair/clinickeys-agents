// /shared/ui/LoadingSpinner.tsx

import type { FC } from 'react';
import clsx from 'clsx';

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
}

export const LoadingSpinner: FC<LoadingSpinnerProps> = ({ size = 24, className = '' }) => {
  return (
    <svg
      className={clsx('animate-spin text-blue-500', className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="status"
      aria-label="Cargando"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
};
