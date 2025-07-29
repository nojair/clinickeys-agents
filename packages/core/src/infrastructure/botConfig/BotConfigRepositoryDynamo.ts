// packages/core/src/infrastructure/botConfig/BotConfigRepositoryDynamo.ts

import { BotConfigDTO } from "@clinickeys-agents/core/domain/botConfig";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import crc32 from "crc-32";
import {
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

export interface BotConfigRepositoryDynamoProps {
  tableName: string;
  docClient: DynamoDBDocumentClient;
  buckets?: number; // default 10
}

/**
 * Repositorio DynamoDB para BotConfig.
 * Encapsula hashing (bucket), composición de PK/SK y paginación.
 */
export class BotConfigRepositoryDynamo {
  private readonly tableName: string;
  private readonly docClient: DynamoDBDocumentClient;
  private readonly buckets: number;

  // -------------------- ctor --------------------
  constructor(props: BotConfigRepositoryDynamoProps) {
    this.tableName = props.tableName;
    this.docClient = props.docClient;
    this.buckets = props.buckets ?? 10; // default 10 buckets
  }

  // --------------------------------- helpers ---------------------------------
  private bucketOf(id: string): number {
    // Usamos CRC32 sobre UTF‑8 (str) y lo convertimos a unsigned 32‑bit con >>> 0
    return (crc32.str(id, 0) >>> 0) % this.buckets;
  }

  private pkOf(source: string, clinicId: number) {
    return `CLINIC#${source}#${clinicId}`;
  }

  private skOf(botConfigId: string) {
    return `BOT_CONFIG#${botConfigId}`;
  }

  // -------------------- CRUD --------------------
  /**
   * Crear un nuevo BotConfig.
   */
  async create(dto: Omit<BotConfigDTO, "pk" | "sk" | "bucket" | "createdAt" | "updatedAt">): Promise<BotConfigDTO> {
    const now = Date.now();
    const item: BotConfigDTO = {
      ...dto,
      pk: this.pkOf(dto.clinicSource, dto.clinicId),
      sk: this.skOf(dto.botConfigId),
      bucket: this.bucketOf(dto.botConfigId),
      createdAt: now,
      updatedAt: now,
    } as BotConfigDTO;

    await this.docClient.send(
      new PutCommand({ TableName: this.tableName, Item: item })
    );

    return item;
  }

  /**
   * Obtener un BotConfig único (clave compuesta).
   */
  async findByBotConfig(
    botConfigId: string,
    clinicSource: string,
    clinicId: number
  ): Promise<BotConfigDTO | null> {
    const pk = this.pkOf(clinicSource, clinicId);
    const sk = this.skOf(botConfigId);
    const res = await this.docClient.send(
      new GetCommand({ TableName: this.tableName, Key: { pk, sk } })
    );
    return (res.Item as BotConfigDTO) ?? null;
  }

  /**
   * Listar todos los BotConfig de una clínica (paginado).
   */
  async listByClinic(
    clinicSource: string,
    clinicId: number,
    limit = 50,
    cursor?: Record<string, unknown>
  ): Promise<{ items: BotConfigDTO[]; nextCursor?: Record<string, unknown> }> {
    const pk = this.pkOf(clinicSource, clinicId);
    const res = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "pk = :pk",
        ExpressionAttributeValues: { ":pk": pk },
        Limit: limit,
        ExclusiveStartKey: cursor,
      })
    );
    return {
      items: (res.Items as BotConfigDTO[]) ?? [],
      nextCursor: res.LastEvaluatedKey,
    };
  }

  /**
   * Listar BotConfig por fuente (clinicSource) usando GSI bySourceCreated.
   */
  async listBySource(
    clinicSource: string,
    limit = 50,
    cursor?: Record<string, unknown>
  ): Promise<{ items: BotConfigDTO[]; nextCursor?: Record<string, unknown> }> {
    const res = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: "bySourceCreated",
        KeyConditionExpression: "clinicSource = :src",
        ExpressionAttributeValues: { ":src": clinicSource },
        ScanIndexForward: false,
        Limit: limit,
        ExclusiveStartKey: cursor,
      })
    );
    return {
      items: (res.Items as BotConfigDTO[]) ?? [],
      nextCursor: res.LastEvaluatedKey,
    };
  }

  /**
   * Feed global paginado usando sharding por bucket.
   * Devuelve hasta `limit` resultados ordenados desc. por createdAt.
   * El cursor es un mapa bucket→LastEvaluatedKey.
   */
  async listGlobal(
    limit = 100,
    cursor: Record<string, Record<string, unknown>> = {}
  ): Promise<{ items: BotConfigDTO[]; nextCursor: Record<string, Record<string, unknown>> }> {
    const perBucket = Math.ceil(limit / this.buckets);

    const queries = [...Array(this.buckets).keys()].map(async (b) => {
      const res = await this.docClient.send(
        new QueryCommand({
          TableName: this.tableName,
          IndexName: "byBucketCreated",
          KeyConditionExpression: "bucket = :b",
          ExpressionAttributeValues: { ":b": b },
          ScanIndexForward: false,
          Limit: perBucket,
          ExclusiveStartKey: cursor[b],
        })
      );
      return { bucket: b, items: res.Items as BotConfigDTO[] ?? [], next: res.LastEvaluatedKey };
    });

    const pages = await Promise.all(queries);
    const merged = pages.flatMap(p => p.items).sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);

    const nextCursor: Record<string, Record<string, unknown>> = {};
    pages.forEach(p => { if (p.next) nextCursor[p.bucket] = p.next; });

    return { items: merged, nextCursor };
  }

  /**
   * Actualizar parcialmente un BotConfig. No se permite cambiar clinicId ni clinicSource.
   */
  async patch(
    botConfigId: string,
    clinicSource: string,
    clinicId: number,
    update: Partial<Pick<BotConfigDTO,
      | "isActive"
      | "description"
      | "name"
      | "timezone"
      | "defaultCountry"
      | "crmApiKey"
      | "crmSubdomain"
      | "crmType"
    >> & {
      kommo?: {
        salesbotId?: number;
        chatSalesbotId?: number;
      };
    }
  ): Promise<void> {
    const pk = this.pkOf(clinicSource, clinicId);
    const sk = this.skOf(botConfigId);
    const now = Date.now();

    const exp: string[] = ["updatedAt = :upd"];
    const attrs: Record<string, unknown> = { ":upd": now };

    const add = (field: string, val: unknown) => {
      if (val !== undefined) {
        const key = `:${field}`;
        exp.push(`${field} = ${key}`);
        attrs[key] = val;
      }
    };

    add("isActive", update.isActive);
    add("description", update.description);
    add("name", update.name);
    add("timezone", update.timezone);
    add("defaultCountry", update.defaultCountry);
    add("crmApiKey", update.crmApiKey);
    add("crmSubdomain", update.crmSubdomain);
    add("crmType", update.crmType);

    // Manejo para patch de kommo.salesbotId y kommo.chatSalesbotId de forma independiente
    if (update.kommo) {
      if (update.kommo.salesbotId !== undefined) {
        exp.push("kommo.salesbotId = :kommoSalesbotId");
        attrs[":kommoSalesbotId"] = update.kommo.salesbotId;
      }
      if (update.kommo.chatSalesbotId !== undefined) {
        exp.push("kommo.chatSalesbotId = :kommoChatSalesbotId");
        attrs[":kommoChatSalesbotId"] = update.kommo.chatSalesbotId;
      }
    }

    if (exp.length === 1) return; // sólo updatedAt, nada más que actualizar

    await this.docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { pk, sk },
        UpdateExpression: `SET ${exp.join(", ")}`,
        ExpressionAttributeValues: attrs,
      })
    );
  }

  /**
   * Eliminar un BotConfig.
   */
  async delete(botConfigId: string, clinicSource: string, clinicId: number): Promise<void> {
    const pk = this.pkOf(clinicSource, clinicId);
    const sk = this.skOf(botConfigId);
    await this.docClient.send(
      new DeleteCommand({ TableName: this.tableName, Key: { pk, sk } })
    );
  }
}
