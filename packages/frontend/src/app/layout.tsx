import './globals.css';
import { ReactQueryProvider } from './providers/ReactQueryProvider';
import { UiProvider } from './providers/UiProvider';

export const metadata = {
  title: 'Panel de Bot Configs',
  description: 'Panel de administración para configuraciones de bots',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <UiProvider>
          <ReactQueryProvider>
            {children}
          </ReactQueryProvider>
        </UiProvider>
      </body>
    </html>
  );
}
