import { jest } from "@jest/globals";
import { ObsidianRestClient, DEFAULT_BASE_URL } from "../src/index.js";

describe("ObsidianRestClient", () => {
  const token = "test-token";

  it("returns active file content and path from JSON", async () => {
    const body = JSON.stringify({ path: "/vault/note.md", content: "# Title" });
    const fetchMock = jest.fn().mockResolvedValue(
      new Response(body, {
        status: 200,
        headers: { "Content-Type": "application/vnd.olrapi.note+json" },
      })
    );

    const client = new ObsidianRestClient({ token, fetchImpl: fetchMock });
    const result = await client.getActiveFile();

    expect(result).toEqual({ path: "/vault/note.md", content: "# Title" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      `${DEFAULT_BASE_URL}/active/`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.olrapi.note+json",
        }),
      })
    );
  });

  it("throws a helpful error when the API responds with an error", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(new Response("Not Authorized", { status: 401, statusText: "Unauthorized" }));

    const client = new ObsidianRestClient({ token, fetchImpl: fetchMock });

    await expect(client.getActiveFile()).rejects.toThrow(/401 Unauthorized/);
  });

  it("throws when the JSON omits path or content", async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({ content: "body only" }), {
        status: 200,
        headers: { "Content-Type": "application/vnd.olrapi.note+json" },
      })
    );
    const client = new ObsidianRestClient({ fetchImpl: fetchMock });

    await expect(client.getActiveFile()).rejects.toThrow("Active file path or content is missing");
  });
});
