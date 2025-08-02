// /features/bot-configs/ui/BotConfigFormStepPlaceholders.tsx

import { useEffect } from 'react';
import { Button } from '@/app/shared/ui/Button';
import { TextInput } from '@/app/shared/ui/TextInput';
import { usePlaceholders } from '@/app/features/bot-configs/model/usePlaceholders';

interface BotConfigFormStepPlaceholdersProps {
  placeholders: Record<string, string>;
  setPlaceholders: (val: Record<string, string>) => void;
  onNext: () => void;
  onPrev: () => void;
  isEditMode: boolean;
}

export function BotConfigFormStepPlaceholders({
  placeholders,
  setPlaceholders,
  onNext,
  onPrev,
  isEditMode,
}: BotConfigFormStepPlaceholdersProps) {
  const { data: defaultPlaceholders, isLoading, error, refetch } = usePlaceholders();

  // Sincronizar placeholders locales con los default al montar (solo en creación)
  useEffect(() => {
    if (!isEditMode && defaultPlaceholders.length > 0) {
      const initial: Record<string, string> = {};
      defaultPlaceholders.forEach((ph) => {
        initial[ph.key] = '';
      });
      setPlaceholders(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultPlaceholders, isEditMode]);

  // Handler de cambio
  const handleChange = (key: string, value: string) => {
    setPlaceholders({ ...placeholders, [key]: value });
  };

  if (isLoading) {
    return <div className="py-8 text-center text-muted">Cargando placeholders...</div>;
  }
  if (error) {
    return (
      <div className="py-8 text-center text-danger">
        Error al cargar placeholders.
        <Button variant="secondary" onClick={() => refetch()}>Reintentar</Button>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onNext();
      }}
    >
      <h2 className="text-lg font-semibold mb-2">Personaliza los Placeholders</h2>
      <p className="text-muted-foreground text-sm mb-4">
        Puedes dejar campos vacíos o personalizarlos según tus necesidades. Estos valores serán usados por el bot para completar mensajes dinámicos.
      </p>
      {defaultPlaceholders.map((ph) => (
        <TextInput
          key={ph.key}
          label={ph.label}
          value={placeholders[ph.key] || ''}
          onChange={(val) => handleChange(ph.key, val)}
          disabled={isEditMode}
        />
      ))}
      <div className="flex gap-2 pt-6">
        <Button type="button" variant="secondary" onClick={onPrev}>
          Atrás
        </Button>
        <Button type="submit" variant="primary">
          Siguiente
        </Button>
      </div>
    </form>
  );
}
