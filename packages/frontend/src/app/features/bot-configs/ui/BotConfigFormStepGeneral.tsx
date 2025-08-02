'use-client';
// /features/bot-configs/ui/BotConfigFormStepGeneral.tsx

import { useEffect } from 'react';
import { Button } from '@/app/shared/ui/Button';
import { TextInput } from '@/app/shared/ui/TextInput';
import { Select } from '@/app/shared/ui/Select';
import { Switch } from '@/app/shared/ui/Switch';
import { useClinics } from '@/app/features/bot-configs/model/useClinics';
import { Controller } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';
import type { BotConfigType } from '@/app/entities/bot-config/types';

interface BotConfigFormStepGeneralProps {
  methods: UseFormReturn<any>;
  botType?: BotConfigType;
  onNext: () => void;
  onPrev?: () => void;
  isEditMode: boolean;
  setPlaceholders: (val: Record<string, string>) => void;
}

export function BotConfigFormStepGeneral({
  methods,
  botType,
  onNext,
  onPrev,
  isEditMode,
  setPlaceholders,
}: BotConfigFormStepGeneralProps) {
  const {
    control,
    formState: { errors, isValid },
    watch,
    setValue,
  } = methods;

  // Traer clínicas y mapear a opciones
  const { data: clinics, isLoading: loadingClinics, error: clinicsError } = useClinics();
  const clinicOptions = clinics.map((c) => ({
    value: c.id_clinica,
    label: `${c.name} (ID: ${c.id_clinica}, SuperID: ${c.id_super_clinica})`,
    superClinicId: c.id_super_clinica,
  }));

  // Actualizar superClinicId al seleccionar clínica
  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === 'clinicId') {
        const clinic = clinics.find((c) => c.id_clinica === value.clinicId);
        if (clinic) {
          setValue('superClinicId', clinic.id_super_clinica);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [clinics, setValue, watch]);

  // Estados para campos openaiToken (solo chatBot)
  const showOpenaiToken = botType === 'chatBot';

  // Handler submit
  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    onNext();
  };

  return (
    <form onSubmit={handleNext} className="space-y-4">
      <Controller
        name="name"
        control={control}
        render={({ field }) => (
          <TextInput
            label="Nombre"
            value={field.value}
            onChange={field.onChange}
            error={errors.name?.message as string}
            disabled={isEditMode}
          />
        )}
      />
      <Controller
        name="description"
        control={control}
        render={({ field }) => (
          <TextInput
            label="Descripción"
            value={field.value}
            onChange={field.onChange}
            error={errors.description?.message as string}
          />
        )}
      />
      <Controller
        name="kommoSubdomain"
        control={control}
        render={({ field }) => (
          <TextInput
            label="Kommo Subdominio"
            value={field.value}
            onChange={field.onChange}
            error={errors.kommoSubdomain?.message as string}
          />
        )}
      />
      <Controller
        name="kommoLongLivedToken"
        control={control}
        render={({ field }) => (
          <TextInput
            label="Kommo Long Lived Token"
            value={field.value}
            onChange={field.onChange}
            error={errors.kommoLongLivedToken?.message as string}
          />
        )}
      />
      <Controller
        name="kommoResponsibleUserId"
        control={control}
        render={({ field }) => (
          <TextInput
            label="Kommo Responsible User ID"
            value={field.value}
            onChange={field.onChange}
            error={errors.kommoResponsibleUserId?.message as string}
          />
        )}
      />
      <Controller
        name="kommoSalesbotId"
        control={control}
        render={({ field }) => (
          <TextInput
            label="Kommo Salesbot ID"
            value={field.value}
            onChange={field.onChange}
            error={errors.kommoSalesbotId?.message as string}
          />
        )}
      />
      <Controller
        name="clinicId"
        control={control}
        render={({ field }) => (
          <Select
            label="Clínica"
            options={clinicOptions}
            value={field.value}
            onChange={(val) => field.onChange(val)}
            error={errors.clinicId?.message as string}
            disabled={loadingClinics}
          />
        )}
      />
      <Controller
        name="superClinicId"
        control={control}
        render={({ field }) => (
          <TextInput
            label="Super Clínica ID"
            value={field.value}
            onChange={field.onChange}
            disabled
          />
        )}
      />
      <Controller
        name="defaultCountry"
        control={control}
        render={({ field }) => (
          <TextInput
            label="País por defecto"
            value={field.value}
            onChange={field.onChange}
            error={errors.defaultCountry?.message as string}
          />
        )}
      />
      <Controller
        name="timezone"
        control={control}
        render={({ field }) => (
          <TextInput
            label="Zona horaria"
            value={field.value}
            onChange={field.onChange}
            error={errors.timezone?.message as string}
          />
        )}
      />
      {showOpenaiToken && (
        <Controller
          name="openaiToken"
          control={control}
          render={({ field }) => (
            <TextInput
              label="OpenAI Token"
              value={field.value}
              onChange={field.onChange}
              error={errors.openaiToken?.message as string}
              disabled={isEditMode}
            />
          )}
        />
      )}
      <Controller
        name="isEnabled"
        control={control}
        render={({ field }) => (
          <div className="flex items-center gap-2">
            <Switch
              checked={!!field.value}
              onChange={field.onChange}
              aria-label="¿Habilitado?"
            />
            <span className="text-sm">Habilitado</span>
          </div>
        )}
      />
      {/* Campos readonly "fieldsProfile" y "clinicSource" */}
      <TextInput label="fieldsProfile" value="kommo_profile" disabled />
      <TextInput label="clinicSource" value="legacy" disabled />
      <div className="flex gap-2 pt-6">
        {onPrev && (
          <Button type="button" variant="secondary" onClick={onPrev}>
            Atrás
          </Button>
        )}
        <Button type="submit" variant="primary" disabled={!isValid}>
          Siguiente
        </Button>
      </div>
    </form>
  );
}
