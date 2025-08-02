// /features/bot-configs/ui/BotConfigFormStepReview.tsx

import { Button } from '@/app/shared/ui/Button';
import { TextInput } from '@/app/shared/ui/TextInput';
import type { UseFormReturn } from 'react-hook-form';
import type { BotConfigType } from '@/app/entities/bot-config/types';

interface BotConfigFormStepReviewProps {
  methods: UseFormReturn<any>;
  botType?: BotConfigType;
  placeholders: Record<string, string>;
  isEditMode: boolean;
  onPrev?: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function BotConfigFormStepReview({
  methods,
  botType,
  placeholders,
  isEditMode,
  onPrev,
  onSubmit,
  isSubmitting,
}: BotConfigFormStepReviewProps) {
  const { getValues } = methods;
  const values = getValues();

  // Renderiza resumen de todos los campos
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <h2 className="text-lg font-semibold mb-2">Revisa tu configuración</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextInput label="Nombre" value={values.name} disabled />
        <TextInput label="Descripción" value={values.description} disabled />
        <TextInput label="Kommo Subdominio" value={values.kommoSubdomain} disabled />
        <TextInput label="Kommo Long Lived Token" value={values.kommoLongLivedToken} disabled />
        <TextInput label="Kommo Responsible User ID" value={values.kommoResponsibleUserId} disabled />
        <TextInput label="Kommo Salesbot ID" value={values.kommoSalesbotId} disabled />
        <TextInput label="Clínica ID" value={values.clinicId} disabled />
        <TextInput label="Super Clínica ID" value={values.superClinicId} disabled />
        <TextInput label="País por defecto" value={values.defaultCountry} disabled />
        <TextInput label="Zona horaria" value={values.timezone} disabled />
        <TextInput label="fieldsProfile" value="kommo_profile" disabled />
        <TextInput label="clinicSource" value="legacy" disabled />
        <TextInput label="¿Habilitado?" value={values.isEnabled ? 'Sí' : 'No'} disabled />
        {botType === 'chatBot' && (
          <TextInput label="OpenAI Token" value={values.openaiToken} disabled />
        )}
      </div>
      {botType === 'chatBot' && (
        <div>
          <h3 className="text-md font-semibold mt-4 mb-2">Placeholders</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.entries(placeholders).map(([key, value]) => (
              <TextInput key={key} label={key} value={value} disabled />
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-2 pt-6">
        {onPrev && (
          <Button type="button" variant="secondary" onClick={onPrev}>
            Atrás
          </Button>
        )}
        <Button type="submit" variant="primary" loading={isSubmitting}>
          {isEditMode ? 'Guardar Cambios' : 'Crear Bot'}
        </Button>
      </div>
    </form>
  );
}
