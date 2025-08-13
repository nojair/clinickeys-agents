"use client";
// /shared/ui/Button.tsx

import { LoadingSpinner } from './LoadingSpinner';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  children,
  variant = 'primary',
  loading = false,
  disabled = false,
  size = 'md',
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-md transition focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed';

  const variantStyles: Record<string, string> = {
    primary:
      'bg-blue-600 text-white hover:bg-blue-800 focus:ring-blue-300',
    secondary:
      'bg-white text-gray-800 border border-gray-300 hover:bg-gray-200 focus:ring-gray-300',
    danger:
      'bg-red-600 text-white hover:bg-red-800 focus:ring-red-300',
    ghost:
      'bg-transparent text-gray-700 hover:bg-gray-100 border border-transparent focus:ring-gray-300',
  };

  const sizeStyles: Record<string, string> = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-4 py-2',
    lg: 'text-base px-6 py-3',
  };

  return (
    <button
      className={clsx(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <LoadingSpinner size={18} className="mr-2" />}      
      {children}
    </button>
  );
}
