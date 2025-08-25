// packages/core/src/infrastructure/external/Logger.ts

import util from "util";

export type LogLevel = "debug" | "info" | "warn" | "error";

// Configuración global de util.inspect
util.inspect.defaultOptions.depth = 4 //null; // sin límite de profundidad
util.inspect.defaultOptions.colors = true;
util.inspect.defaultOptions.breakLength = 100;

// ANSI colors
const colors = {
  reset: "\x1b[0m",
  gray: "\x1b[90m",
  blue: "\x1b[34m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};

export class Logger {
  static debug(message: any, ...args: any[]) {
    Logger.log("debug", message, ...args);
  }

  static info(message: any, ...args: any[]) {
    Logger.log("info", message, ...args);
  }

  static warn(message: any, ...args: any[]) {
    Logger.log("warn", message, ...args);
  }

  static error(message: any, ...args: any[]) {
    Logger.log("error", message, ...args);
  }

  private static log(level: LogLevel, message: any, ...args: any[]) {
    const timestamp = new Date().toISOString();

    const formatted =
      typeof message === "string"
        ? util.format(message, ...args)
        : util.inspect(message);

    // Prefijo con colores por nivel
    let levelColor;
    switch (level) {
      case "debug":
        levelColor = colors.cyan;
        break;
      case "info":
        levelColor = colors.blue;
        break;
      case "warn":
        levelColor = colors.yellow;
        break;
      case "error":
        levelColor = colors.red;
        break;
    }

    const prefix =
      `${colors.gray}[${timestamp}]${colors.reset} ` +
      `${levelColor}[${level.toUpperCase()}]${colors.reset}`;

    // Output al console correspondiente
    if (level === "error") {
      console.error(prefix, formatted);
    } else if (level === "warn") {
      console.warn(prefix, formatted);
    } else {
      console.log(prefix, formatted);
    }
  }
}
