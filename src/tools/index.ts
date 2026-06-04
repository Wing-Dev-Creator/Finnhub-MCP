import type { ToolRegistrar } from "../types";

import { registerCompanyNews } from "./finnhub/company-news";
import { registerAnalystRecommendations } from "./finnhub/analyst-recommendations";
import { registerPriceTargets } from "./finnhub/price-targets";
import { registerRevenueGrowth } from "./finnhub/revenue-growth";
import { registerInsiderSentiment } from "./finnhub/insider-sentiment";
import { registerSocialSentiment } from "./finnhub/social-sentiment";
import { registerEarningsSurprises } from "./finnhub/earnings-surprises";
import { registerPeerCompare } from "./finnhub/peer-compare";
import { registerCongressionalTrades } from "./finnhub/congressional-trades";
import { registerEconomicCalendar } from "./finnhub/economic-calendar";
import { registerSecFilingsRecent } from "./sec/filings-recent";
import { registerAggQuote } from "./yahoo/agg-quote";
import { registerRsi } from "./yahoo/rsi";

// Add new tool registrars here. Each one self-contained — see CONTRIBUTING.md.
export const TOOLS: ToolRegistrar[] = [
  // Finnhub
  registerCompanyNews,
  registerAnalystRecommendations,
  registerPriceTargets,
  registerRevenueGrowth,
  registerInsiderSentiment,
  registerSocialSentiment,
  registerEarningsSurprises,
  registerPeerCompare,
  registerCongressionalTrades,
  registerEconomicCalendar,
  // SEC EDGAR
  registerSecFilingsRecent,
  // Yahoo Finance
  registerAggQuote,
  registerRsi,
];
