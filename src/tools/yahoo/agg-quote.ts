import { z } from "zod";
import type { ToolRegistrar } from "../../types";
import { ok, err } from "../../types";

// Yahoo Finance public endpoints are unofficial — they're stable but can change
// without notice. Use as a cross-check / backup, not as a primary source.

interface YahooQuoteResult {
  symbol: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketOpen?: number;
  regularMarketPreviousClose?: number;
  regularMarketVolume?: number;
  marketCap?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  fiftyDayAverage?: number;
  twoHundredDayAverage?: number;
  trailingPE?: number;
  forwardPE?: number;
  epsTrailingTwelveMonths?: number;
  epsForward?: number;
  dividendYield?: number;
  averageDailyVolume3Month?: number;
  exchange?: string;
  preMarketPrice?: number;
  preMarketChangePercent?: number;
  postMarketPrice?: number;
  postMarketChangePercent?: number;
}

export const registerAggQuote: ToolRegistrar = (server, env) => {
  server.tool(
    "agg_quote",
    "Aggregated quote from Yahoo Finance: price, day/52w range, moving averages, P/E ratios, market cap, pre/post-market. Use as a cross-check against your primary quote source.",
    {
      symbols: z.array(z.string()).min(1).max(20).describe("List of tickers, e.g. ['AAPL','MSFT']"),
    },
    async ({ symbols }) => {
      try {
        const symbolList = symbols.map((s) => s.toUpperCase()).join(",");
        const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbolList)}`;
        const res = await fetch(url, {
          headers: {
            "User-Agent": env.USER_AGENT,
            Accept: "application/json",
          },
        });
        if (!res.ok) return err(`Yahoo quote ${res.status}`);
        const json = (await res.json()) as { quoteResponse?: { result?: YahooQuoteResult[]; error?: unknown } };
        const results = json.quoteResponse?.result ?? [];
        return ok({ count: results.length, quotes: results });
      } catch (e) {
        return err(String(e));
      }
    },
  );
};
