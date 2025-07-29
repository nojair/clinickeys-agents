// packages/core/src/application/services/OpenAIService.ts

import { IOpenAIAssistantRepository } from "@clinickeys-agents/core/domain/openai";
import { Logger } from "@clinickeys-agents/core/infrastructure/external";
import { zodTextFormat } from "openai/helpers/zod";
import { ZodType } from "zod";

import {
  CreateAssistantPayload,
  UpdateAssistantPayload,
  OpenAIMessageResponse,
  FunctionCallPayload,
  Assistant,
  Run,
} from "@clinickeys-agents/core/infrastructure/integrations/openai/models";

interface ResponseResult {
  threadId: string;
  runId: string;
  message?: string;
  functionCalls?: FunctionCallPayload[];
}

const TIME_TO_POLL = 300000; // 5 minutos

export class OpenAIService {
  private repo: IOpenAIAssistantRepository;
  private logger: typeof Logger;

  constructor(
    repo: IOpenAIAssistantRepository,
    logger: typeof Logger
  ) {
    this.repo = repo;
    this.logger = logger;
  }

  // =========================== Assistants ===========================

  async listAssistants(): Promise<Assistant[]> {
    this.logger.info("Listando assistants de OpenAI");
    return this.repo.listAssistants();
  }

  async getAssistant(assistantId: string): Promise<Assistant> {
    this.logger.info("Obteniendo assistant de OpenAI", { assistantId });
    return this.repo.getAssistant(assistantId);
  }

  async createAssistants(
    instructions: Record<string, string>
  ): Promise<Record<string, string>> {
    const ids: Record<string, string> = {};
    for (const [name, md] of Object.entries(instructions)) {
      this.logger.info("Creando assistant", { name });
      const assistant = await this.repo.createAssistant({
        name,
        instructions: md,
        top_p: 0.01,
        temperature: 0.01,
      } as CreateAssistantPayload);
      ids[name] = assistant.id;
    }
    return ids;
  }

  async deleteAssistants(
    assistantIds: Record<string, string>
  ): Promise<void> {
    for (const id of Object.values(assistantIds || {})) {
      try {
        this.logger.info("Eliminando assistant", { assistantId: id });
        await this.repo.deleteAssistant(id);
      } catch (error) {
        this.logger.warn("Error eliminando assistant", { assistantId: id, error });
      }
    }
  }

  async syncAssistants(
    instructions: Record<string, string>,
    currentIds: Record<string, string>
  ): Promise<Record<string, string>> {
    const result = { ...currentIds };
    for (const [name, md] of Object.entries(instructions)) {
      if (currentIds[name]) {
        this.logger.info("Actualizando assistant en sync", { name });
        await this.repo.updateAssistant(
          currentIds[name],
          { instructions: md } as UpdateAssistantPayload
        );
      } else {
        this.logger.info("Creando nuevo assistant en sync", { name });
        const assistant = await this.repo.createAssistant({
          name,
          instructions: md,
          top_p: 0.01,
          temperature: 0.01,
        } as CreateAssistantPayload);
        result[name] = assistant.id;
      }
    }
    return result;
  }

  async updateAssistant(
    assistantId: string,
    instructions: string
  ): Promise<void> {
    this.logger.info("Actualizando instrucciones de assistant", { assistantId });
    await this.repo.updateAssistant(
      assistantId,
      { instructions } as UpdateAssistantPayload
    );
  }

  // =========================== Messaging ===========================

