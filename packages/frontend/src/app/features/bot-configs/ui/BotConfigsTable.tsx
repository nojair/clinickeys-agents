"use client";
// /features/bot-configs/ui/BotConfigsTable.tsx

import { useState } from 'react';
import { useBotConfigs } from '@/app/features/bot-configs/model/useBotConfigs';
import { Button } from '@/app/shared/ui/Button';
import { Switch } from '@/app/shared/ui/Switch';
import { LoadingSpinner } from '@/app/shared/ui/LoadingSpinner';
import { Toast } from '@/app/shared/ui/Toast';
import { BotConfigFormModal } from './BotConfigFormModal';
import { WebhookCopyTooltip } from './WebhookCopyTooltip';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';
import type { BotConfig } from '@/app/entities/bot-config/types';

export function BotConfigsTable() {
  const {
    data: botConfigs,
    isLoading,
    error,
    refetch,
    toggleIsEnabled,
    isToggling,
    toggleError,
  } = useBotConfigs();

  // Estado para modal creación/edición
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<BotConfig | null>(null);

  // Estado para dialogo borrar
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState<string>('');

  // Feedback visual en tabla
  if (isLoading) {
    return <div className="flex justify-center py-10"><LoadingSpinner size={48} /></div>;
  }
  if (error) {
    return (
      <div className="py-8 text-center">
        <Toast message="Error al cargar bots." type="error" />
        <Button variant="secondary" onClick={() => refetch()}>Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-2">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Configuraciones de Bots</h1>
        <Button
          variant="primary"
          onClick={() => {
            setEditData(null);
            setModalOpen(true);
          }}
        >
          Crear Bot
        </Button>
      </div>
      <div className="overflow-x-auto bg-white rounded-2xl shadow">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-800">
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">Descripción</th>
              <th className="px-4 py-3 text-left">Kommo Subdominio</th>
              <th className="px-4 py-3 text-left">País</th>
              <th className="px-4 py-3 text-left">Zona horaria</th>
              <th className="px-4 py-3 text-center">Habilitado</th>
              <th className="px-4 py-3 text-center">Ready</th>
              <th className="px-4 py-3 text-left">Webhook</th>
              <th className="px-4 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {botConfigs?.length && botConfigs.map((config) => (
              <tr key={config.id} className="border-b last:border-none hover:bg-gray-50 transition">
                <td className="px-4 py-3">{config.botConfigType === 'notificationBot' ? 'Notification' : 'Chat'}</td>
                <td className="px-4 py-3 font-semibold">{config.name}</td>
                <td className="px-4 py-3">{config.description}</td>
                <td className="px-4 py-3">{config.kommoSubdomain}</td>
                <td className="px-4 py-3">{config.defaultCountry}</td>
                <td className="px-4 py-3">{config.timezone}</td>
                <td className="px-4 py-3 text-center">
                  <Switch
                    checked={!!config.isEnabled}
                    onChange={(checked) => toggleIsEnabled(config.id, checked)}
                    aria-label={`Toggle habilitado para ${config.name}`}
                    disabled={isToggling}
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  {config.isReady ? (
                    <span className="text-green-600 font-semibold">Sí</span>
                  ) : (
                    <span className="text-gray-400">No</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {config.botConfigType === 'chatBot' ? (
                    <WebhookCopyTooltip config={config} />
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex gap-2 justify-center">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setEditData(config);
                        setModalOpen(true);
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        setDeleteId(config.id);
                        setDeleteName(config.name);
                      }}
                    >
                      Eliminar
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Modal crear/editar */}
      {modalOpen && (
        <BotConfigFormModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          initialData={editData}
        />
      )}
      {/* Dialogo eliminar */}
      {deleteId && (
        <ConfirmDeleteDialog
          open={!!deleteId}
          botName={deleteName}
          onCancel={() => setDeleteId(null)}
          onConfirm={() => {
            // Eliminar desde hook, y luego cerrar dialogo
            // El flujo real debe usar el hook correctamente
            setDeleteId(null);
            refetch();
          }}
        />
      )}
      {/* Toast error toggle habilitado */}
      {toggleError && <Toast message="Error al actualizar habilitado." type="error" />}
    </div>
  );
}
