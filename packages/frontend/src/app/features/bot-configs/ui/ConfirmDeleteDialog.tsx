// /features/bot-configs/ui/ConfirmDeleteDialog.tsx

import { Modal } from '@/app/shared/ui/Modal';
import { Button } from '@/app/shared/ui/Button';

interface ConfirmDeleteDialogProps {
  open: boolean;
  botName: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export function ConfirmDeleteDialog({ open, botName, onCancel, onConfirm, loading }: ConfirmDeleteDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} title="Eliminar configuración de Bot" width="28rem">
      <div className="py-4">
        <p className="mb-4 text-base text-center">
          ¿Estás seguro de que deseas eliminar el bot <span className="font-bold">{botName}</span>?
        </p>
        <p className="mb-6 text-sm text-red-600 text-center">
          Esta acción es <b>irreversible</b> y eliminará todas las integraciones asociadas.<br />
          Si es un ChatBot, también se eliminarán sus asistentes de OpenAI.
        </p>
        <div className="flex justify-center gap-4">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm} loading={loading}>
            Eliminar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
