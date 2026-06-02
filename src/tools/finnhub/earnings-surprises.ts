import { z } from "zod";
import type { ToolRegistrar } from "../../types";
import { ok, err } from "../../types";
import { finnhubGet, FinnhubError } from "../../lib/finnhub";

interface Surprise {
  actual: number;
  estimate: number;
  period: string;
  quarter: number;
  surprise: number;
  surprisePercent: number;
  symbol: string;
  year: number;
}

export const registerEarningsSurprises: ToolRegistrar = (server, env) => {
  server.tool(
    "earnings_surprises",
    "Quarterly EPS beat/miss history for a ticker (actual vs estimate). Recent consistent beats are a quality signal; recent misses are a yellow flag.",
    {
      symbol: z.string().describe("Stock ticker"),
      limit: z.number().int().min(1).max(20).optional().describe("How many recent quarters (default 4)."),
    },
    async ({ symbol, limit }) => {
      try {
        const data = await finnhubGet<Surprise[]>(
          "/stock/earnings",
          { symbol: symbol.toUpperCase(), limit: limit ?? 4 },
          env.FINNHUB_API_KEY,
          env.USER_AGENT,
        );
        return ok({ symbol: symbol.toUpperCase(), quarters: data ?? [] });
      } catch (e) {
        return err(e instanceof FinnhubError ? e.message : String(e));
      }
    },
  );
};
