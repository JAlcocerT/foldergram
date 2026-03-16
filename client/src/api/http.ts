export async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? 'GET').toUpperCase();
  const headers = new Headers(init?.headers);

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    headers.set('x-foldergram-intent', '1');
  }

  const response = await fetch(input, {
    ...init,
    headers
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const payload = (await response.json()) as { message?: string };
      if (payload.message) {
        message = payload.message;
      }
    } catch {
      return Promise.reject(new Error(message));
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}
