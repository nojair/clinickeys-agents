'use client';
// /features/bot-configs/ui/BotConfigFormModal.tsx

import { useState } from 'react';
import { Modal } from '@/app/shared/ui/Modal';
import { useBotConfigs } from '@/app/features/bot-configs/model/useBotConfigs';
import { BotConfigFormStepType } from '@/app/features/bot-configs/ui/BotConfigFormStepType';
import { BotConfigFormStepGeneral } from '@/app/features/bot-configs/ui/BotConfigFormStepGeneral';
import { BotConfigFormStepPlaceholders } from '@/app/features/bot-configs/ui/BotConfigFormStepPlaceholders';
import { BotConfigFormStepReview } from '@/app/features/bot-configs/ui/BotConfigFormStepReview';
import type { CreateBotConfigPayload, UpdateBotConfigPayload } from '@/app/features/bot-configs/model/types';
import type { BotConfig, BotConfigType } from '@/app/entities/bot-config/types';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createBotConfigSchema, updateBotConfigSchema } from '@/app/features/bot-configs/model/formSchemas';
import { toast } from 'sonner';

const STEP_TYPE = 0;
const STEP_GENERAL = 1;
const STEP_PLACEHOLDERS = 2;
const STEP_REVIEW = 3;

export interface BotConfigFormModalProps {
  open: boolean;
  onClose: () => void;
  initialData?: BotConfig | null;
}

export function BotConfigFormModal({ open, onClose, initialData }: BotConfigFormModalProps) {
  const [step, setStep] = useState(initialData ? STEP_GENERAL : STEP_TYPE);
  const [botType, setBotType] = useState<BotConfigType | undefined>(initialData?.botConfigType);
  const [placeholders, setPlaceholders] = useState<Record<string, string>>(initialData?.placeholders ?? {});

  // Hooks de react-query (usando mutations "crudas")
  const {
    createBotConfigMutation,
    updateBotConfigMutation,
    isCreating,
    isUpdating,
  } = useBotConfigs();

  // Form RHF
  const isEditMode = Boolean(initialData);
  const schema = isEditMode ? updateBotConfigSchema : createBotConfigSchema;
  // Solo los campos válidos para defaultValues
  const initialFormValues = initialData
    ? Object.fromEntries(
        Object.entries(initialData).filter(
          ([key]) =>
            [
              'name',
              'description',
              'kommoSubdomain',
              'kommoLongLivedToken',
              'kommoResponsibleUserId',
              'kommoSalesbotId',
              'defaultCountry',
              'timezone',
              'isEnabled',
              'fieldsProfile',
              'clinicSource',
              'clinicId',
              'superClinicId',
              'openaiToken',
            ].includes(key)
        )
      )
    : undefined;

  const methods = useForm({
    resolver: zodResolver(schema),
    defaultValues: initialFormValues,
    mode: 'onChange',
  });

  // Steps control
  const nextStep = () => setStep((s) => s + 1);
  const prevStep = () => setStep((s) => s - 1);

  // Cerrar modal y limpiar estado
  const handleClose = () => {
    setStep(isEditMode ? STEP_GENERAL : STEP_TYPE);
    setBotType(initialData?.botConfigType);
    setPlaceholders(initialData?.placeholders ?? {});
    methods.reset(initialFormValues ?? {});
    onClose();
  };

  // Guardar o crear (ahora sí: callbacks en mutate)
  const handleSubmit = (data: any) => {
    const payload: CreateBotConfigPayload | UpdateBotConfigPayload = {
      ...data,
      ...(botType ? { botConfigType: botType } : {}),
      placeholders: botType === 'chatBot' ? placeholders : undefined,
    };

    if (isEditMode && initialData) {
      updateBotConfigMutation.mutate(
        { id: initialData.id, payload: payload as UpdateBotConfigPayload },
        {
          onSuccess: () => {
            toast.success('Bot actualizado correctamente');
            handleClose();
          },
          onError: (err: any) => {
            toast.error(err?.message || 'Error al actualizar bot');
          },
        }
      );
    } else {
      createBotConfigMutation.mutate(
        payload as CreateBotConfigPayload,
        {
          onSuccess: () => {
            toast.success('Bot creado correctamente');
            handleClose();
          },
          onError: (err: any) => {
            toast.error(err?.message || 'Error al crear bot');
          },
        }
      );
    }
  };

  // Render de steps
  let content = null;
  if (step === STEP_TYPE) {
    content = (
      <BotConfigFormStepType
        value={botType}
        onChange={(type) => {
          setBotType(type);
          nextStep();
        }}
      />
    );
  } else if (step === STEP_GENERAL) {
    content = (
      <BotConfigFormStepGeneral
        methods={methods}
        botType={botType}
        onNext={nextStep}
        onPrev={isEditMode ? undefined : prevStep}
        isEditMode={isEditMode}
        setPlaceholders={setPlaceholders}
      />
    );
  } else if (step === STEP_PLACEHOLDERS && botType === 'chatBot') {
    content = (
      <BotConfigFormStepPlaceholders
        placeholders={placeholders}
        setPlaceholders={setPlaceholders}
        onNext={nextStep}
        onPrev={prevStep}
        isEditMode={isEditMode}
      />
    );
  } else if (step === STEP_REVIEW) {
    content = (
      <BotConfigFormStepReview
        methods={methods}
        botType={botType}
        placeholders={placeholders}
        isEditMode={isEditMode}
        onPrev={botType === 'chatBot' ? prevStep : isEditMode ? undefined : prevStep}
        onSubmit={methods.handleSubmit(handleSubmit)}
        isSubmitting={isEditMode ? isUpdating : isCreating}
      />
    );
  }

  // Título modal
  const title = isEditMode
    ? 'Editar Bot Configuración'
    : 'Crear Bot Configuración';

  return (
    <Modal open={open} onClose={handleClose} title={title} width="42rem">
      <FormProvider {...methods}>{content}</FormProvider>
    </Modal>
  );
}
