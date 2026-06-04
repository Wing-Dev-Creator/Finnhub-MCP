import { z } from "zod";
import type { ToolRegistrar } from "../../types";
import { ok, err } from "../../types";

// Computes RSI(period) from Yahoo Finance daily closes. Wilder's smoothing —
// the standard RSI formulation used by every charting platform.
// No API key required. Free, self-contained.

interface ChartResponse {
  chart: {
    result?: Array<{
      timestamp?: number[];
      indicators?: { quote?: Array<{ close?: (number | null)[] }> };
    }>;
    error?: { code: string; description: string } | null;
  };
}

function computeRSI(closes: number[], period: number): number | null {
  if (closes.length < period + 1) return null;

  let gains = 0;
  let losses = 0;
  // Seed: simple average of first `period` changes
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change >= 0) gains += change;
    else losses -= change;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Wilder's smoothing for the rest
  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

async function fetchCloses(symbol: string, userAgent: string, days: number): Promise<number[]> {
  // Fetch ~2x the period to allow Wilder's smoothing to stabilize.
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=${days}d`;
  const res = await fetch(url, {
    headers: { "User-Agent": userAgent, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Yahoo chart ${res.status}`);
  const json = (await res.json()) as ChartResponse;
  if (json.chart.error) throw new Error(json.chart.error.description);
  const closes = json.chart.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
  return closes.filter((c): c is number => c !== null && c !== undefined);
}

export const registerRsi: ToolRegistrar = (server, env) => {
  server.tool(
    "rsi",
    "Computes RSI (Relative Strength Index) from daily closes via Yahoo Finance. Wilder's smoothing. Default period 14. RSI<30 = oversold, RSI>70 = overheated, RSI<50 = not stretched (useful as a 'not overbought' filter for value entries).",
    {
      symbol: z.string().describe("Stock ticker, e.g. 'MSFT'"),
      period: z.number().int().min(2).max(50).optional().describe("RSI lookback period (default 14)."),
    },
    async ({ symbol, period }) => {
      try {
        const p = period ?? 14;
        // Use a 60-day window to let Wilder's smoothing settle; need at least p+1.
        const closes = await fetchCloses(symbol.toUpperCase(), env.USER_AGENT, 60);
        if (closes.length < p + 1) return err(`Not enough price history for ${symbol} (need ${p + 1} closes, got ${closes.length})`);
        const rsi = computeRSI(closes, p);
        if (rsi === null) return err("RSI computation failed");
        return ok({
          symbol: symbol.toUpperCase(),
          period: p,
          rsi: Number(rsi.toFixed(2)),
          latestClose: closes[closes.length - 1],
          interpretation:
            rsi >= 70 ? "overbought" : rsi <= 30 ? "oversold" : rsi < 50 ? "neutral-bearish" : "neutral-bullish",
        });
      } catch (e) {
        return err(String(e));
      }
    },
  );
};
