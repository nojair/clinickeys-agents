// /src/app/layout.tsx
import './globals.css';
import { ReactQueryProvider } from './providers/ReactQueryProvider';

export const metadata = {
  title: 'Panel de Bot Configs',
  description: 'Panel de administración para configuraciones de bots',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <ReactQueryProvider>
          {children}
        </ReactQueryProvider>
      </body>
    </html>
  );
}
