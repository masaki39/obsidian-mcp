# obsidian-mcp

MCP server that proxies the active Obsidian note (absolute path plus Markdown content) from the Obsidian Local REST API, exposing it as a single tool over stdio.

## Prerequisites
- Obsidian with the Local REST API plugin running and the `Active file` endpoint enabled.
- Node.js 20+ (for the built-in `fetch` API).
- An API token from the Obsidian plugin (bearer token).

## Install and build
```bash
npm install
npm run build
```
Optionally install globally so the `obsidian-mcp` bin is on your `PATH`:
```bash
npm install -g .
```

## Configuration
The server reads these environment variables:
- `OBSIDIAN_REST_API_BASE_URL` (optional): defaults to `https://127.0.0.1:27124`.
- `OBSIDIAN_REST_API_TOKEN` or `OBSIDIAN_LOCAL_REST_API_KEY`: bearer token for the Obsidian Local REST API plugin.

The server calls `/active/` and accepts either the `Content-Location` header or the `Content-Disposition` filename as the active file path.

## Running as an MCP server
After building, start the server:
```bash
node build/index.js
# or if installed globally:
obsidian-mcp
```

Wire it into your MCP client by pointing the server command to `obsidian-mcp` (or the built `node build/index.js` path). The server uses stdio transport and exposes one tool:
- `get_active_file`: returns JSON with `path` and `content` for the current Obsidian note.

## Development
- Run tests: `npm test` (Jest + ts-jest).
- Rebuild after changes: `npm run build`.

## Troubleshooting
- 401 errors usually mean the token is missing or invalid—confirm the environment variable matches the Obsidian plugin token.
- Timeouts default to 8 seconds; slow responses from the REST plugin will surface as fetch abort errors.
