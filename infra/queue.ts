// infra/queue.ts
import { SUFFIX } from "./config";

export const chatbotQueueDLQ = new sst.aws.Queue(`chatbotQueueDLQ${SUFFIX}`, {
  fifo: { contentBasedDeduplication: false },
});

export const chatbotQueue = new sst.aws.Queue(`ChaybotQueue${SUFFIX}`, {
  fifo: { contentBasedDeduplication: false },
  visibilityTimeout: "420 seconds",
  delay: "10 seconds",
  dlq: {
    queue: chatbotQueueDLQ.arn,
    retry: 3,
  },
  transform: {
    queue: {
      messageRetentionSeconds: 10800,
    }
  }
});