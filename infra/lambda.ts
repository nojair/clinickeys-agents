// infra/lambda.ts
import { chatbotQueue } from "./queue";
import { SUFFIX } from "./config";

export const chatbotWebhookFn = new sst.aws.Function(`chatbotWebhookFn${SUFFIX}`, {
  handler: "src/leadWebhook.handler",
  link: [chatbotQueue],
  timeout: "30 seconds",
  url: true,
  environment: {
    LEADS_DEBOUNCE_QUEUE_URL: chatbotQueue.url,
  },
});

// Handler que procesa los mensajes de la cola
chatbotQueue.subscribe({
  handler: "src/leadProcessor.handler",
  timeout: "420 seconds",
});