import { describe, expect, it } from "vitest";
import { loginUrl } from "./loginUrl";

const hdr = (o: Record<string, string>) => ({ get: (k: string) => o[k] ?? null });

describe("loginUrl", () => {
  it("uses the Host the user typed", () => expect(loginUrl(hdr({ host: "alb.example.com:8080" }))).toBe("http://alb.example.com:8080/login"));
  it("prefers forwarded headers", () => expect(loginUrl(hdr({ host: "0.0.0.0:3000", "x-forwarded-host": "shop.example.com", "x-forwarded-proto": "https" }))).toBe("https://shop.example.com/login"));
});
