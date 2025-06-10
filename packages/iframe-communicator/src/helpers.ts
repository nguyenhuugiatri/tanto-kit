import { v4 } from 'uuid';

import type { Message } from './types';

export const generateMessageId = (): string => v4();

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function isWindow(obj: any): obj is Window {
  return obj instanceof Window || (obj && typeof obj === 'object' && 'window' in obj && obj.window === obj);
}

export function isValidMessage(data: unknown): data is Message {
  return (
    !!data &&
    typeof data === 'object' &&
    'id' in data &&
    typeof data.id === 'string' &&
    'type' in data &&
    typeof data.type === 'string' &&
    'method' in data &&
    typeof data.method === 'string'
  );
}
