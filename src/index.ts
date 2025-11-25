#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import path from "path";

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
  private readonly vaultPath?: string;
  private readonly fetchImpl: FetchLike;

  constructor(options: { token?: string; vaultPath?: string; fetchImpl?: FetchLike } = {}) {
    const { token, vaultPath, fetchImpl = fetch } = options;
    this.baseUrl = DEFAULT_BASE_URL;
    this.token = token;
    this.vaultPath = vaultPath;
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

    return { path: this.resolvePath(path), content };
  }

  private resolvePath(filePath: string): string {
    if (path.isAbsolute(filePath) || !this.vaultPath) {
      return filePath;
    }
    return path.resolve(this.vaultPath, filePath);
  }
}

function getEnvToken(): string | undefined {
  return process.env.OBSIDIAN_API_KEY;
}

function getEnvVaultPath(): string | undefined {
  return process.env.OBSIDIAN_VAULT_PATH;
}

async function runServer() {
  const server = new McpServer({
    name: "obsidian-mcp",
    version: "1.0.0",
  });

  server.registerTool(
    "get_active_file",
    {
      description: "Return the path and content of the active Obsidian file via Local REST API.",
      inputSchema: z.object({}).describe("No input required."),
    },
    async () => {
      const client = new ObsidianRestClient({ token: getEnvToken(), vaultPath: getEnvVaultPath() });
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

runServer().catch((error) => {
  console.error(error);
  process.exit(1);
});

export { ObsidianRestClient, DEFAULT_BASE_URL, runServer };
