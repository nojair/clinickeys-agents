// packages/frontend/src/components/clinics/ClinicForm.tsx

"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import * as ct from "countries-and-timezones";
import { toast } from "sonner";
import { CheckCircle2, Bell } from "lucide-react";

import { Clinic, ClinicInput } from "@/app/types/clinic";
import { useClinics } from "@/hooks/useClinics";
import { useSaasClinics } from "@/hooks/useSaasClinics";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const Select = dynamic(() => import("react-select"), { ssr: false });

const TIMEZONES = Object.values(ct.getAllTimezones())
  .map((tz) => tz.name)
  .sort();

const COUNTRIES = Object.keys(ct.getAllCountries())
  .map((c) => c.toUpperCase())
  .sort();

const formSchema = z.object({
  subdomain: z.string().trim().min(1, "El subdominio es obligatorio"),
  timezone: z.string().trim().min(1, "La zona horaria es obligatoria"),
  default_country: z.string().trim().length(2, "Código ISO-3166-1 (p. ej. ES)"),
  id_salesbot: z
    .coerce.number()
    .int("Debe ser un número entero")
    .positive("Debe ser mayor que 0"),
  api_key: z.string().trim().min(1, "El token de kommo es obligatorio"),
});

type FormValues = z.infer<typeof formSchema>;
type Option = { value: string; label: string };

interface Props {
  initialValues: Clinic | null;
  onClose: () => void;
}

export default function ClinicForm({ initialValues, onClose }: Props) {
  const { create, update } = useClinics();
  const {
    query: { data: saasClinics = [], isLoading: loadingSaas },
  } = useSaasClinics();

  const isEdit = Boolean(initialValues);

  const [selectedOption, setSelectedOption] = React.useState<Option | null>(
    initialValues
      ? { value: initialValues.id_clinica, label: initialValues.name }
      : null,
  );

  React.useEffect(() => {
    if (!selectedOption && initialValues && saasClinics.length) {
      const match = saasClinics.find(
        (c) => String(c.id_clinica) === String(initialValues.id_clinica),
      );
      if (match) {
        setSelectedOption({ value: String(match.id_clinica), label: match.nombre_clinica });
      }
    }
  }, [saasClinics, initialValues, selectedOption]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues:
      initialValues ?? {
        subdomain: "",
        timezone: "Europe/Madrid",
        default_country: "ES",
        id_salesbot: 0,
        api_key: "",
      },
  });

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    if (!selectedOption) {
      toast.error("Debes seleccionar una clínica del SAAS");
      return;
    }
    const clinic = saasClinics.find((c) => String(c.id_clinica) === selectedOption.value);
    if (!clinic) {
      toast.error("La clínica seleccionada ya no está disponible");
      return;
    }

    const payload: ClinicInput = {
      id_clinica: selectedOption.value,
      name: selectedOption.label,
      ...data,
      fields_profile: "default_kommo_profile",
      entity: "BOT_CONFIG",
    };

    const cb = { onSuccess: onClose };
    isEdit
      ? update.mutate({ id: initialValues!.id_clinica, data: payload }, cb)
      : create.mutate(payload, cb);
  };

  const isPending = create.isPending || update.isPending;

  const saasOptions: Option[] = saasClinics.map((c) => ({
    value: String(c.id_clinica),
    label: c.nombre_clinica,
  }));

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <DialogHeader>
        <DialogTitle>{isEdit ? "Editar clínica" : "Nueva clínica"}</DialogTitle>
      </DialogHeader>

      <Field>
        <Label>Clínica (SAAS)</Label>
        {loadingSaas ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : (
          <Select
            options={saasOptions}
            value={selectedOption}
            onChange={(opt) => setSelectedOption(opt as Option | null)}
            placeholder="Buscar clínica…"
            isClearable
            classNamePrefix="rs"
            menuPlacement="auto"
          />
        )}
      </Field>

      <Field>
        <Label htmlFor="timezone">Zona horaria</Label>
        <Input id="timezone" list="tz-options" {...form.register("timezone")} />
        <datalist id="tz-options">
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz} />
          ))}
        </datalist>
        <Error name="timezone" />
      </Field>

      <Field>
        <Label htmlFor="default_country">Código de país por defecto para teléfonos</Label>
        <Input id="default_country" list="country-options" {...form.register("default_country")} />
        <datalist id="country-options">
          {COUNTRIES.map((code) => (
            <option key={code} value={code} />
          ))}
        </datalist>
        <Error name="default_country" />
      </Field>

      <Field>
        <Label htmlFor="subdomain" className="text-base font-medium text-foreground">
          Subdominio Kommo
        </Label>
        <p className="text-sm text-muted-foreground mb-2">
          Ejemplo: &quot;misubdominio&quot; en <span className="font-mono text-gray-500">https://misubdominio.kommo.com/</span>
        </p>
        <Input id="subdomain" {...form.register("subdomain")} placeholder="misubdominio" />
        <Error name="subdomain" />
      </Field>

      <Field>
        <Label htmlFor="api_key">Token de larga duración en kommo
          <Link
            href="https://es-developers.kommo.com/docs/token-de-larga-duraci%C3%B3n"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            (¿Cómo obtenerlo?)
          </Link>
        </Label>
        <Input id="api_key" {...form.register("api_key")} />
        <Error name="api_key" />
      </Field>

      {isEdit && initialValues && (
        <Field>
          <Label>Campos personalizados de Kommo (DEBEN SER TIPO "TEXTO LARGO")</Label>
          <p className="text-sm text-muted-foreground">
            Estos campos son necesarios para que el salesbot funcione correctamente.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {initialValues.kommo_leads_custom_fields
              .sort((a, b) => Number(a.exists) - Number(b.exists))
              .map((field) => (
                <span
                  key={field.field_name}
                  className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${field.exists
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                    }`}
                >
                  {field.exists ? (
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                  ) : (
                    <Bell className="w-4 h-4 mr-1" />
                  )}
                  {field.field_name}
                </span>
              ))}
          </div>
        </Field>
      )}

      <Field>
        <Label htmlFor="id_salesbot">
          ID del salesbot en Kommo{' '}
          <Link
            href="https://es-developers.kommo.com/reference/lanzar-un-salesbot"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            (¿Cómo obtenerlo?)
          </Link>
        </Label>
        <Input id="id_salesbot" type="number" {...form.register("id_salesbot")} />
        <Error name="id_salesbot" />
      </Field>

      <DialogFooter>
        <Button type="submit" disabled={isPending}>
          {isPending
            ? isEdit
              ? "Guardando…"
              : "Creando…"
            : isEdit
              ? "Guardar cambios"
              : "Crear clínica"}
        </Button>
      </DialogFooter>
    </form>
  );

  function Field({ children }: { children: React.ReactNode }) {
    return <div className="space-y-2">{children}</div>;
  }
  function Error({ name }: { name: keyof FormValues }) {
    const msg = form.formState.errors[name]?.message as string | undefined;
    return msg ? <p className="text-xs text-red-500">{msg}</p> : null;
  }
}
