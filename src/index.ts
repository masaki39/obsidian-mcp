#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

type FetchLike = typeof fetch;

export interface ActiveFileResult {
  path: string;
  content: string;
}

const DEFAULT_BASE_URL = "https://127.0.0.1:27124";
const DEFAULT_TIMEOUT_MS = 8000;
const ACTIVE_PATH = "/active/";

class ObsidianRestClient {
  private readonly baseUrl: string;
  private readonly token?: string;
  private readonly fetchImpl: FetchLike;
  private readonly timeoutMs: number;

  constructor(options: { baseUrl?: string; token?: string; fetchImpl?: FetchLike; timeoutMs?: number }) {
    const { baseUrl = DEFAULT_BASE_URL, token, fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.token = token;
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
  }

  async getActiveFile(): Promise<ActiveFileResult> {
    const response = await this.request(ACTIVE_PATH, { headers: { Accept: "text/markdown,text/plain" } });
    const content = await response.text();
    const path = this.extractPathFromHeaders(response.headers);
    if (!path || typeof path !== "string") {
      throw new Error("Active file path is missing in Obsidian REST API response headers.");
    }
    return { path, content };
  }

  private extractPathFromHeaders(headers: Headers): string | undefined {
    const location = headers.get("Content-Location");
    if (location) {
      return decodeURIComponent(location);
    }
    const disposition = headers.get("Content-Disposition");
    if (disposition) {
      const match = disposition.match(/filename="?([^";]+)"?/i);
      if (match?.[1]) {
        return decodeURIComponent(match[1]);
      }
    }
    return undefined;
  }

  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const headers =
      this.token && this.token.length > 0
        ? { Authorization: `Bearer ${this.token}`, ...(init.headers ?? {}) }
        : { ...(init.headers ?? {}) };

    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Obsidian REST API request failed (${response.status} ${response.statusText}): ${body}`);
    }

    return response;
  }
}

function getEnvToken(): string | undefined {
  return process.env.OBSIDIAN_REST_API_TOKEN ?? process.env.OBSIDIAN_LOCAL_REST_API_KEY;
}

async function runServer() {
  const server = new McpServer({
    name: "obsidian-mcp",
    version: "1.0.0",
  });

  server.registerTool(
    "get_active_file",
    {
      description: "Return the absolute path and content of the active Obsidian file via Local REST API.",
      inputSchema: z.object({}).describe("No input required."),
    },
    async () => {
      const token = getEnvToken();
      const client = new ObsidianRestClient({
        baseUrl: process.env.OBSIDIAN_REST_API_BASE_URL,
        token,
      });
      const activeFile = await client.getActiveFile();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(activeFile, null, 2),
          },
        ],
      };
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runServer().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { ObsidianRestClient, DEFAULT_BASE_URL, DEFAULT_TIMEOUT_MS, runServer };
