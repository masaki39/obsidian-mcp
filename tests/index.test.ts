import { jest } from "@jest/globals";
import { ObsidianRestClient, DEFAULT_BASE_URL } from "../src/index.js";

describe("ObsidianRestClient", () => {
  const token = "test-token";

  it("returns active file content and path from Content-Location header", async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      new Response("# Title", {
        status: 200,
        headers: { "Content-Location": "/vault/note.md" },
      })
    );

    const client = new ObsidianRestClient({ token, fetchImpl: fetchMock });
    const result = await client.getActiveFile();

    expect(result).toEqual({ path: "/vault/note.md", content: "# Title" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(`${DEFAULT_BASE_URL}/active/`, expect.objectContaining({
      headers: expect.objectContaining({ Authorization: `Bearer ${token}`, Accept: "text/markdown,text/plain" }),
    }));
  });

  it("falls back to Content-Disposition filename when Content-Location is absent", async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      new Response("body", {
        status: 200,
        headers: { "Content-Disposition": 'attachment; filename="notes/test%20file.md"' },
      })
    );

    const client = new ObsidianRestClient({ fetchImpl: fetchMock });
    const result = await client.getActiveFile();

    expect(result).toEqual({ path: "notes/test file.md", content: "body" });
  });

  it("throws when the API omits the file path headers", async () => {
    const fetchMock = jest.fn().mockResolvedValue(new Response("no path", { status: 200 }));
    const client = new ObsidianRestClient({ token, fetchImpl: fetchMock });

    await expect(client.getActiveFile()).rejects.toThrow("Active file path is missing");
  });

  it("throws a helpful error when the API responds with an error", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(new Response("Not Authorized", { status: 401, statusText: "Unauthorized" }));

    const client = new ObsidianRestClient({ token, fetchImpl: fetchMock });

    await expect(client.getActiveFile()).rejects.toThrow(/401 Unauthorized/);
  });
});
