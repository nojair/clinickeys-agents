// packages/core/src/utils/lambda/index.ts

import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import type { Context } from 'aws-lambda';

const client = new LambdaClient({});

export async function invokeSelf(event = {}, context: Partial<Context> = { functionName: '' }) {
  if (!context.functionName) return;
  await client.send(new InvokeCommand({
    FunctionName: context.functionName,
    InvocationType: 'Event',
    Payload: Buffer.from(JSON.stringify(event)),
  }));
}