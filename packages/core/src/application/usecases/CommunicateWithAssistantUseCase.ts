import { AppError } from '@clinickeys-agents/core/utils';

export interface CommunicateWithAssistantInput {
  context: Record<string, any>;
  assistantService: any;
  functionName?: string; // opcional: permite especificar la función/intención del asistente
}

export interface CommunicateWithAssistantOutput {
  assistantResult: any;
}

export class CommunicateWithAssistantUseCase {
  async execute(input: CommunicateWithAssistantInput): Promise<CommunicateWithAssistantOutput> {
    const { context, assistantService, functionName } = input;

    // Si se provee un functionName (intención/función especial), usa esa función; si no, usa el método por defecto
    let assistantResult;
    if (functionName && typeof assistantService[functionName] === 'function') {
      assistantResult = await assistantService[functionName](context);
    } else if (typeof assistantService.replyToUser === 'function') {
      assistantResult = await assistantService.replyToUser(context);
    } else {
      throw new AppError({
        code: 'ERR_ASSISTANT_METHOD_NOT_FOUND',
        humanMessage: 'No se encontró el método de comunicación apropiado en el assistantService.',
        context: { functionName, assistantService }
      });
    }

    if (!assistantResult) {
      throw new AppError({
        code: 'ERR_ASSISTANT_NO_RESULT',
        humanMessage: 'El asistente no devolvió ningún resultado.',
        context: { context }
      });
    }

    return {
      assistantResult
    };
  }
}
