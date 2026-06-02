import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export interface Env {
  FINNHUB_API_KEY: string;
  USER_AGENT: string;
  MCP_OBJECT: DurableObjectNamespace;
}

export type ToolRegistrar = (server: McpServer, env: Env) => void;

export interface CallToolTextResult {
  [x: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export const ok = (data: unknown): CallToolTextResult => ({
  content: [{ type: "text", text: typeof data === "string" ? data : JSON.stringify(data, null, 2) }],
});

export const err = (message: string): CallToolTextResult => ({
  content: [{ type: "text", text: `ERROR: ${message}` }],
  isError: true,
});
