import { z } from "zod";
import type { ToolRegistrar } from "../../types";
import { ok, err } from "../../types";
import { finnhubGet, FinnhubError } from "../../lib/finnhub";

export const registerPeerCompare: ToolRegistrar = (server, env) => {
  server.tool(
    "peer_compare",
    "List sector peers for a ticker. Useful to find comparable names when evaluating valuation, sector rotation, or potential alternatives.",
    {
      symbol: z.string().describe("Stock ticker"),
    },
    async ({ symbol }) => {
      try {
        const peers = await finnhubGet<string[]>(
          "/stock/peers",
          { symbol: symbol.toUpperCase() },
          env.FINNHUB_API_KEY,
          env.USER_AGENT,
        );
        return ok({ symbol: symbol.toUpperCase(), peers: peers ?? [] });
      } catch (e) {
        return err(e instanceof FinnhubError ? e.message : String(e));
      }
    },
  );
};
