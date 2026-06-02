import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Env } from "./types";
import { TOOLS } from "./tools/index";

export class EquityIntelMCP extends McpAgent<Env> {
  server = new McpServer({
    name: "equity-intel-mcp",
    version: "0.1.0",
  });

  async init() {
    for (const register of TOOLS) {
      register(this.server, this.env);
    }
  }
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);

    // Streamable HTTP transport (preferred by claude.ai custom connectors)
    if (url.pathname === "/mcp" || url.pathname.startsWith("/mcp/")) {
      return EquityIntelMCP.serve("/mcp").fetch(req, env, ctx);
    }

    // SSE transport (older clients)
    if (url.pathname === "/sse" || url.pathname.startsWith("/sse/")) {
      return EquityIntelMCP.serveSSE("/sse").fetch(req, env, ctx);
    }

    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response(
        JSON.stringify(
          {
            name: "equity-intel-mcp",
            version: "0.1.0",
            transports: { streamable_http: "/mcp", sse: "/sse" },
            tools: 10,
            repo: "https://github.com/YOUR_USERNAME/equity-intel-mcp",
          },
          null,
          2,
        ),
        { headers: { "content-type": "application/json" } },
      );
    }

    return new Response("Not found", { status: 404 });
  },
};
