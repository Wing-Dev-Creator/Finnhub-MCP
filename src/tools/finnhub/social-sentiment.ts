import { z } from "zod";
import type { ToolRegistrar } from "../../types";
import { ok, err } from "../../types";
import { finnhubGet, daysAgoISO, todayISO, FinnhubError } from "../../lib/finnhub";

interface SocialMention {
  atTime: string;
  mention: number;
  positiveScore: number;
  negativeScore: number;
  positiveMention: number;
  negativeMention: number;
  score: number;
}

interface SocialResponse {
  reddit?: SocialMention[];
  twitter?: SocialMention[];
  symbol: string;
}

export const registerSocialSentiment: ToolRegistrar = (server, env) => {
  server.tool(
    "social_sentiment",
    "Daily social sentiment (Reddit + X/Twitter) for a ticker — mention counts plus positive/negative scoring. Use as a tertiary signal; treat with skepticism on small caps.",
    {
      symbol: z.string().describe("Stock ticker"),
      from: z.string().optional().describe("Start date YYYY-MM-DD. Defaults to 14 days ago."),
      to: z.string().optional().describe("End date YYYY-MM-DD. Defaults to today."),
    },
    async ({ symbol, from, to }) => {
      try {
        const data = await finnhubGet<SocialResponse>(
          "/stock/social-sentiment",
          { symbol: symbol.toUpperCase(), from: from ?? daysAgoISO(14), to: to ?? todayISO() },
          env.FINNHUB_API_KEY,
          env.USER_AGENT,
        );
        return ok({
          symbol: symbol.toUpperCase(),
          reddit: data.reddit?.slice(-14) ?? [],
          twitter: data.twitter?.slice(-14) ?? [],
        });
      } catch (e) {
        return err(e instanceof FinnhubError ? e.message : String(e));
      }
    },
  );
};
