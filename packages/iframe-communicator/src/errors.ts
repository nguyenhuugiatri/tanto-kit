export class CommunicatorError extends Error {
  constructor(message: string, public readonly code: string, public readonly details?: Record<string, any>) {
    super(`[${code}] ${message}`);
    this.name = 'CommunicatorError';
  }
}

export const ErrorCodes = {
  CONNECTION: {
    PING_TIMEOUT: 'PING_TIMEOUT',
    CONNECT_TIMEOUT: 'CONNECT_TIMEOUT',
    NO_DESTINATION: 'NO_DESTINATION',
    INVALID_TARGET: 'INVALID_TARGET',
    MAX_ATTEMPTS: 'MAX_ATTEMPTS',
    PORT_NOT_INITIALIZED: 'PORT_NOT_INITIALIZED',
    PARENT_ORIGIN_NOT_FOUND: 'PARENT_ORIGIN_NOT_FOUND',
  },
  MESSAGE: {
    INVALID_FORMAT: 'INVALID_FORMAT',
    SEND_TIMEOUT: 'SEND_TIMEOUT',
    MISSING_ORIGIN: 'MISSING_ORIGIN',
  },
} as const;
