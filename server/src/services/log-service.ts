export const log = {
  info(message: string, meta?: unknown): void {
    console.log(`[server] ${message}`, meta ?? '');
  },
  error(message: string, meta?: unknown): void {
    console.error(`[server] ${message}`, meta ?? '');
  }
};
