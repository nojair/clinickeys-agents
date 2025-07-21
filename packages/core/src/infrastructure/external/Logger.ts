// packages/core/src/infrastructure/external/Logger.ts

import util from "util";

export type LogLevel = "debug" | "info" | "warn" | "error";

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
        : util.inspect(message, { depth: 4, colors: false, breakLength: 100 });
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    // Simple output to console, can be redirected
    // You can customize to integrate with cloud providers
    if (level === "error") {
      console.error(prefix, formatted);
    } else if (level === "warn") {
      console.warn(prefix, formatted);
    } else {
      console.log(prefix, formatted);
    }
  }
}