  async getResponseFromAssistant(
    assistantId: string,
    message: string,
    threadId?: string
  ): Promise<ResponseResult> {
    let tId = threadId;
    if (!tId) {
      const thread = await this.repo.createThread();
      tId = thread.id;
      this.logger.info("OpenAIService: Thread creado", { threadId: tId });
    }

    const runs = await this.repo.listRuns(tId, 1);
    let last = runs[0];

    if (last?.status === "requires_action") {
      this.logger.warn("OpenAIService: Run requiere acción", { runId: last.id });
      return {
        threadId: tId, runId: last.id, functionCalls: last.required_action?.submit_tool_outputs?.tool_calls.map(
          (tc) => ({
            tool_call_id: tc.id,
            name: tc.function.name,
            arguments: JSON.parse(tc.function.arguments),
          })
        ) as FunctionCallPayload[]
      };
    }

    if (["in_progress", "queued", "cancelling"].includes(last?.status || "")) {
      if (last.status !== "cancelling") {
        await this.repo.cancelRun(tId, last.id);
      }
      last = await this.pollUntilResolved(tId, last.id);
    }

    const newRun = await this.repo.createRun(tId, assistantId, message);
    return this.getResponseFromWaitingAssistant({
      threadId: tId,
      runId: newRun.id,
      functionCalls: newRun.required_action?.submit_tool_outputs?.tool_calls?.map(
        (tc) => ({
          tool_call_id: tc.id,
          name: tc.function.name,
          arguments: JSON.parse(tc.function.arguments),
        })
      ) as FunctionCallPayload[] || [],
      rawOutput: message
    });
  }

  /**
   * Procesa llamadas a herramientas pendientes y completa el run.
   */
  async getResponseFromWaitingAssistant({
    threadId,
    runId,
    functionCalls,
    rawOutput
  }: {
    threadId: string,
    runId: string,
    functionCalls: FunctionCallPayload[],
    rawOutput: unknown
  }): Promise<ResponseResult> {
    this.logger.info("OpenAIService: Resolviendo run pendiente", { threadId, runId });
    const toolOutputs = functionCalls.map(fc => ({
      tool_call_id: fc.tool_call_id,
      output: typeof rawOutput === 'string' ? rawOutput : JSON.stringify(rawOutput),
    }));

    await this.repo.submitToolOutputs({ runId, threadId, toolOutputs });
    await this.repo.retrieveRun(threadId, runId);

    const finished = await this.pollUntilResolved(threadId, runId);

    if (finished.status === "requires_action") {
      return {
        threadId, runId: finished.id, functionCalls: finished.required_action?.submit_tool_outputs?.tool_calls.map(
          (tc) => ({ tool_call_id: tc.id, name: tc.function.name, arguments: JSON.parse(tc.function.arguments) })
        ) as FunctionCallPayload[]
      };
    }

    if (finished.status === "completed") {
      const messages = await this.repo.listMessages(threadId);
      const assistantMsg = messages.find((m: OpenAIMessageResponse) => m.role === "assistant");
      if (!assistantMsg) throw new Error("No assistant message found");
      const contentRaw = assistantMsg.content as any;
      const content = Array.isArray(contentRaw)
        ? contentRaw[0]?.text?.value
        : contentRaw?.text?.value;
      return { threadId, runId: finished.id, message: content || "" };
    }

    throw new Error(`Run en estado inesperado: ${finished.status}`);
  }

  async getJsonStructuredResponse(
    systemPrompt: string,
    userMessage: string
  ): Promise<any> {
    return this.repo.createResponse(systemPrompt, userMessage, "json_object");
  }

  async getSchemaStructuredResponse(
    systemPrompt: string,
    userMessage: string,
    schema: ZodType<any>,
    schemaLabel: string = "schema"
  ): Promise<any> {
    this.logger.info("OpenAIService: getSchemaStructuredResponse", { schemaLabel });
    const format = zodTextFormat(schema, schemaLabel);
    return this.repo.parseResponse(systemPrompt, userMessage, format);
  }

  // =========================== Helpers ===========================

  async pollUntilResolved(
    threadId: string,
    runId: string,
    timeoutMs = TIME_TO_POLL
  ): Promise<Run> {
    const start = Date.now();
    while (true) {
      const run = await this.repo.retrieveRun(threadId, runId);
      if (["completed", "requires_action", "failed", "expired"].includes(run.status)) {
        return run;
      }
      if (Date.now() - start > timeoutMs) {
        throw new Error(`Run ${runId} polling timed out`);
      }
      await new Promise((res) => setTimeout(res, 1000));
    }
  }
}
