import { z } from "zod";
import type { ToolRegistrar } from "../../types";
import { ok, err } from "../../types";
import { finnhubGet, FinnhubError } from "../../lib/finnhub";

// Finnhub basic-financials endpoint returns ~120 fundamentals fields, including
// recent quarterly metrics. We extract revenue growth as a clean quality signal.
// Free tier supports this endpoint.

interface BasicFinancials {
  metric?: Record<string, number | string | null | undefined>;
  series?: {
    quarterly?: Record<string, Array<{ period: string; v: number }>>;
    annual?: Record<string, Array<{ period: string; v: number }>>;
  };
}

export const registerRevenueGrowth: ToolRegistrar = (server, env) => {
  server.tool(
    "revenue_growth",
    "Quarterly revenue growth metrics from Finnhub. Returns latest YoY and TTM revenue growth percentages. Positive YoY growth at >5% is a quality signal — a stock that's cheap AND growing is a real value setup, not a value trap.",
    {
      symbol: z.string().describe("Stock ticker, e.g. 'MSFT'"),
    },
    async ({ symbol }) => {
      try {
        const data = await finnhubGet<BasicFinancials>(
          "/stock/metric",
          { symbol: symbol.toUpperCase(), metric: "all" },
          env.FINNHUB_API_KEY,
          env.USER_AGENT,
        );
        const m = data.metric ?? {};
        const revGrowthQuarterly = m.revenueGrowthQuarterlyYoy as number | undefined;
        const revGrowthTTM = m.revenueGrowthTTMYoy as number | undefined;
        const revGrowth5y = m.revenueGrowth5Y as number | undefined;
        const epsGrowthTTM = m.epsGrowthTTMYoy as number | undefined;
        const grossMarginTTM = m.grossMarginTTM as number | undefined;
        const operatingMarginTTM = m.operatingMarginTTM as number | undefined;
        const fcfMargin5y = m.focfCagr5Y as number | undefined;

        return ok({
          symbol: symbol.toUpperCase(),
          revenueGrowthYoYQuarterly: revGrowthQuarterly,
          revenueGrowthTTM: revGrowthTTM,
          revenueGrowth5Year: revGrowth5y,
          epsGrowthTTM,
          grossMarginTTM,
          operatingMarginTTM,
          freeCashFlow5YearGrowth: fcfMargin5y,
          interpretation:
            revGrowthQuarterly !== undefined
              ? revGrowthQuarterly > 10
                ? "strong growth"
                : revGrowthQuarterly > 5
                  ? "healthy growth"
                  : revGrowthQuarterly > 0
                    ? "modest growth"
                    : "contracting"
              : "no data",
        });
      } catch (e) {
        return err(e instanceof FinnhubError ? e.message : String(e));
      }
    },
  );
};
