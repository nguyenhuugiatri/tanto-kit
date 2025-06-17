export async function request<ReturnValue = unknown>(
  url: string | URL | globalThis.Request,
  init: Omit<RequestInit, 'body'> & { body?: NonNullable<unknown> },
): Promise<ReturnValue> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...init.headers,
  };

  const body = init.body ? JSON.stringify(init.body) : undefined;

  const r = await fetch(url, {
    ...init,
    headers,
    body,
  });

  return r.json() as Promise<ReturnValue>;
}
