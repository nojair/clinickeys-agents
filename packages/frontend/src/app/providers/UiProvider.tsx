// /app/providers/UiProvider.tsx
'use client';
import { ReactNode } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';

export function UiProvider({ children }: { children: ReactNode }) {
  return (
    <Tooltip.Provider>
      {children}
    </Tooltip.Provider>
  );
}
