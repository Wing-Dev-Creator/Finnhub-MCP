export async function fetchJSON<T = unknown>(
  url: string,
  init: RequestInit & { userAgent?: string } = {},
): Promise<T> {
  const { userAgent, headers, ...rest } = init;
  const h = new Headers(headers);
  if (userAgent && !h.has("User-Agent")) h.set("User-Agent", userAgent);
  if (!h.has("Accept")) h.set("Accept", "application/json");

  const res = await fetch(url, { ...rest, headers: h });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} for ${url} :: ${body.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}
