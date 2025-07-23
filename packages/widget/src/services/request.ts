import camelcaseKeys from 'camelcase-keys';
import decamelizeKeys from 'decamelize-keys';

import { hasValue } from '../utils/common';

export type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface RequestOptions {
  method?: RequestMethod;
  body?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
}

interface CommonErrorData {
  code: number;
  message: string;
  status?: string;
  details?: string;
}

interface MPCErrorData {
  error_code: number;
  error_details: {
    reason: string;
    server_error_code: number;
  };
  error_message: string;
}

export class RequestError<T extends CommonErrorData | MPCErrorData> extends Error {
  readonly code: number;

  constructor(data: T) {
    let message: string;
    let code: number;

    if ('error_message' in data) {
      message = data.error_message;
      code = data.error_code;
    } else {
      message = data.message;
      code = data.code;
    }

    super(message);
    this.name = 'RequestError';
    this.code = code;
  }
}

export async function request<T = unknown>(url: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', timeout = 15000, headers = {}, body } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const hasBody = hasValue(body) && ['POST', 'PUT', 'PATCH'].includes(method);

  const fetchOptions: RequestInit = {
    method,
    headers: {
      Accept: 'application/json',
      ...(hasBody && { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body: hasBody ? JSON.stringify(decamelizeKeys(body, { deep: true })) : undefined,
    signal: controller.signal,
  };

  try {
    const response = await fetch(url, fetchOptions);
    const rawData = await response.json();
    const normalizedData = camelcaseKeys(rawData, { deep: true });

    if (!response.ok) throw new RequestError(normalizedData);

    return normalizedData;
  } catch (error) {
    if (error instanceof RequestError) throw error;

    if (error instanceof Error) {
      if (error.name === 'AbortError') throw new RequestError({ code: 408, message: 'Request timeout' });
      throw new RequestError({ code: 0, message: error.message });
    }

    throw new RequestError({ code: 0, message: 'Unknown error occurred' });
  } finally {
    clearTimeout(timeoutId);
  }
}
