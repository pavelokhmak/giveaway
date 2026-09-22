import { describe, it, expect } from "vitest";
import { parseInstagramUrl } from "@/lib/validations/instagram";

describe("parseInstagramUrl", () => {
  it("parses a standard post URL", () => {
    const result = parseInstagramUrl("https://instagram.com/p/ABC123/");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.shortcode).toBe("ABC123");
      expect(result.data.type).toBe("p");
    }
  });

  it("parses a www post URL", () => {
    const result = parseInstagramUrl("https://www.instagram.com/p/ABC123/");
    expect(result.success).toBe(true);
  });

  it("parses a reel URL", () => {
    const result = parseInstagramUrl("https://www.instagram.com/reel/XYZ789/");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("reel");
      expect(result.data.shortcode).toBe("XYZ789");
    }
  });

  it("parses without trailing slash", () => {
    const result = parseInstagramUrl("https://instagram.com/p/ABC123");
    expect(result.success).toBe(true);
  });

  it("parses with query params", () => {
    const result = parseInstagramUrl(
      "https://www.instagram.com/p/ABC123/?utm_source=ig_web_copy_link",
    );
    expect(result.success).toBe(true);
  });

  it("rejects an empty string", () => {
    const result = parseInstagramUrl("");
    expect(result.success).toBe(false);
  });

  it("rejects a non-Instagram URL", () => {
    const result = parseInstagramUrl("https://example.com/p/ABC123/");
    expect(result.success).toBe(false);
  });

  it("rejects an Instagram profile URL", () => {
    const result = parseInstagramUrl("https://instagram.com/someuser/");
    expect(result.success).toBe(false);
  });

  it("rejects garbage input", () => {
    const result = parseInstagramUrl("not a url at all");
    expect(result.success).toBe(false);
  });
});
