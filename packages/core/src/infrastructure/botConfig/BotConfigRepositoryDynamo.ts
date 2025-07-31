// packages/core/src/infrastructure/botConfig/BotConfigRepositoryDynamo.ts

import {
  BotConfigDTO,
  BotConfigType,
  IBotConfigRepository,
} from "@clinickeys-agents/core/domain/botConfig";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import crc32 from "crc-32";

export interface BotConfigRepositoryDynamoProps {
  tableName: string;
  docClient: DynamoDBDocumentClient;
  buckets?: number; // default 10
}

/**
 * Repositorio DynamoDB para BotConfig.
 * - Compose PK/SK según convención.
 * - Maneja bucket sharding.
 * - Patch granular: solo actualiza campos con valor no-falsy (ignora null/\"\"/undefined).
 */
export class BotConfigRepositoryDynamo implements IBotConfigRepository {
  private readonly tableName: string;
  private readonly docClient: DynamoDBDocumentClient;
  private readonly buckets: number;

  constructor(props: BotConfigRepositoryDynamoProps) {
    this.tableName = props.tableName;
    this.docClient = props.docClient;
    this.buckets = props.buckets ?? 10;
  }

  // ---------------------------- helpers ----------------------------
  private bucketOf(id: string): number {
    return (crc32.str(id, 0) >>> 0) % this.buckets;
  }

  private pkOf(source: string, clinicId: number): string {
    return `CLINIC#${source}#${clinicId}`;
  }

  private skOf(type: BotConfigType, id: string): string {
    return `BOT_CONFIG#${type}#${id}`;
  }

