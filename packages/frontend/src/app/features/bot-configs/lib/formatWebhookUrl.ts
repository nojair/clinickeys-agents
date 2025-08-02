// /shared/lib/formatWebhookUrl.ts

/**
 * Construye la URL final del webhook para un BotConfig tipo chatBot
 * Formato: [baseUrl]/{botConfigType}/{botConfigId}/{clinicSource}/{clinicId}/{salesbotId}
 */
export function formatWebhookUrl({
  baseUrl,
  botConfigType,
  botConfigId,
  clinicSource,
  clinicId,
  salesbotId,
}: {
  baseUrl: string;
  botConfigType: string;
  botConfigId: string;
  clinicSource: string;
  clinicId: string | number;
  salesbotId: string;
}): string {
  // Quitar slash final del baseUrl si lo tuviera
  const cleanBase = baseUrl.replace(/\/$/, '');
  return `${cleanBase}/${botConfigType}/${botConfigId}/${clinicSource}/${clinicId}/${salesbotId}`;
}
