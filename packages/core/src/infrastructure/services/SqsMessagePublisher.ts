// packages/core/src/infrastructure/services/SqsMessagePublisher.ts

import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { LeadQueueMessageDTO } from "@clinickeys-agents/core/domain/kommo";
import { MessageQueuePort } from "@clinickeys-agents/core/application/ports/MessageQueuePort";
import { Logger } from "@clinickeys-agents/core/infrastructure/external";

/**
 * Implementación del {@link MessageQueuePort} usando AWS SQS (FIFO).
 */
export class SqsMessagePublisher implements MessageQueuePort {
  private readonly sqs: SQSClient;
  private readonly queueUrl: string;
  private readonly logger: typeof Logger;

  constructor(params: {
    queueUrl: string;
    sqsClient?: SQSClient;
    logger?: typeof Logger;
  }) {
    this.queueUrl = params.queueUrl;
    this.sqs = params.sqsClient ?? new SQSClient({});
    this.logger = params.logger ?? Logger;
  }

  async send(
    message: LeadQueueMessageDTO,
    options: { groupId: string; deduplicationId: string }
  ): Promise<void> {
    const { groupId, deduplicationId } = options;

    const command = new SendMessageCommand({
      QueueUrl: this.queueUrl,
      MessageBody: JSON.stringify(message),
      MessageGroupId: groupId,
      MessageDeduplicationId: deduplicationId,
    });

    try {
      const result = await this.sqs.send(command);
      this.logger.info("SQS sendMessage successful", {
        messageId: result.MessageId,
        groupId,
        deduplicationId,
      });
    } catch (err) {
      this.logger.error("SQS sendMessage failed", err as Error);
      throw err;
    }
  }
}
