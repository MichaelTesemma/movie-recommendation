import { describe, it, expect, vi } from "vitest";
import { posterUrl } from "../tmdb";

describe("posterUrl", () => {
  it("returns full URL for valid path with default size", () => {
    expect(posterUrl("/abc123.jpg")).toBe("https://image.tmdb.org/t/p/w342/abc123.jpg");
  });

  it("uses custom size", () => {
    expect(posterUrl("/abc.jpg", "original")).toBe("https://image.tmdb.org/t/p/original/abc.jpg");
  });

  it("returns null for null path", () => {
    expect(posterUrl(null)).toBeNull();
  });

  it("returns null for undefined path", () => {
    expect(posterUrl(undefined as unknown as string)).toBeNull();
  });
});
