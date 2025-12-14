# obsidian-mcp

![NPM Downloads](https://img.shields.io/npm/dt/%40masaki39%2Fobsidian-mcp)

Simple MCP server that provides the active Obsidian file (path and content) to your LLM via the Obsidian Local REST API.

## Prerequisites
- [Obsidian Local REST API plugin](https://github.com/coddingtonbear/obsidian-local-rest-api)
- [Node.js 20+](https://nodejs.org/)

## Configuration

- Install the community plugin [Obsidian Local REST API plugin](https://github.com/coddingtonbear/obsidian-local-rest-api) in Obsidian.
- Open the plugin settings, enable HTTP, and copy the API key.

## MCP client configuration
```json
{
  "mcpServers": {
    "obsidian-mcp": {
      "command": "npx",
      "args": ["-y", "@masaki39/obsidian-mcp@latest"],
      "env": {
        "OBSIDIAN_API_KEY": "your_api_key_here",
        "OBSIDIAN_VAULT_PATH": "/absolute/path/to/your/vault"
      }
    }
  }
}
```
`OBSIDIAN_VAULT_PATH` is optional; omit it if you prefer the relative paths returned by the plugin.
