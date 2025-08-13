// packages/core/src/application/usecases/UpdateBotConfigUseCase.ts

import { BotConfigService } from "@clinickeys-agents/core/application/services";
import { BotConfigDTO, BotConfigType } from '@clinickeys-agents/core/domain/botConfig';

// Campos que se permiten actualizar vía PATCH
export type UpdateBotConfigPayload = Partial<Pick<BotConfigDTO,
  | "isEnabled"
  | "description"
  | "timezone"
  | "defaultCountry"
  | "kommo"
  | "kommoSubdomain"
>>;

export interface UpdateBotConfigInput {
  botConfigType: BotConfigType;
  botConfigId: string;
  clinicSource: string;
  clinicId: number;
  updates: UpdateBotConfigPayload;
}

export interface UpdateBotConfigUseCaseProps {
  botConfigService: BotConfigService;
}

function toNumberOrUndefined(v: unknown): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Normaliza el payload de updates para aceptar claves planas del cliente y
 * mapearlas al objeto anidado `kommo`, manteniendo además `kommoSubdomain`
 * a nivel raíz (útil para el GSI byKommoSubdomain).
 *
 * Claves planas aceptadas (además de las tipadas en UpdateBotConfigPayload):
 * - kommoSubdomain           -> kommo.subdomain + kommoSubdomain
 * - kommoLongLivedToken      -> kommo.longLivedToken
 * - kommoResponsibleUserId   -> kommo.responsibleUserId (number)
 * - kommoSalesbotId          -> kommo.salesbotId (number)
 */
function normalizeUpdates(updates: UpdateBotConfigPayload): UpdateBotConfigPayload {
  const raw: any = { ...(updates as any) };

  // Construir el objeto kommo combinando lo que venga anidado y lo plano
  const kommo: any = { ...(raw.kommo ?? {}) };

  const subdomain = raw.kommoSubdomain ?? raw.kommo?.subdomain ?? raw.kommoSubDomain;
  if (subdomain) kommo.subdomain = String(subdomain);

  if (raw.kommoLongLivedToken) {
    kommo.longLivedToken = String(raw.kommoLongLivedToken);
  }

  const responsibleUserId = toNumberOrUndefined(raw.kommoResponsibleUserId);
  if (responsibleUserId !== undefined) {
    kommo.responsibleUserId = responsibleUserId;
  }

  const salesbotId = toNumberOrUndefined(raw.kommoSalesbotId);
  if (salesbotId !== undefined) {
    kommo.salesbotId = salesbotId;
  }

  // Limpiar las claves planas para que no acaben como atributos top-level
  delete raw.kommoLongLivedToken;
  delete raw.kommoResponsibleUserId;
  delete raw.kommoSalesbotId;
  delete raw.kommoSubDomain; // variante por si llega con D mayúscula

  // Si construimos algo útil en kommo, lo colocamos en el payload
  if (kommo && Object.keys(kommo).length > 0) {
    raw.kommo = kommo;
  }

  // Asegurar coherencia de kommoSubdomain top-level si tenemos subdomain
  if (subdomain) {
    raw.kommoSubdomain = String(subdomain);
  }

  // Eliminar objetos vacíos que no aportan nada
  if (raw.kommo && Object.keys(raw.kommo).length === 0) {
    delete raw.kommo;
  }

  return raw as UpdateBotConfigPayload;
}

export class UpdateBotConfigUseCase {
  private readonly botConfigService: BotConfigService;

  constructor(props: UpdateBotConfigUseCaseProps) {
    this.botConfigService = props.botConfigService;
  }

  async execute(input: UpdateBotConfigInput): Promise<void> {
    const normalized = normalizeUpdates(input.updates);
    if (!normalized || Object.keys(normalized).length === 0) return; // nada que hacer

    await this.botConfigService.patchBotConfig(
      input.botConfigType,
      input.botConfigId,
      input.clinicSource,
      input.clinicId,
      normalized
    );
  }
}
