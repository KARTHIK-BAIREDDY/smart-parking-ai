/* eslint-disable */
// Lightweight structured logger for serverless environments

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogPayload {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  error?: string;
  stack?: string;
}

class StructuredLogger {
  private format(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): string {
    const payload: LogPayload = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
    };

    if (error) {
      payload.error = error.message;
      payload.stack = error.stack;
    }

    return JSON.stringify(payload);
  }

  info(message: string, context?: Record<string, any>) {
    console.log(this.format("info", message, context));
  }

  warn(message: string, context?: Record<string, any>) {
    console.warn(this.format("warn", message, context));
  }

  error(message: string, error?: Error, context?: Record<string, any>) {
    console.error(this.format("error", message, context, error));
  }

  debug(message: string, context?: Record<string, any>) {
    if (process.env.NODE_ENV !== "production") {
      console.debug(this.format("debug", message, context));
    }
  }
}

export const logger = new StructuredLogger();