  /**
   * Convierte un objeto arbitrario en paths planos ignorando valores nulos/\"\"/undefined.
   * Ej: flatten({ kommo: { longLivedToken: "abc", salesbotId: null }, name: "X" })
   * → { "kommo.longLivedToken": "abc", "name": "X" }
   */
  private flatten(obj: Record<string, any>, prefix = ""): Record<string, any> {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === undefined || v === null || v === "") continue; // ignorar vacíos
      const path = prefix ? `${prefix}.${k}` : k;
      if (typeof v === "object" && !Array.isArray(v)) {
        Object.assign(out, this.flatten(v, path));
      } else {
        out[path] = v;
      }
    }
    return out;
  }

  // ---------------------------- CRUD ----------------------------
  async create(
    dto: Omit<
      BotConfigDTO,
      "pk" | "sk" | "bucket" | "createdAt" | "updatedAt"
    >,
  ): Promise<BotConfigDTO> {
    const now = Date.now();
    const item: BotConfigDTO = {
      ...dto,
      pk: this.pkOf(dto.clinicSource, dto.clinicId),
      sk: this.skOf(dto.botConfigType, dto.botConfigId),
      bucket: this.bucketOf(dto.botConfigId),
      createdAt: now,
      updatedAt: now,
    } as BotConfigDTO;

    await this.docClient.send(
      new PutCommand({ TableName: this.tableName, Item: item }),
    );
    return item;
  }

  async findByPrimaryKey(
    botConfigType: BotConfigType,
    botConfigId: string,
    clinicSource: string,
    clinicId: number,
  ): Promise<BotConfigDTO | null> {
    const pk = this.pkOf(clinicSource, clinicId);
    const sk = this.skOf(botConfigType, botConfigId);
    const res = await this.docClient.send(
      new GetCommand({ TableName: this.tableName, Key: { pk, sk } }),
    );
    return (res.Item as BotConfigDTO) ?? null;
  }

  async listByBotConfigType(
    botConfigType: BotConfigType,
    limit = 50,
    cursor?: Record<string, unknown>,
  ): Promise<{ items: BotConfigDTO[]; nextCursor?: Record<string, unknown> }> {
    const res = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: "byBotConfigType",
        KeyConditionExpression: "botConfigType = :t",
        ExpressionAttributeValues: { ":t": botConfigType },
        ScanIndexForward: false,
        Limit: limit,
        ExclusiveStartKey: cursor,
      }),
    );
    return { items: (res.Items as BotConfigDTO[]) ?? [], nextCursor: res.LastEvaluatedKey };
  }

  async listByKommoSubdomain(
    subdomain: string,
    limit = 50,
    cursor?: Record<string, unknown>,
  ): Promise<{ items: BotConfigDTO[]; nextCursor?: Record<string, unknown> }> {
    const res = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: "byKommoSubdomain",
        KeyConditionExpression: "kommoSubdomain = :sd",
        ExpressionAttributeValues: { ":sd": subdomain },
        ScanIndexForward: false,
        Limit: limit,
        ExclusiveStartKey: cursor,
      }),
    );
    return { items: (res.Items as BotConfigDTO[]) ?? [], nextCursor: res.LastEvaluatedKey };
  }

  async listByClinic(
    clinicSource: string,
    clinicId: number,
    limit = 50,
    cursor?: Record<string, unknown>,
  ): Promise<{ items: BotConfigDTO[]; nextCursor?: Record<string, unknown> }> {
    const pk = this.pkOf(clinicSource, clinicId);
    const res = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "pk = :pk",
        ExpressionAttributeValues: { ":pk": pk },
        Limit: limit,
        ExclusiveStartKey: cursor,
      }),
    );
    return { items: (res.Items as BotConfigDTO[]) ?? [], nextCursor: res.LastEvaluatedKey };
  }

  async listBySource(
    clinicSource: string,
    limit = 50,
    cursor?: Record<string, unknown>,
  ): Promise<{ items: BotConfigDTO[]; nextCursor?: Record<string, unknown> }> {
    const res = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: "byClinicSourceCreated",
        KeyConditionExpression: "clinicSource = :src",
        ExpressionAttributeValues: { ":src": clinicSource },
        ScanIndexForward: false,
        Limit: limit,
        ExclusiveStartKey: cursor,
      }),
    );
    return { items: (res.Items as BotConfigDTO[]) ?? [], nextCursor: res.LastEvaluatedKey };
  }

  async listGlobal(
    limit = 100,
    cursor: Record<string, Record<string, unknown>> = {},
  ): Promise<{ items: BotConfigDTO[]; nextCursor: Record<string, Record<string, unknown>> }> {
    const perBucket = Math.ceil(limit / this.buckets);

    const pages = await Promise.all(
      [...Array(this.buckets).keys()].map(async (b) => {
        const res = await this.docClient.send(
          new QueryCommand({
            TableName: this.tableName,
            IndexName: "byBucketCreated",
            KeyConditionExpression: "bucket = :b",
            ExpressionAttributeValues: { ":b": b },
            ScanIndexForward: false,
            Limit: perBucket,
            ExclusiveStartKey: cursor[b],
          }),
        );
        return { bucket: b, items: (res.Items as BotConfigDTO[]) ?? [], next: res.LastEvaluatedKey };
      }),
    );

    const merged = pages
      .flatMap((p) => p.items)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);

    const nextCursor: Record<string, Record<string, unknown>> = {};
    pages.forEach((p) => {
      if (p.next) nextCursor[p.bucket] = p.next;
    });

    return { items: merged, nextCursor };
  }

  // ---------------------------- PATCH ----------------------------
  /**
   * Parche granular: solo actualiza claves con valor no-falsy.
   * Soporta paths anidados (kommo.longLivedToken, openai.apiKey, placeholders.foo, …)
   */
  async patch(
    botConfigType: BotConfigType,
    botConfigId: string,
    clinicSource: string,
    clinicId: number,
    update: Partial<
      Pick<
        BotConfigDTO,
        | "name"
        | "kommo"
        | "openai"
        | "timezone"
        | "isEnabled"
        | "description"
        | "placeholders"
        | "defaultCountry"
        | "kommoSubdomain"
      >
    >,
  ): Promise<void> {
    const flattened = this.flatten(update as Record<string, any>);
    if (Object.keys(flattened).length === 0) return;

    const pk = this.pkOf(clinicSource, clinicId);
    const sk = this.skOf(botConfigType, botConfigId);
    const now = Date.now();

    const exprParts: string[] = ["updatedAt = :upd"];
    const exprNames: Record<string, string> = {};
    const exprValues: Record<string, any> = { ":upd": now };

    for (const [path, val] of Object.entries(flattened)) {
      const parts = path.split(".");
      const placeholder = parts.join("_"); // e.g. kommo_longLivedToken
      const namePath = parts.map((p) => `#${p}`).join(".");
      exprParts.push(`${namePath} = :${placeholder}`);
      parts.forEach((p) => {
        exprNames[`#${p}`] = p;
      });
      exprValues[`:${placeholder}`] = val;
    }

    await this.docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { pk, sk },
        UpdateExpression: `SET ${exprParts.join(", ")}`,
        ExpressionAttributeNames: exprNames,
        ExpressionAttributeValues: exprValues,
      }),
    );
  }

  async delete(
    botConfigType: BotConfigType,
    botConfigId: string,
    clinicSource: string,
    clinicId: number,
  ): Promise<void> {
    const pk = this.pkOf(clinicSource, clinicId);
    const sk = this.skOf(botConfigType, botConfigId);
    await this.docClient.send(
      new DeleteCommand({ TableName: this.tableName, Key: { pk, sk } }),
    );
  }
}
