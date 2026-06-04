# equity-intel-mcp

An open-source [MCP](https://modelcontextprotocol.io) server that gives AI agents
rich equity research signals — Finnhub news/analyst/insider/social/congressional
data, SEC EDGAR filings, and a backup Yahoo Finance quote — deployable to
Cloudflare Workers in one command.

Built for use with [Claude](https://claude.ai), Claude Code, Cursor, and any
other MCP-compatible client.

## What it gives your agent

10 tools, all free to call once you bring your own Finnhub API key:

| Tool | Source | What it returns |
|---|---|---|
| `company_news` | Finnhub | Per-ticker headlines with source, datetime, summary, URL |
| `analyst_recommendations` | Finnhub | Buy/Hold/Sell counts per month |
| `insider_sentiment` | Finnhub | Monthly insider buying ratio (MSPR) |
| `social_sentiment` | Finnhub | Reddit + Twitter mentions & sentiment |
| `earnings_surprises` | Finnhub | Quarterly EPS actual vs estimate |
| `peer_compare` | Finnhub | Sector peer tickers |
| `congressional_trades` | Finnhub | US House/Senate trades per ticker |
| `economic_calendar` | Finnhub | Upcoming macro events filterable by country & impact |
| `sec_filings_recent` | SEC EDGAR | 8-K, 10-Q, 10-K, 13D/G, Form 4 filings (no API key needed) |
| `agg_quote` | Yahoo Finance | Cross-check quote with P/E, 52w range, MAs, pre/post-market |

Adding a new tool is one file — see [CONTRIBUTING.md](CONTRIBUTING.md).

## Quick deploy (Cloudflare Workers)

You need: a [Cloudflare account](https://dash.cloudflare.com) (free), a
[Finnhub API key](https://finnhub.io/register) (free), and Node 20+.

```bash
git clone https://github.com/YOUR_USERNAME/equity-intel-mcp.git
cd equity-intel-mcp
npm install

# Login to Cloudflare
npx wrangler login

# Set your Finnhub API key as a Workers secret
npx wrangler secret put FINNHUB_API_KEY
# (paste your key when prompted)

# Set your SEC contact User-Agent. SEC EDGAR requires this to identify
# you in case your script misbehaves. Format: "AppName your.email@example.com"
npx wrangler secret put SEC_USER_AGENT
# (paste e.g. "equity-intel-mcp your.email@example.com" when prompted)

# Deploy
npm run deploy
```

After deploy, wrangler prints a URL like
`https://equity-intel-mcp.YOUR_SUBDOMAIN.workers.dev`. Your MCP endpoint is at
`/mcp` on that URL.

## Local development

```bash
cp .dev.vars.example .dev.vars
# edit .dev.vars and paste your Finnhub key
npm run dev
```

`wrangler dev` will start a local server, usually at `http://localhost:8787`.
You can test the MCP endpoint with any MCP client, or with
`curl http://localhost:8787/health`.

## Connect to Claude

### Claude.ai (web)

1. Open https://claude.ai/customize/connectors
2. Click **+ Add custom connector**
3. Paste your deploy URL with `/mcp` appended:
   `https://equity-intel-mcp.YOUR_SUBDOMAIN.workers.dev/mcp`
4. Save → toggle the tools you want on the connector page

### Claude Code (CLI)

```bash
claude mcp add equity-intel --transport http https://equity-intel-mcp.YOUR_SUBDOMAIN.workers.dev/mcp
```

### Cursor

Add to your `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "equity-intel": {
      "url": "https://equity-intel-mcp.YOUR_SUBDOMAIN.workers.dev/mcp"
    }
  }
}
```

## Why Cloudflare Workers?

- **Free tier covers way more than a personal agent will use** (100k requests/day)
- **No cold starts** — Workers are warm globally within ~50ms
- **First-class Durable Objects** for MCP session state
- **One-command deploy** with `wrangler deploy`

You can adapt it to any host that runs `@modelcontextprotocol/sdk` over HTTP —
PRs welcome for Vercel/Deno/Bun/Node adapters.

## Project layout

```
src/
├── index.ts                 # Worker entry, McpAgent setup
├── types.ts                 # Shared types (Env, ToolRegistrar, helpers)
├── lib/
│   ├── finnhub.ts           # Finnhub API client
│   └── http.ts              # Generic fetch helpers
└── tools/
    ├── index.ts             # Tool registry — import new tools here
    ├── finnhub/             # One file per Finnhub tool
    ├── sec/                 # SEC EDGAR tools (no API key)
    └── yahoo/               # Yahoo Finance tools (unofficial, no API key)
```

## Disclaimer

This is research tooling. Not investment advice. The Yahoo Finance endpoints
are unofficial and may break. Free Finnhub plans rate-limit aggressively (60
calls/minute). Always cross-check trade-critical data against your broker.

## License

MIT — see [LICENSE](LICENSE).
