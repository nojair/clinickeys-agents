import { OpenAI } from "openai";
import {
  Assistant,
  CreateAssistantPayload,
  UpdateAssistantPayload,
  Thread,
  Run,
  OpenAIMessageResponse,
  SubmitToolOutputsPayload,
} from "@clinickeys-agents/core/infrastructure/integrations/openai/models";

const DEFAULT_MODEL = "gpt-4.1";

export interface OpenAIGatewayOptions {
  apiKey: string;
}

export class OpenAIGateway {
  private client: OpenAI;
  private apiKey: string;

  constructor({ apiKey }: OpenAIGatewayOptions) {
    this.apiKey = apiKey;
    this.client = new OpenAI({ apiKey: this.apiKey });
  }

  private getClient(): OpenAI {
    return this.client;
  }

  // =========================== Assistants ===========================

  async createAssistant(
    payload: CreateAssistantPayload
  ): Promise<Assistant> {
    const client = this.getClient();
    return await client.beta.assistants.create({
      ...payload,
      model: payload.model || DEFAULT_MODEL,
    });
  }

  async updateAssistant(
    assistantId: string,
    payload: UpdateAssistantPayload
  ): Promise<Assistant> {
    const client = this.getClient();
    return await client.beta.assistants.update(assistantId, payload);
  }

  async deleteAssistant(
    assistantId: string
  ): Promise<void> {
    const client = this.getClient();
    await client.beta.assistants.delete(assistantId);
  }

  async listAssistants(): Promise<Assistant[]> {
    const client = this.getClient();
    const result = await client.beta.assistants.list();
    return result.data || [];
  }

  async getAssistant(
    assistantId: string
  ): Promise<Assistant> {
    const client = this.getClient();
    return await client.beta.assistants.retrieve(assistantId);
  }

  // =========================== Threads ===========================

  async createThread(): Promise<Thread> {
    const client = this.getClient();
    return await client.beta.threads.create();
  }

  // =========================== Runs ===========================

  async listRuns(
    threadId: string,
    limit = 1
  ): Promise<Run[]> {
    const client = this.getClient();
    const runs = await client.beta.threads.runs.list(threadId, { limit });
    return runs.data;
  }

  async retrieveRun(
    threadId: string,
    runId: string
  ): Promise<Run> {
    const client = this.getClient();
    const run = await client.beta.threads.runs.retrieve(runId, { thread_id: threadId });
    return run;
  }

  async cancelRun(
    threadId: string,
    runId: string
  ): Promise<Run> {
    const client = this.getClient();
    const run = await client.beta.threads.runs.cancel(runId, { thread_id: threadId });
    return run;
  }

  async createRun(
    threadId: string,
    assistantId: string,
    message: string
  ): Promise<Run> {
    const client = this.getClient();
    const run = await client.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
      additional_messages: [{ role: "user", content: message }],
    });
    return run;
  }

  // =========================== Messages ===========================

  async listMessages(
    threadId: string
  ): Promise<OpenAIMessageResponse[]> {
    const client = this.getClient();
    const msgs = await client.beta.threads.messages.list(threadId);
    return msgs.data;
  }

  // =========================== Tool Outputs ===========================

  async submitToolOutputs(
    payload: SubmitToolOutputsPayload
  ) {
    const client = this.getClient();
    await client.beta.threads.runs.submitToolOutputs(
      payload.runId,
      { thread_id: payload.threadId, tool_outputs: payload.toolOutputs }
    );
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
    const client = this.getClient();
    const resp = await client.responses.create({
      model: DEFAULT_MODEL,
      input: [
        { role: "developer", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      text: { format: { type } }
    });
    return type == 'json_object' ? JSON.parse(resp.output_text) : resp.output_text;
  }

  /**
   * Ejecuta responses.parse con esquema personalizado
   */
  async parseResponse(
    systemPrompt: string,
    userMessage: string,
    format: any
  ): Promise<any> {
    const client = this.getClient();
    const resp = await client.responses.parse({
      model: DEFAULT_MODEL,
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      text: { format }
    });
    return resp.output_parsed;
  }
}