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

/**
 * Props para el repositorio Dynamo.
 */
export interface BotConfigRepositoryDynamoProps {
  tableName: string;
  docClient: DynamoDBDocumentClient;
  buckets?: number; // default 10
}

/**
 * Repositorio DynamoDB para BotConfig.
 * - Compose PK/SK según convención.
 * - Maneja bucket sharding.
 * - Patch granular con paths anidados seguro.
 * - Paginación cursor‑based idiomática (string Base64) para todas las operaciones de listado.
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
    // CRC‑32 → unsigned → módulo de buckets
    return (crc32.str(id, 0) >>> 0) % this.buckets;
  }

  private pkOf(source: string, clinicId: number): string {
    return `CLINIC#${source}#${clinicId}`;
  }

  private skOf(type: BotConfigType, id: string): string {
    return `BOT_CONFIG#${type}#${id}`;
  }

  /**
   * Codifica cualquier objeto (LastEvaluatedKey o mapa de claves por bucket) a un token opaco.
   */
  private encodeCursor(obj: Record<string | number, unknown> | undefined): string | undefined {
    if (!obj || Object.keys(obj).length === 0) return undefined;
    return Buffer.from(JSON.stringify(obj)).toString("base64");
  }

  /**
   * Decodifica un token Base64 a objeto.
   */
  private decodeCursor<T = Record<string, unknown>>(token?: string): T | undefined {
    return token ? (JSON.parse(Buffer.from(token, "base64").toString()) as T) : undefined;
  }

  /**
   * Convierte un objeto arbitrario en paths planos ignorando valores nulos/""/undefined.
   * Ej: flatten({ kommo: { longLivedToken: "abc" }, name: "X" })
   *  → { "kommo.longLivedToken": "abc", "name": "X" }
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
      new PutCommand({
        TableName: this.tableName,
        Item: item,
        // evita sobrescribir accidentalmente un registro existente (PK+SK ya únicos)
        ConditionExpression: "attribute_not_exists(pk) AND attribute_not_exists(sk)",
      }),
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

  // ---------------------------- LISTADOS INDEXADOS ----------------------------

  async listByBotConfigType(
    botConfigType: BotConfigType,
    limit = 50,
    cursor?: string,
  ): Promise<{ items: BotConfigDTO[]; nextCursor?: string }> {
    const startKey = this.decodeCursor<Record<string, unknown>>(cursor);
    const res = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: "byBotConfigType",
        KeyConditionExpression: "botConfigType = :t",
        ExpressionAttributeValues: { ":t": botConfigType },
        ScanIndexForward: false,
        Limit: limit,
        ExclusiveStartKey: startKey,
      }),
    );
    return {
      items: (res.Items as BotConfigDTO[]) ?? [],
      nextCursor: this.encodeCursor(res.LastEvaluatedKey as Record<string, unknown> | undefined),
    };
  }

  async listByKommoSubdomain(
    subdomain: string,
    limit = 50,
    cursor?: string,
  ): Promise<{ items: BotConfigDTO[]; nextCursor?: string }> {
    const startKey = this.decodeCursor<Record<string, unknown>>(cursor);
    const res = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: "byKommoSubdomain",
        KeyConditionExpression: "kommoSubdomain = :sd",
        ExpressionAttributeValues: { ":sd": subdomain },
        ScanIndexForward: false,
        Limit: limit,
        ExclusiveStartKey: startKey,
      }),
    );
    return {
      items: (res.Items as BotConfigDTO[]) ?? [],
      nextCursor: this.encodeCursor(res.LastEvaluatedKey as Record<string, unknown> | undefined),
    };
  }

  async listByClinic(
    clinicSource: string,
    clinicId: number,
    limit = 50,
    cursor?: string,
  ): Promise<{ items: BotConfigDTO[]; nextCursor?: string }> {
    const pk = this.pkOf(clinicSource, clinicId);
    const startKey = this.decodeCursor<Record<string, unknown>>(cursor);
    const res = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "pk = :pk",
        ExpressionAttributeValues: { ":pk": pk },
        ScanIndexForward: false,
        Limit: limit,
        ExclusiveStartKey: startKey,
      }),
    );
    return {
      items: (res.Items as BotConfigDTO[]) ?? [],
      nextCursor: this.encodeCursor(res.LastEvaluatedKey as Record<string, unknown> | undefined),
    };
  }

  async listBySource(
    clinicSource: string,
    limit = 50,
    cursor?: string,
  ): Promise<{ items: BotConfigDTO[]; nextCursor?: string }> {
    const startKey = this.decodeCursor<Record<string, unknown>>(cursor);
    const res = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: "byClinicSourceCreated",
        KeyConditionExpression: "clinicSource = :src",
        ExpressionAttributeValues: { ":src": clinicSource },
        ScanIndexForward: false,
        Limit: limit,
        ExclusiveStartKey: startKey,
      }),
    );
    return {
      items: (res.Items as BotConfigDTO[]) ?? [],
      nextCursor: this.encodeCursor(res.LastEvaluatedKey as Record<string, unknown> | undefined),
    };
  }

  /**
   * Listado global con sharding por bucket.
   * Mergea en memoria resultados de cada bucket y respeta orden descendente por createdAt.
   */
  async listGlobal(
    limit = 100,
    cursor?: string,
  ): Promise<{ items: BotConfigDTO[]; nextCursor?: string }> {
    const requested = limit + 1; // limit + 1 para detectar si hay más
    const perBucket = Math.ceil(requested / this.buckets);

    const decodedCursor = this.decodeCursor<Record<number, Record<string, unknown>>>(cursor) || {};

    const pages = await Promise.all(
      [...Array(this.buckets).keys()].map(async (b) => {
        const res = await this.docClient.send(
          new QueryCommand({
            TableName: this.tableName,
            IndexName: "byBucketCreated",
            KeyConditionExpression: "#bucket = :b",
            ExpressionAttributeNames: { "#bucket": "bucket" },
            ExpressionAttributeValues: { ":b": b },
            ScanIndexForward: false,
            Limit: perBucket,
            ExclusiveStartKey: decodedCursor[b],
          }),
        );
        return {
          bucket: b,
          items: (res.Items as BotConfigDTO[]) ?? [],
          next: res.LastEvaluatedKey as Record<string, unknown> | undefined,
        };
      }),
    );

    const merged = pages
      .flatMap((p) => p.items)
      .sort((a, b) =>
        a.createdAt !== b.createdAt
          ? b.createdAt - a.createdAt
          : a.bucket !== b.bucket
            ? a.bucket - b.bucket
            : a.botConfigId.localeCompare(b.botConfigId),
      );

    const hasMore = merged.length > limit;
    const items = merged.slice(0, limit);

    const nextCursorMap: Record<number, Record<string, unknown>> = {};
    if (hasMore) {
      pages.forEach((p) => {
        if (p.next) nextCursorMap[p.bucket] = p.next;
      });
    }

    return {
      items,
      nextCursor: hasMore ? this.encodeCursor(nextCursorMap) : undefined,
    };
  }

  // ---------------------------- PATCH ----------------------------

  /**
   * Parche seguro en dos fases:
   *  1) Asegura, en N llamadas, que cada mapa padre exista (SET path = if_not_exists(path, {})).
   *  2) En una última llamada, aplica todos los SET finales.
   * Esto evita el ValidationException cuando en una misma expresión se crean padres y se setean hijos.
   */
  async patch(
    botConfigType: BotConfigType,
    botConfigId: string,
    clinicSource: string,
    clinicId: number,
    update: Partial<
      Pick<
        BotConfigDTO,
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

    // --- utils para paths/nombres ---
    const buildNames = (parts: string[]) => parts.reduce<Record<string, string>>((acc, p) => {
      acc[`#${p}`] = p; return acc;
    }, {});
    const toNamePath = (parts: string[]) => parts.map(p => `#${p}`).join(".");

    // 1) recolectar todos los padres a asegurar
    const ensurePaths: string[] = [];
    for (const path of Object.keys(flattened)) {
      const parts = path.split(".");
      for (let i = 1; i < parts.length; i++) {
        const parent = parts.slice(0, i).join(".");
        ensurePaths.push(parent);
      }
    }
    // únicos y ordenados por profundidad ascendente
    const uniqueEnsures = Array.from(new Set(ensurePaths)).sort((a, b) => a.split(".").length - b.split(".").length);

    // 1.a) ejecutar un Update por cada ensure, por orden de menor a mayor profundidad
    for (const parent of uniqueEnsures) {
      const parts = parent.split(".");
      const exprNames = buildNames(parts);
      const namePath = toNamePath(parts);

      const updateExpr = `SET ${namePath} = if_not_exists(${namePath}, :__emptyMap)`;
      const exprValues = { ":__emptyMap": {} } as Record<string, any>;

      await this.docClient.send(new UpdateCommand({
        TableName: this.tableName,
        Key: { pk, sk },
        UpdateExpression: updateExpr,
        ExpressionAttributeNames: exprNames,
        ExpressionAttributeValues: exprValues,
        ConditionExpression: "attribute_exists(pk) AND attribute_exists(sk)",
        ReturnValues: "NONE",
      }));
    }

    // 2) una sola llamada para todos los SET finales (incluye updatedAt)
    const finalExprParts: string[] = ["updatedAt = :upd"]; 
    const finalNames: Record<string, string> = {}; 
    const finalValues: Record<string, any> = { ":upd": now };

    for (const [path, val] of Object.entries(flattened)) {
      const parts = path.split(".");
      parts.forEach(p => { finalNames[`#${p}`] = p; });

      const namePath = toNamePath(parts);
      const placeholder = `:${parts.join("_")}`;
      finalValues[placeholder] = val;

      finalExprParts.push(`${namePath} = ${placeholder}`);
    }

    const finalUpdateExpr = `SET ${finalExprParts.join(", ")}`;

    await this.docClient.send(new UpdateCommand({
      TableName: this.tableName,
      Key: { pk, sk },
      UpdateExpression: finalUpdateExpr,
      ExpressionAttributeNames: finalNames,
      ExpressionAttributeValues: finalValues,
      ConditionExpression: "attribute_exists(pk) AND attribute_exists(sk)",
      ReturnValues: "NONE",
    }));
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
