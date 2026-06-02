import { z } from "zod";
import type { ToolRegistrar } from "../../types";
import { ok, err } from "../../types";
import { finnhubGet, daysAgoISO, todayISO, FinnhubError } from "../../lib/finnhub";

interface InsiderSentimentResponse {
  data: Array<{ symbol: string; year: number; month: number; change: number; mspr: number }>;
  symbol: string;
}

export const registerInsiderSentiment: ToolRegistrar = (server, env) => {
  server.tool(
    "insider_sentiment",
    "Monthly insider trading sentiment (MSPR) from Finnhub. MSPR > 0 = net insider buying, < 0 = net selling. Strong positive readings at quality names are a bullish signal.",
    {
      symbol: z.string().describe("Stock ticker"),
      from: z.string().optional().describe("Start date YYYY-MM-DD. Defaults to ~6 months ago."),
      to: z.string().optional().describe("End date YYYY-MM-DD. Defaults to today."),
    },
    async ({ symbol, from, to }) => {
      try {
        const data = await finnhubGet<InsiderSentimentResponse>(
          "/stock/insider-sentiment",
          { symbol: symbol.toUpperCase(), from: from ?? daysAgoISO(180), to: to ?? todayISO() },
          env.FINNHUB_API_KEY,
          env.USER_AGENT,
        );
        return ok({ symbol: symbol.toUpperCase(), monthly: data.data ?? [] });
      } catch (e) {
        return err(e instanceof FinnhubError ? e.message : String(e));
      }
    },
  );
};
