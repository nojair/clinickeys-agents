// packages/frontend/src/components/clinics/ClinicsTable.tsx

"use client";

import * as React from "react";
import { Plus, Pencil, Trash2, CheckCircle2, Bell } from "lucide-react";

import { useClinics } from "@/hooks/useClinics";
import { Clinic } from "@/app/types/clinic";

import ClinicForm from "@/components/clinics/ClinicForm";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function ClinicsTable() {
  const { query, remove } = useClinics();
  const [selected, setSelected] = React.useState<Clinic | null>(null);
  const [mode, setMode] = React.useState<"create" | "edit" | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Clinic | null>(null);

  const isLoading = query.isLoading;
  const error = query.error;
  const clinics = query.data ?? [];

  return (
    <div className="p-6 space-y-4">
      {/* Header y diálogo de creación */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Recordatorios Clínicas CK - {process.env.NEXT_PUBLIC_STAGE}</h1>
        <Dialog
          open={mode === "create"}
          onOpenChange={(open: any) => {
            if (!open) {
              setMode(null);
              setSelected(null);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={() => setMode("create")}>  
              <Plus className="w-4 h-4 mr-2" />
              Nueva clínica
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <ClinicForm
              initialValues={null}
              onClose={() => {
                setMode(null);
                setSelected(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabla */}
      <table className="w-full table-auto text-sm border-collapse">
        <thead>
          <tr className="border-b">
            <Th>Nombre</Th>
            <Th>Subdominio</Th>
            <Th>Estado</Th>
            <Th>Acciones</Th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <Td colSpan={4} className="text-center p-4">
                Cargando clínicas…
              </Td>
            </tr>
          ) : error ? (
            <tr>
              <Td colSpan={4} className="text-center p-4 text-red-600">
                {(error as Error).message}
              </Td>
            </tr>
          ) : (
            clinics.map((c) => (
              <tr key={c.clinicId} className="border-b">
                <Td>{c.name}</Td>
                <Td>{c.subdomain}</Td>
                <Td>
                  <span title={c.is_ready ? "Clínica lista" : "Acción pendiente"}>
                    {c.is_ready ? (
                      <CheckCircle2
                        className="w-5 h-5 text-green-500"
                        aria-label="Clínica lista"
                      />
                    ) : (
                      <Bell
                        className="w-5 h-5 text-red-500"
                        aria-label="Acción pendiente"
                      />
                    )}
                  </span>
                </Td>
                <Td>
                  <div className="flex gap-2">
                    {/* Diálogo de edición */}
                    <Dialog
                      open={mode === "edit" && selected?.clinicId === c.clinicId}
                      onOpenChange={(open: any) => {
                        if (!open) {
                          setMode(null);
                          setSelected(null);
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelected(c);
                            setMode("edit");
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <ClinicForm
                          initialValues={c}
                          onClose={() => {
                            setMode(null);
                            setSelected(null);
                          }}
                        />
                      </DialogContent>
                    </Dialog>

                    {/* Diálogo de eliminación */}
                    <Dialog
                      open={deleteTarget?.clinicId === c.clinicId}
                      onOpenChange={(open: any) => {
                        if (!open) setDeleteTarget(null);
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => setDeleteTarget(c)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Eliminar clínica</DialogTitle>
                          <DialogDescription>
                            ¿Estás seguro de eliminar la clínica “{c.name}”? Esta acción es irreversible.
                          </DialogDescription>
                        </DialogHeader>

                        <DialogFooter className="pt-4">
                          <Button
                            variant="outline"
                            onClick={() => setDeleteTarget(null)}
                          >
                            Cancelar
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() =>
                              remove.mutate(
                                { id: c.clinicId },
                                { onSuccess: () => setDeleteTarget(null) }
                              )
                            }
                            disabled={remove.isPending}
                          >
                            {remove.isPending ? "Eliminando…" : "Eliminar"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  function Th({ children }: { children: React.ReactNode }) {
    return <th className="px-2 py-1 text-left">{children}</th>;
  }
  function Td({ children, colSpan, className }: { children: React.ReactNode; colSpan?: number; className?: string }) {
    return <td className={className || `px-2 py-1`} colSpan={colSpan}>{children}</td>;
  }
}
