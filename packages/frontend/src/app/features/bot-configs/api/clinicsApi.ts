// /features/bot-configs/api/clinicsApi.ts

import type { Clinic } from "@/app/entities/clinic/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

export const clinicsApi = {
  async getClinics(): Promise<Clinic[]> {
    const res = await fetch(`${API_BASE_URL}/clinics`);
    if (!res.ok) throw new Error("Error al obtener clínicas");
    const data: Clinic[] = await res.json();
    // Ordenar por nombre alfabéticamente (por UX)
    return data.sort((a, b) => a.name.localeCompare(b.name));
  },
};
