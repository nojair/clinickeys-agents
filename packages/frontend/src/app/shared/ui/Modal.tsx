"use client";
// /shared/ui/Modal.tsx

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import clsx from 'clsx';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Ancho máximo del modal (ej. '42rem' o 600). */
  width?: string | number;
  /** Contenido principal que tendrá scroll si es necesario. */
  children: ReactNode;
  /** Contenido fijo en la parte inferior (botones, etc.). */
  footer?: ReactNode;
}

/**
 * Modal genérico sobre Radix Dialog.
 * — Cabecera fija.
 * — Cuerpo con scroll interno.
 * — Footer fijo (opcional) fuera del scroll.
 */
export function Modal({ open, onClose, title, width = '32rem', children, footer }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(val) => !val && onClose()}>
      <Dialog.Portal>
        {/* Overlay */}
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 animate-fade-in" />

        {/* Contenedor principal */}
        <Dialog.Content
          className={clsx(
            'fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100vh-4rem)] w-full max-w-full',
            '-translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl bg-white shadow-2xl',
            'focus:outline-none'
          )}
          style={{ width }}
        >
          {/* Cabecera */}
          <div className="mb-4 flex shrink-0 items-center justify-between px-6 py-4 border-b">
            <Dialog.Title className="text-lg font-bold">{title}</Dialog.Title>
            <Dialog.Close asChild aria-label="Cerrar">
              <button
                type="button"
                className="p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 cursor-pointer focus:outline-none"
              >
                <X size={20} />
              </button>
            </Dialog.Close>
          </div>

          {/* Cuerpo con scroll */}
          <div className="flex-1 overflow-y-auto overflow-x-visible px-6 py-4">
            {children}
          </div>

          {/* Footer fijo (opcional) */}
          {footer && (
            <div className="mt-4 shrink-0 px-6 py-4 border-t bg-gray-50">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
