// packages/core/src/interface/controllers/LeadWebhookController.ts

import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import qs from "qs";
import crypto from "crypto";

import { KommoLeadEventDTO, LeadQueueMessageDTO } from "@clinickeys-agents/core/domain/kommo";
import { ProcessLeadWebhookUseCase } from "@clinickeys-agents/core/application/usecases";
import { MessageQueuePort } from "@clinickeys-agents/core/application/ports";
import { Logger } from "@clinickeys-agents/core/infrastructure/external";

/**
 * Controlador que atiende el webhook de Kommo y publica un mensaje en la cola FIFO.
 * Sigue los principios de Clean Architecture:
 *   – Nada de lógica de infraestructura (SDK) fuera de puertos.
 *   – Orquesta un único caso de uso de aplicación.
 */
export class LeadWebhookController {
  constructor(
    private readonly processUseCase: ProcessLeadWebhookUseCase,
    private readonly queue: MessageQueuePort,
    private readonly logger: typeof Logger,
  ) {}

  /**
   * Punto de entrada invocado por el handler Lambda.
   */
  async handle(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
    this.logger.info("Webhook event received", {
      headers: event.headers,
      isBase64Encoded: event.isBase64Encoded,
      bodyPreview: event.body?.slice(0, 300),
    });

    // ──────────────────────────────────────────────────────────────
    // 1. Decodificar el cuerpo (base64 → UTF‑8) y parsear JSON / urlencoded
    // ──────────────────────────────────────────────────────────────
    let rawBody = event.body ?? "";

    if (event.isBase64Encoded) {
      try {
        rawBody = Buffer.from(rawBody, "base64").toString("utf8");
      } catch (err) {
        this.logger.error("Base64 decode error", err as Error);
        return this.badRequest("Invalid base64 body");
      }
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      try {
        parsed = qs.parse(decodeURIComponent(rawBody));
      } catch (err) {
        this.logger.error("Body parse error", err as Error);
        return this.badRequest("Unable to parse body");
      }
    }

    // Kommo envía un array con un único objeto; normalizamos
    const payload = Array.isArray(parsed) ? (parsed as any)[0] : (parsed as any);

    // ──────────────────────────────────────────────────────────────
    // 2. Mapear a DTO de aplicación
    // ──────────────────────────────────────────────────────────────
    const dto: KommoLeadEventDTO = {
      leads: {
        add: payload?.leads?.add ?? [],
      },
      account: {
        id: String(payload?.account?.id ?? ""),
        subdomain: String(payload?.account?.subdomain ?? ""),
      },
      raw: payload,
    };

    const leadId: string | undefined = dto.leads.add?.[0]?.id;
    if (!leadId) {
      this.logger.error("Lead ID missing", dto);
      return this.badRequest("Lead ID not found in payload");
    }

    // ──────────────────────────────────────────────────────────────
    // 3. Construir mensaje de cola mediante el Use Case
    // ──────────────────────────────────────────────────────────────
    let queueMessage: LeadQueueMessageDTO;
    try {
      queueMessage = await this.processUseCase.execute(dto, event.queryStringParameters ?? {});
    } catch (err) {
      this.logger.error("ProcessLeadWebhookUseCase failed", err as Error);
      return this.serverError("Internal processing error");
    }

    // ──────────────────────────────────────────────────────────────
    // 4. Publicar en la cola FIFO vía puerto de Mensajería
    // ──────────────────────────────────────────────────────────────
    const dedupId = crypto
      .createHash("sha256")
      .update(`${leadId}:${Date.now()}`)
      .digest("hex");

    try {
      await this.queue.send(queueMessage, {
        groupId: leadId,
        deduplicationId: dedupId,
      });
    } catch (err) {
      this.logger.error("Queue publication failed", err as Error);
      return this.serverError("Error enqueuing message");
    }

    // ──────────────────────────────────────────────────────────────
    // 5. Responder 202 Accepted
    // ──────────────────────────────────────────────────────────────
    return {
      statusCode: 202,
      body: JSON.stringify({ message: "Evento recibido y encolado." }),
    };
  }

  // Helpers -------------------------------------------------------

  private badRequest(msg: string): APIGatewayProxyStructuredResultV2 {
    return { statusCode: 400, body: JSON.stringify({ error: msg }) };
  }

  private serverError(msg: string): APIGatewayProxyStructuredResultV2 {
    return { statusCode: 500, body: JSON.stringify({ error: msg }) };
  }
}
