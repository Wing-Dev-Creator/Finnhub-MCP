const BASE = "https://finnhub.io/api/v1";

export class FinnhubError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`Finnhub ${status}: ${body.slice(0, 300)}`);
  }
}

export async function finnhubGet<T = unknown>(
  path: string,
  params: Record<string, string | number | undefined | null>,
  apiKey: string,
  userAgent: string,
): Promise<T> {
  if (!apiKey) throw new FinnhubError(0, "FINNHUB_API_KEY is not configured on the server");

  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") search.set(k, String(v));
  }
  search.set("token", apiKey);

  const res = await fetch(`${BASE}${path}?${search.toString()}`, {
    headers: { "User-Agent": userAgent, Accept: "application/json" },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new FinnhubError(res.status, body);
  }
  return (await res.json()) as T;
}

export function daysAgoISO(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
