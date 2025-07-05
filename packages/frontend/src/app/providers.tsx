// packages/frontend/src/app/providers.tsx

"use client";

import { ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "@/components/ui/sonner";

export default function Providers({ children }: { children: ReactNode }) {
  // Instancia única del QueryClient por pestaña
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}

      {/* Notificaciones tipo Sonner */}
      <Toaster richColors />

      {/* Devtools solo en desarrollo */}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
