// /shared/ui/Toast.tsx

import { toast as sonnerToast } from 'sonner';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

export function Toast({ message, type = 'info', duration = 3500 }: ToastProps) {
  // Usa el método correspondiente según el tipo
  switch (type) {
    case 'success':
      sonnerToast.success(message, { duration });
      break;
    case 'error':
      sonnerToast.error(message, { duration });
      break;
    case 'warning':
      sonnerToast.warning(message, { duration });
      break;
    default:
      sonnerToast(message, { duration });
  }
  return null;
}
