// Simple logger replacement for winston
interface Logger {
  info: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  debug: (message: string, ...args: any[]) => void;
}

const createLogger = (options?: any): Logger => {
  const timestamp = () => new Date().toISOString();

  return {
    info: (message: string, ...args: any[]) => {
      console.log(`[${timestamp()}] INFO: ${message}`, ...args);
    },
    error: (message: string, ...args: any[]) => {
      console.error(`[${timestamp()}] ERROR: ${message}`, ...args);
    },
    warn: (message: string, ...args: any[]) => {
      console.warn(`[${timestamp()}] WARN: ${message}`, ...args);
    },
    debug: (message: string, ...args: any[]) => {
      if (process.env.NODE_ENV !== "production") {
        console.log(`[${timestamp()}] DEBUG: ${message}`, ...args);
      }
    },
  };
};

const logger = createLogger({
  level: "info",
  defaultMeta: { service: "stashcord-backend" },
});

export default logger;
