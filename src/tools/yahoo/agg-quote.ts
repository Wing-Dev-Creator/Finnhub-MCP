import { z } from "zod";
import type { ToolRegistrar } from "../../types";
import { ok, err } from "../../types";

// Yahoo Finance public endpoints are unofficial — they're stable but can change
// without notice. The v7/quote endpoint now requires a session cookie + crumb;
// the v8/finance/chart endpoint still works unauthenticated and gives us core
// quote metadata in the `meta` field. We use that as a backup quote source.

interface ChartMeta {
  currency?: string;
  symbol?: string;
  exchangeName?: string;
  instrumentType?: string;
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  previousClose?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume?: number;
  longName?: string;
  shortName?: string;
}

interface ChartResponse {
  chart: {
    result?: Array<{ meta: ChartMeta }>;
    error?: { code: string; description: string } | null;
  };
}

async function fetchOne(symbol: string, userAgent: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  const res = await fetch(url, {
    headers: { "User-Agent": userAgent, Accept: "application/json" },
  });
  if (!res.ok) return { symbol, error: `HTTP ${res.status}` };
  const json = (await res.json()) as ChartResponse;
  if (json.chart.error) return { symbol, error: json.chart.error.description };
  const meta = json.chart.result?.[0]?.meta;
  if (!meta) return { symbol, error: "no data" };
  const prev = meta.previousClose ?? meta.chartPreviousClose;
  const price = meta.regularMarketPrice;
  const change = price !== undefined && prev !== undefined ? price - prev : undefined;
  const changePct = change !== undefined && prev ? (change / prev) * 100 : undefined;
  return {
    symbol: meta.symbol ?? symbol,
    name: meta.longName ?? meta.shortName,
    exchange: meta.exchangeName,
    price,
    previousClose: prev,
    change: change !== undefined ? Number(change.toFixed(2)) : null,
    changePercent: changePct !== undefined ? Number(changePct.toFixed(2)) : null,
    dayHigh: meta.regularMarketDayHigh,
    dayLow: meta.regularMarketDayLow,
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
    volume: meta.regularMarketVolume,
    currency: meta.currency,
  };
}

export const registerAggQuote: ToolRegistrar = (server, env) => {
  server.tool(
    "agg_quote",
    "Backup quote from Yahoo Finance (price, day range, 52w range, volume). Use as a cross-check against your primary quote source — especially useful when other sources show inconsistent data.",
    {
      symbols: z.array(z.string()).min(1).max(20).describe("List of tickers, e.g. ['AAPL','MSFT']"),
    },
    async ({ symbols }) => {
      try {
        const upper = symbols.map((s) => s.toUpperCase());
        const results = await Promise.all(upper.map((s) => fetchOne(s, env.USER_AGENT)));
        return ok({ count: results.length, quotes: results });
      } catch (e) {
        return err(String(e));
      }
    },
  );
};
