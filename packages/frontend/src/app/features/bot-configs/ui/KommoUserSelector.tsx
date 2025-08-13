'use client';
import React, { useMemo } from 'react';
import { useKommoUsers } from "@/app/features/bot-configs/model/useKommoUsers";
import { Select } from "@/app/shared/ui/Select";
import type { KommoUser } from "@/app/entities/kommo/types";
import { useDebounce } from "@/app/shared/lib/useDebounce";

interface KommoUserSelectorProps {
  subdomain?: string;
  token?: string;
  value?: string | number;
  onChange: (value?: string | number, user?: KommoUser) => void;
  label?: string;
  disabled?: boolean;
  error?: string;
}

export function KommoUserSelector({
  subdomain,
  token,
  value,
  onChange,
  label = 'Responsable Kommo',
  disabled = false,
  error,
}: KommoUserSelectorProps) {
  // Debounce a subdomain y token (convierte null/undefined a string vacío)
  const debouncedSubdomain = useDebounce(subdomain ?? '', 3000);
  const debouncedToken = useDebounce(token ?? '', 3000);

  // Solo activar la consulta cuando ambos valores debounced sean truthy
  const shouldQuery = Boolean(debouncedSubdomain) && Boolean(debouncedToken);

  const { data: users = [], isLoading, error: apiError } = useKommoUsers(
    shouldQuery ? debouncedSubdomain : undefined,
    shouldQuery ? debouncedToken : undefined
  );

  const options = useMemo(
    () => users.map((user) => ({
      value: user.id,
      label: `${user.name} (${user.email})`,
      user,
    })),
    [users]
  );

  return (
    <Select
      name="kommoResponsibleUserId"
      options={options}
      value={value}
      onChange={(val) => {
        const selected = users.find((u) => u.id === val);
        onChange(val, selected);
      }}
      label={label}
      disabled={disabled || isLoading}
      error={error || (apiError ? 'Error al obtener usuarios de Kommo' : undefined)}
      searchable
      placeholder={isLoading ? 'Cargando usuarios…' : 'Selecciona un usuario Kommo'}
    />
  );
}
