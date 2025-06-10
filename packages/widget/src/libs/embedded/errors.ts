export class EmbeddedError extends Error {
  constructor(message: string, public readonly code: string, public readonly details?: Record<string, any>) {
    super(`[${code}] ${message}`);
    this.name = 'EmbeddedError';
  }
}

export const ErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  WALLET_NOT_UNLOCKED: 'WALLET_NOT_UNLOCKED',
} as const;
