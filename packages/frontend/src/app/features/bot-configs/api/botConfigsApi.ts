// /features/bot-configs/api/botConfigsApi.ts

import type { BotConfig } from "@/app/entities/bot-config/types";
import type {
  CreateBotConfigPayload,
  UpdateBotConfigPayload
} from "@/app/features/bot-configs/model/types";

/**
 * API para gestión de BotConfigs
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

export const botConfigsApi = {
  async getBotConfigs(): Promise<BotConfig[]> {
    const res = await fetch(`${API_BASE_URL}/bot-config/all`);
    if (!res.ok) throw new Error("Error al obtener bot configs");
    return res.json();
  },

  async getBotConfigById(id: string): Promise<BotConfig> {
    const res = await fetch(`${API_BASE_URL}/bots/${id}`);
    if (!res.ok) throw new Error("Error al obtener bot config");
    return res.json();
  },

  async createBotConfig(payload: CreateBotConfigPayload): Promise<BotConfig> {
    const res = await fetch(`${API_BASE_URL}/bots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Error al crear bot config");
    return res.json();
  },

  async updateBotConfig(id: string, payload: UpdateBotConfigPayload): Promise<BotConfig> {
    const res = await fetch(`${API_BASE_URL}/bots/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Error al actualizar bot config");
    return res.json();
  },

  async deleteBotConfig(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/bots/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Error al eliminar bot config");
  },

  async toggleIsEnabled(id: string, isEnabled: boolean): Promise<BotConfig> {
    const res = await fetch(`${API_BASE_URL}/bots/${id}/enabled`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isEnabled }),
    });
    if (!res.ok) throw new Error("Error al actualizar estado de habilitación");
    return res.json();
  },
};
