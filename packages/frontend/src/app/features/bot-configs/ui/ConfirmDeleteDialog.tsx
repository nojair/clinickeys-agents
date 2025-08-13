import { Modal } from '@/app/shared/ui/Modal';
import { Button } from '@/app/shared/ui/Button';

interface ConfirmDeleteDialogProps {
  open: boolean;
  botName: string;
  onCancel: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  error?: boolean;
}

export function ConfirmDeleteDialog({
  open,
  botName,
  onCancel,
  onConfirm,
  isLoading = false,
  error = false,
}: ConfirmDeleteDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} title="Eliminar configuración de Bot" width="28rem">
      <div className="py-4">
        <p className="mb-4 text-base text-center">
          ¿Estás seguro de que deseas eliminar el <span className="font-bold">{botName}</span>?
        </p>
        <p className="mb-6 text-sm text-red-600 text-center">
          Esta acción es <b>irreversible</b>.
          <br />
          Si es un ChatBot, también se eliminarán sus asistentes de OpenAI.
        </p>
        {error && ( 
          <div className="mb-4 text-center text-red-500 text-sm">
            Error al eliminar el bot. Intenta nuevamente.
          </div>
        )}
        <div className="flex justify-center gap-4">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm} loading={isLoading}>
            Eliminar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
