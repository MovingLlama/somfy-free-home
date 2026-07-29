export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  SUCCESS = 2,
  WARN = 3,
  ERROR = 4
}

class Logger {
  private level: LogLevel = LogLevel.INFO;

  public setLogLevel(level: LogLevel): void {
    this.level = level;
  }

  private formatTimestamp(): string {
    const now = new Date();
    return now.toISOString().replace('T', ' ').replace('Z', '');
  }

  private sanitize(message: string): string {
    // Mask passwords or tokens in log strings
    return message
      .replace(/(password["':=]\s*["'])([^"']+)(["'])/gi, '$1***MASKED***$3')
      .replace(/(JSESSIONID=)[a-zA-Z0-9_-]+/gi, '$1***MASKED***')
      .replace(/(token["':=]\s*["'])([^"']+)(["'])/gi, '$1***MASKED***$3');
  }

  public debug(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.log(`[${this.formatTimestamp()}] [DEBUG] ${this.sanitize(message)}`, ...args);
    }
  }

  public info(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.INFO) {
      console.log(`[${this.formatTimestamp()}] [INFO] ${this.sanitize(message)}`, ...args);
    }
  }

  public success(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.SUCCESS) {
      console.log(`[${this.formatTimestamp()}] [SUCCESS] ${this.sanitize(message)}`, ...args);
    }
  }

  public warn(message: string, ...args: any[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(`[${this.formatTimestamp()}] [WARN] ${this.sanitize(message)}`, ...args);
    }
  }

  public error(message: string, error?: any): void {
    if (this.level <= LogLevel.ERROR) {
      const errDetail = error instanceof Error ? error.stack || error.message : error ? JSON.stringify(error) : '';
      console.error(`[${this.formatTimestamp()}] [ERROR] ${this.sanitize(message)} ${errDetail}`);
    }
  }
}

export const logger = new Logger();
