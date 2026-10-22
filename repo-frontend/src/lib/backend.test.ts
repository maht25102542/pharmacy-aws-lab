import { afterEach, describe, expect, it } from "vitest";
import { authHeaders, backendUrl, cookieOptions } from "./backend";

afterEach(() => { delete process.env.BACKEND_URL; delete process.env.COOKIE_SECURE; });

describe("backendUrl", () => {
  it("defaults to localhost", () => expect(backendUrl("/api/x")).toBe("http://localhost:8000/api/x"));
  it("uses BACKEND_URL and trims trailing slash", () => {
    process.env.BACKEND_URL = "http://backend:8000/";
    expect(backendUrl("/api/x")).toBe("http://backend:8000/api/x");
  });
});

describe("authHeaders", () => {
  it("adds Token header only when logged in", () => {
    expect(authHeaders("abc")).toEqual({ Authorization: "Token abc" });
    expect(authHeaders(undefined, { a: "b" })).toEqual({ a: "b" });
  });
});

describe("cookieOptions", () => {
  it("is httpOnly and not secure by default", () => expect(cookieOptions()).toMatchObject({ httpOnly: true, secure: false }));
  it("secure when COOKIE_SECURE=1", () => {
    process.env.COOKIE_SECURE = "1";
    expect(cookieOptions().secure).toBe(true);
  });
});
