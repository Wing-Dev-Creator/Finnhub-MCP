import { z } from "zod";
import type { ToolRegistrar } from "../../types";
import { ok, err } from "../../types";
import { finnhubGet, FinnhubError } from "../../lib/finnhub";

interface Recommendation {
  buy: number;
  hold: number;
  period: string;
  sell: number;
  strongBuy: number;
  strongSell: number;
  symbol: string;
}

export const registerAnalystRecommendations: ToolRegistrar = (server, env) => {
  server.tool(
    "analyst_recommendations",
    "Get analyst recommendation trends (strong buy / buy / hold / sell / strong sell counts) per month for a ticker. Useful for detecting consensus shifts.",
    {
      symbol: z.string().describe("Stock ticker, e.g. 'NVDA'"),
      months: z.number().int().min(1).max(24).optional().describe("How many most-recent monthly snapshots to return (default 6)."),
    },
    async ({ symbol, months }) => {
      try {
        const data = await finnhubGet<Recommendation[]>(
          "/stock/recommendation",
          { symbol: symbol.toUpperCase() },
          env.FINNHUB_API_KEY,
          env.USER_AGENT,
        );
        const trimmed = (data ?? []).slice(0, months ?? 6);
        return ok({ symbol: symbol.toUpperCase(), snapshots: trimmed });
      } catch (e) {
        return err(e instanceof FinnhubError ? e.message : String(e));
      }
    },
  );
};
