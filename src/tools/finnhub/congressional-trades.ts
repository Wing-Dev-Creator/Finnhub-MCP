import { z } from "zod";
import type { ToolRegistrar } from "../../types";
import { ok, err } from "../../types";
import { finnhubGet, daysAgoISO, todayISO, FinnhubError } from "../../lib/finnhub";

interface CongressionalTrade {
  amountFrom: number;
  amountTo: number;
  assetName: string;
  filingDate: string;
  name: string;
  ownerType: string;
  position: string;
  symbol: string;
  transactionDate: string;
  transactionType: string;
}

export const registerCongressionalTrades: ToolRegistrar = (server, env) => {
  server.tool(
    "congressional_trades",
    "Recent congressional (US House/Senate) trades for a ticker via Finnhub. Cluster buying by multiple members can be a non-public-but-public-disclosure signal.",
    {
      symbol: z.string().describe("Stock ticker"),
      from: z.string().optional().describe("Start date YYYY-MM-DD. Defaults to ~90 days ago."),
      to: z.string().optional().describe("End date YYYY-MM-DD. Defaults to today."),
    },
    async ({ symbol, from, to }) => {
      try {
        const data = await finnhubGet<{ data: CongressionalTrade[] }>(
          "/stock/congressional-trading",
          { symbol: symbol.toUpperCase(), from: from ?? daysAgoISO(90), to: to ?? todayISO() },
          env.FINNHUB_API_KEY,
          env.USER_AGENT,
        );
        return ok({ symbol: symbol.toUpperCase(), trades: data?.data ?? [] });
      } catch (e) {
        return err(e instanceof FinnhubError ? e.message : String(e));
      }
    },
  );
};
