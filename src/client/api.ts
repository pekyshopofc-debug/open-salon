export async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const opts: RequestInit = { method, headers: {} };
  const token = localStorage.getItem("admin_token");
  if (token) {
    (opts.headers as Record<string, string>)["Authorization"] = "Bearer " + token;
  }
  if (body) {
    (opts.headers as Record<string, string>)["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const r = await fetch(path, opts);
  if (r.status === 401) {
    localStorage.removeItem("admin_token");
    window.location.href = "/login";
    throw new Error("Sessão expirada. Faça login novamente.");
  }
  const text = await r.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Server error: ${r.status} ${r.statusText}`);
  }
  if (!r.ok) throw new Error((data as { error?: string }).error || "Request failed");
  return data as T;
}
