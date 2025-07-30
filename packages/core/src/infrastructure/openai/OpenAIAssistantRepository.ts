import { OpenAIGateway } from "@clinickeys-agents/core/infrastructure/integrations/openai";
import {
  Assistant,
  CreateAssistantPayload,
  UpdateAssistantPayload,
  Thread,
  Run,
  OpenAIMessageResponse,
  SubmitToolOutputsPayload,
} from "@clinickeys-agents/core/infrastructure/integrations/openai/models";

import { IOpenAIAssistantRepository } from "@clinickeys-agents/core/domain/openai";

/**
 * Repositorio para gestionar Assistants y Threads de OpenAI usando OpenAIGateway
 */
export class OpenAIAssistantRepository implements IOpenAIAssistantRepository {
  private gateway: OpenAIGateway;

  constructor(
    gateway: OpenAIGateway
  ) {
    this.gateway = gateway;
  }

  // =========================== Assistants ===========================

  async listAssistants(): Promise<Assistant[]> {
    return this.gateway.listAssistants();
  }

  async getAssistant(assistantId: string): Promise<Assistant> {
    return this.gateway.getAssistant(assistantId);
  }

  async createAssistant(
    payload: CreateAssistantPayload
  ): Promise<Assistant> {
    return this.gateway.createAssistant(payload);
  }

  async updateAssistant(
    assistantId: string,
    payload: UpdateAssistantPayload
  ): Promise<Assistant> {
    return this.gateway.updateAssistant(assistantId, payload);
  }

  async deleteAssistant(assistantId: string): Promise<void> {
    return this.gateway.deleteAssistant(assistantId);
  }

  // =========================== Threads & Runs ===========================

  async createThread(): Promise<Thread> {
    return this.gateway.createThread();
  }

  async listRuns(threadId: string, limit?: number): Promise<Run[]> {
    return this.gateway.listRuns(threadId, limit);
  }

  async retrieveRun(threadId: string, runId: string): Promise<Run> {
    return this.gateway.retrieveRun(threadId, runId);
  }

  async cancelRun(threadId: string, runId: string): Promise<Run> {
    return this.gateway.cancelRun(threadId, runId);
  }

  async createRun(
    threadId: string,
    assistantId: string,
    message: string
  ): Promise<Run> {
    return this.gateway.createRun(
      threadId,
      assistantId,
      message
    );
  }

  // =========================== Messages ===========================

  async listMessages(threadId: string): Promise<OpenAIMessageResponse[]> {
    return this.gateway.listMessages(threadId);
  }

  // =========================== Tool Outputs ===========================

  async submitToolOutputs(payload: SubmitToolOutputsPayload) {
    this.gateway.submitToolOutputs(payload);
  }

  // =========================== Responses ===========================

  /**
   * Ejecuta responses.create con formato JSON estructurado
   */
  async createResponse(
    systemPrompt: string,
    userMessage: string,
    type: "json_object" | "text"
  ): Promise<any> {
    this.gateway.createResponse(systemPrompt, userMessage, type);
  }

  /**
   * Ejecuta responses.parse con esquema personalizado
   */
  async parseResponse(
    systemPrompt: string,
    userMessage: string,
    format: any
  ): Promise<any> {
    this.gateway.createResponse(systemPrompt, userMessage, format);
  }
}
