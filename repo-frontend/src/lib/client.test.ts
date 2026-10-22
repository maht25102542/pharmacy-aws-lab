import { describe, expect, it } from "vitest";
import { errorText } from "./client";

describe("errorText", () => {
  it("reads detail", () => expect(errorText({ detail: "nope" })).toBe("nope"));
  it("joins field errors", () => expect(errorText({ sku: ["already exists"], price: ["bad", "worse"] })).toBe("sku: already exists · price: bad, worse"));
  it("empty for non-objects", () => expect(errorText(null)).toBe(""));
});
