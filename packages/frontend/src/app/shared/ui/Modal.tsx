// /shared/ui/Modal.tsx

import * as Dialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import clsx from 'clsx';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  width?: string | number;
  children: ReactNode;
}

export function Modal({ open, onClose, title, width = '32rem', children }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(val) => !val && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40 animate-fade-in" />
        <Dialog.Content
          className={clsx(
            'fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl p-6',
            'focus:outline-none',
          )}
          style={{ width }}
        >
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-bold">{title}</Dialog.Title>
            <Dialog.Close
              asChild
              aria-label="Cerrar"
              className="ml-2 text-gray-400 hover:text-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <button type="button">×</button>
            </Dialog.Close>
          </div>
          <div>{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
