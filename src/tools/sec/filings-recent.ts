import { z } from "zod";
import type { ToolRegistrar } from "../../types";
import { ok, err } from "../../types";

// Cache ticker→CIK across requests within an isolate. The SEC tickers file is
// ~1MB and changes rarely; fetching it on every call would be wasteful and
// hit SEC rate limits.
let tickerMapPromise: Promise<Map<string, { cik: string; title: string }>> | null = null;

async function getTickerMap(userAgent: string): Promise<Map<string, { cik: string; title: string }>> {
  if (!tickerMapPromise) {
    tickerMapPromise = (async () => {
      const res = await fetch("https://www.sec.gov/files/company_tickers.json", {
        headers: {
          "User-Agent": userAgent,
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          Host: "www.sec.gov",
        },
      });
      if (!res.ok) throw new Error(`SEC tickers fetch ${res.status} — SEC requires a User-Agent with contact email. Set SEC_USER_AGENT in wrangler.toml to "your-app your-email@example.com".`);
      const data = (await res.json()) as Record<string, { cik_str: number; ticker: string; title: string }>;
      const map = new Map<string, { cik: string; title: string }>();
      for (const v of Object.values(data)) {
        map.set(v.ticker.toUpperCase(), {
          cik: String(v.cik_str).padStart(10, "0"),
          title: v.title,
        });
      }
      return map;
    })().catch((e) => {
      tickerMapPromise = null;
      throw e;
    });
  }
  return tickerMapPromise;
}

interface Submissions {
  cik: string;
  name: string;
  filings: {
    recent: {
      accessionNumber: string[];
      filingDate: string[];
      reportDate: string[];
      form: string[];
      primaryDocument: string[];
      primaryDocDescription: string[];
    };
  };
}

export const registerSecFilingsRecent: ToolRegistrar = (server, env) => {
  server.tool(
    "sec_filings_recent",
    "Recent SEC EDGAR filings for a US-listed ticker, straight from the regulator. Free, no API key. Useful for 8-K (material events), 10-Q/10-K, 13D/G (large stake disclosures), Form 4 (insider transactions).",
    {
      symbol: z.string().describe("Stock ticker, e.g. 'AAPL'"),
      forms: z.array(z.string()).optional().describe("Filter to specific form types, e.g. ['8-K','10-Q','13D']. Default: all forms."),
      limit: z.number().int().min(1).max(50).optional().describe("Max filings to return (default 15)."),
    },
    async ({ symbol, forms, limit }) => {
      try {
        const map = await getTickerMap(env.SEC_USER_AGENT);
        const hit = map.get(symbol.toUpperCase());
        if (!hit) return err(`Ticker ${symbol} not found in SEC EDGAR (must be US-listed)`);

        const submissionsRes = await fetch(`https://data.sec.gov/submissions/CIK${hit.cik}.json`, {
          headers: {
            "User-Agent": env.SEC_USER_AGENT,
            Accept: "application/json",
            Host: "data.sec.gov",
          },
        });
        if (!submissionsRes.ok) return err(`SEC submissions ${submissionsRes.status}`);
        const data = (await submissionsRes.json()) as Submissions;
        const r = data.filings.recent;
        const wantedForms = forms?.map((f) => f.toUpperCase());
        const cap = limit ?? 15;

        const items: Array<Record<string, string>> = [];
        for (let i = 0; i < r.form.length && items.length < cap; i++) {
          const form = r.form[i];
          if (wantedForms && !wantedForms.includes(form.toUpperCase())) continue;
          const accNoNoHyphen = r.accessionNumber[i].replace(/-/g, "");
          items.push({
            form,
            filingDate: r.filingDate[i],
            reportDate: r.reportDate[i] || "",
            description: r.primaryDocDescription[i] || "",
            url: `https://www.sec.gov/Archives/edgar/data/${parseInt(hit.cik, 10)}/${accNoNoHyphen}/${r.primaryDocument[i]}`,
          });
        }

        return ok({ symbol: symbol.toUpperCase(), company: data.name, cik: hit.cik, filings: items });
      } catch (e) {
        return err(String(e));
      }
    },
  );
};
