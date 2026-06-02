# Contributing

Thanks for considering a contribution. Adding new tools is the easiest place
to start — the pattern is small and self-contained.

## Adding a new tool

Each tool is a single file that exports a registrar function.

**1. Pick a directory** under `src/tools/` based on data source:

- `finnhub/` — anything backed by [Finnhub](https://finnhub.io/)
- `sec/` — anything backed by SEC EDGAR (no API key needed)
- `yahoo/` — unofficial Yahoo Finance endpoints
- Create a new directory for a new source

**2. Create a file** like `src/tools/finnhub/my-new-tool.ts`:

```ts
import { z } from "zod";
import type { ToolRegistrar } from "../../types.ts";
import { ok, err } from "../../types.ts";
import { finnhubGet, FinnhubError } from "../../lib/finnhub.ts";

export const registerMyNewTool: ToolRegistrar = (server, env) => {
  server.tool(
    "my_new_tool",                                  // snake_case name
    "What it does, briefly. When the agent should call it.",
    {
      symbol: z.string().describe("Stock ticker"),
      // ...other params with .describe() for clarity to the LLM
    },
    async ({ symbol }) => {
      try {
        const data = await finnhubGet<unknown>(
          "/some/finnhub/endpoint",
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
```

**3. Register it** in `src/tools/index.ts`:

```ts
import { registerMyNewTool } from "./finnhub/my-new-tool.ts";
// ...
export const TOOLS: ToolRegistrar[] = [
  // ...existing
  registerMyNewTool,
];
```

That's it. `npm run dev` to test, `npm run deploy` to ship.

## Guidelines

- **Name tools `snake_case`** — convention across the MCP ecosystem.
- **Write descriptions for the LLM, not humans** — the description is what
  the model sees when deciding whether to call the tool. Be specific about
  when it's the right tool to use.
- **Use `.describe()` on every Zod field** — same reason.
- **Handle errors with `err(message)`** instead of throwing — the model gets
  a useful error string and can adjust.
- **Don't hard-code secrets** — pull from `env` only.
- **If you add a new data source**, add a thin client in `src/lib/` and reuse
  it across tools from that source.

## Adding a new data source

If your tool needs a new third-party API:

1. Add a thin client in `src/lib/yoursource.ts` (mirror `finnhub.ts`).
2. Add the API key to `Env` in `src/types.ts` if needed.
3. Document the new secret in `README.md` and `.dev.vars.example`.
4. Add it to `wrangler.toml` setup instructions.

## Code style

- TypeScript strict mode is on.
- Run `npm run typecheck` and `npm run format` before opening a PR.
- Keep tool files under 100 lines where possible — split into helpers if
  it grows.

## Testing

For now, manual testing via `npm run dev` + an MCP client. Test fixtures and
unit tests are welcome PRs.
