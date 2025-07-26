// Assistant model
export interface Assistant {
  id: string;
  name: string | null;
  instructions: string | null;
  model: string;
  tools: any[]; // Puede especializarse si tienes estructura fija
  [key: string]: any;
}

// Payload para crear assistant
export interface CreateAssistantPayload {
  name: string;
  instructions: string;
  model?: string;
  tools?: any[];
  top_p?: number;
  temperature?: number;
}

// Payload para actualizar assistant
export interface UpdateAssistantPayload {
  instructions?: string;
  tools?: any[];
}

// Thread model
export interface Thread {
  id: string;
  [key: string]: any;
}

// Run model
export interface Run {
  id: string;
  thread_id: string;
  status: string;
  required_action?: {
    submit_tool_outputs?: {
      tool_calls: Array<{
        id: string;
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
  } | null;
  [key: string]: any;
}

// Payload para enviar salidas de funciones/herramientas
export interface SubmitToolOutputsPayload {
  threadId: string;
  runId: string;
  toolOutputs: Array<{
    tool_call_id: string;
    output: any;
  }>;
  timeoutMs?: number;
}

// Para function calls en required_action
export interface FunctionCallPayload {
  tool_call_id: string;
  name: string;
  arguments: any;
}

// Respuesta de mensaje OpenAI
export interface OpenAIMessageResponse {
  id: string;
  role: string;
  content: Array<{
    text?: {
      value: string;
    };
    [key: string]: any;
  }>;
  [key: string]: any;
}
