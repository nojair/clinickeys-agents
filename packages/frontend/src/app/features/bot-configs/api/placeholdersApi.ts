// /features/bot-configs/api/placeholdersApi.ts

import type { Placeholder } from "@/app/features/bot-configs/model/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

export const placeholdersApi = {
  async getDefaultPlaceholders(): Promise<Placeholder[]> {
    const res = await fetch(`${API_BASE_URL}/bots/placeholders`);
    if (!res.ok) throw new Error("Error al obtener placeholders");
    return res.json();
  },
};
