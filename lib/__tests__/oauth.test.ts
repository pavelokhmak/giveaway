import { describe, it, expect, afterEach } from "vitest";
import { getAuthorizeUrl } from "@/lib/instagram/oauth";

describe("getAuthorizeUrl", () => {
  const originalAppId = process.env.INSTAGRAM_APP_ID;

  afterEach(() => {
    process.env.INSTAGRAM_APP_ID = originalAppId;
  });

  it("uses the built-in fallback App ID when the env var is unset", () => {
    delete process.env.INSTAGRAM_APP_ID;
    const url = getAuthorizeUrl("http://localhost:3000/api/auth/instagram/callback", "state123");
    expect(url).toContain("client_id=1571471064112664");
  });

  it("uses the env var's App ID when it's set", () => {
    process.env.INSTAGRAM_APP_ID = "999999";
    const url = getAuthorizeUrl("http://localhost:3000/api/auth/instagram/callback", "state123");
    expect(url).toContain("client_id=999999");
  });
});
