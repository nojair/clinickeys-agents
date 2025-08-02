// /app/bot-configs/layout.tsx

import type { ReactNode } from 'react';

export default function BotConfigsLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </div>
    </main>
  );
}
