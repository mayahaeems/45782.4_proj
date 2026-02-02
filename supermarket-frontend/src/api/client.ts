const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

async function safeText(res: Response) {
  try { return await res.text(); } catch { return ""; }
}

export async function apiGet<T>(path: string, token?: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status} ${await safeText(res)}`);
  return (await res.json()) as T;
}

export async function apiPost<T>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status} ${await safeText(res)}`);
  return (await res.json()) as T;
}
