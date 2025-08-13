// @clinickeys-agents/core/src/utils/generateInstructions.ts

import fs from "fs";
import path from "path";

/**
 * Genera el texto de instrucciones para un asistente OpenAI
 * a partir de un template Markdown y diccionario de placeholders.
 *
 * @param assistantName Nombre del asistente (ej: 'speakingBot')
 * @param placeholders  Diccionario { KEY: value } para reemplazo en el template
 * @returns Texto final con los placeholders reemplazados
 */
export function generateInstructions(
  assistantName: string,
  placeholders: Record<string, string> = {}
): string {
  const templateDir = path.resolve(
    __dirname, "packages/core/src/.ia/instructions/templates"
  );
  const fileName = `${assistantName}.md`;
  const templatePath = path.join(templateDir, fileName);

  let md: string;
  try {
    md = fs.readFileSync(templatePath, "utf8");
  } catch (err) {
    throw new Error(
      `No se pudo leer el template de instrucciones '${fileName}' en ${templateDir}: ${err}`
    );
  }

  // Reemplazo de placeholders tipo [KEY]
  return md.replace(/\[([A-Z0-9_]+)]/g, (_, key) =>
    Object.prototype.hasOwnProperty.call(placeholders, key)
      ? placeholders[key]
      : `[${key}]`
  );
}
