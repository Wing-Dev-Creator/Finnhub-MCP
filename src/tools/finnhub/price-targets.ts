import { z } from "zod";
import type { ToolRegistrar } from "../../types";
import { ok, err } from "../../types";
import { finnhubGet, FinnhubError } from "../../lib/finnhub";

interface PriceTargetResponse {
  lastUpdated: string;
  symbol: string;
  targetHigh: number;
  targetLow: number;
  targetMean: number;
  targetMedian: number;
}

export const registerPriceTargets: ToolRegistrar = (server, env) => {
  server.tool(
    "price_targets",
    "Analyst price target consensus for a ticker — high, low, median, mean. Compare against current price to compute upside/downside vs Street. A current price >10% below targetMedian with rising buy ratings is a classic value setup.",
    {
      symbol: z.string().describe("Stock ticker, e.g. 'NVDA'"),
    },
    async ({ symbol }) => {
      try {
        const data = await finnhubGet<PriceTargetResponse>(
          "/stock/price-target",
          { symbol: symbol.toUpperCase() },
          env.FINNHUB_API_KEY,
          env.USER_AGENT,
        );
        return ok(data);
      } catch (e) {
        return err(e instanceof FinnhubError ? e.message : String(e));
      }
    },
  );
};
