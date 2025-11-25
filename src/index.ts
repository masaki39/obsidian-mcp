#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

type FetchLike = typeof fetch;

export interface ActiveFileResult {
  path: string;
  content: string;
}

const DEFAULT_BASE_URL = "http://127.0.0.1:27123";
const ACTIVE_PATH = "/active/";

class ObsidianRestClient {
  private readonly baseUrl: string;
  private readonly token?: string;
  private readonly fetchImpl: FetchLike;

  constructor(options: { token?: string; fetchImpl?: FetchLike } = {}) {
    const { token, fetchImpl = fetch } = options;
    this.baseUrl = DEFAULT_BASE_URL;
    this.token = token;
    this.fetchImpl = fetchImpl;
  }

  async getActiveFile(): Promise<ActiveFileResult> {
    const headers: Record<string, string> = { Accept: "application/vnd.olrapi.note+json" };
    if (this.token && this.token.length > 0) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await this.fetchImpl(`${this.baseUrl}${ACTIVE_PATH}`, { headers });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Obsidian REST API request failed (${response.status} ${response.statusText}): ${body}`);
    }

    const json = await response.json().catch(() => null);
    const path = json && typeof json.path === "string" ? json.path : undefined;
    const content =
      json && typeof json.content === "string"
        ? json.content
        : json && typeof json.body === "string"
          ? json.body
          : undefined;

    if (!path || !content) {
      throw new Error("Active file path or content is missing in Obsidian REST API response.");
    }

    return { path, content };
  }
}

function getEnvToken(): string | undefined {
  return process.env.OBSIDIAN_API_KEY;
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
      const client = new ObsidianRestClient({ token: getEnvToken() });
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

export { ObsidianRestClient, DEFAULT_BASE_URL, runServer };
