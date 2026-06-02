import { z } from "zod";
import type { ToolRegistrar } from "../../types";
import { ok, err } from "../../types";
import { finnhubGet, daysAgoISO, todayISO, FinnhubError } from "../../lib/finnhub";

interface NewsItem {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image?: string;
  related?: string;
  source: string;
  summary: string;
  url: string;
}

export const registerCompanyNews: ToolRegistrar = (server, env) => {
  server.tool(
    "company_news",
    "Get recent news headlines for a specific stock ticker (Finnhub). Returns headline, source, datetime, URL, and short summary. Useful for verifying catalysts behind a price move.",
    {
      symbol: z.string().describe("Stock ticker, e.g. 'AAPL'"),
      from: z.string().optional().describe("Start date YYYY-MM-DD. Defaults to 7 days ago."),
      to: z.string().optional().describe("End date YYYY-MM-DD. Defaults to today."),
      limit: z.number().int().min(1).max(50).optional().describe("Max items to return (default 20, max 50)."),
    },
    async ({ symbol, from, to, limit }) => {
      try {
        const items = await finnhubGet<NewsItem[]>(
          "/company-news",
          { symbol: symbol.toUpperCase(), from: from ?? daysAgoISO(7), to: to ?? todayISO() },
          env.FINNHUB_API_KEY,
          env.USER_AGENT,
        );
        const trimmed = (items ?? []).slice(0, limit ?? 20).map((n) => ({
          datetime: new Date(n.datetime * 1000).toISOString(),
          headline: n.headline,
          source: n.source,
          summary: n.summary,
          url: n.url,
        }));
        return ok({ symbol: symbol.toUpperCase(), count: trimmed.length, items: trimmed });
      } catch (e) {
        return err(e instanceof FinnhubError ? e.message : String(e));
      }
    },
  );
};
