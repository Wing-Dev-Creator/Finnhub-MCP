import { z } from "zod";
import type { ToolRegistrar } from "../../types";
import { ok, err } from "../../types";
import { finnhubGet, daysAgoISO, todayISO, FinnhubError } from "../../lib/finnhub";

interface EconomicEvent {
  actual: number | null;
  country: string;
  estimate: number | null;
  event: string;
  impact: string;
  prev: number | null;
  time: string;
  unit: string;
}

export const registerEconomicCalendar: ToolRegistrar = (server, env) => {
  server.tool(
    "economic_calendar",
    "Macro economic events (CPI, jobs, FOMC, etc.) in a date window. Use to spot upcoming releases that could move the broad market.",
    {
      from: z.string().optional().describe("Start date YYYY-MM-DD. Defaults to today."),
      to: z.string().optional().describe("End date YYYY-MM-DD. Defaults to 7 days out."),
      country: z.string().optional().describe("ISO country code filter (e.g. 'US'). Default: all."),
      minImpact: z.enum(["low", "medium", "high"]).optional().describe("Filter to events at or above this impact."),
    },
    async ({ from, to, country, minImpact }) => {
      try {
        const data = await finnhubGet<{ economicCalendar: EconomicEvent[] }>(
          "/calendar/economic",
          { from: from ?? todayISO(), to: to ?? daysAgoISO(-7) },
          env.FINNHUB_API_KEY,
          env.USER_AGENT,
        );
        let events = data?.economicCalendar ?? [];
        if (country) events = events.filter((e) => e.country?.toUpperCase() === country.toUpperCase());
        if (minImpact) {
          const order = { low: 0, medium: 1, high: 2 } as const;
          const min = order[minImpact];
          events = events.filter((e) => (order[e.impact as keyof typeof order] ?? -1) >= min);
        }
        return ok({ count: events.length, events });
      } catch (e) {
        return err(e instanceof FinnhubError ? e.message : String(e));
      }
    },
  );
};
