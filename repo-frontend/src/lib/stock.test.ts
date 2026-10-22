import { describe, expect, it } from "vitest";
import { formatPrice, parseQty, stockStatus } from "./stock";

describe("stockStatus", () => {
  it("out when zero", () => expect(stockStatus({ stock: 0, reorder_level: 10 })).toBe("out"));
  it("low at or below reorder level", () => {
    expect(stockStatus({ stock: 10, reorder_level: 10 })).toBe("low");
    expect(stockStatus({ stock: 3, reorder_level: 10 })).toBe("low");
  });
  it("ok above reorder level", () => expect(stockStatus({ stock: 11, reorder_level: 10 })).toBe("ok"));
  it("zero stock is out even if reorder level is 0", () => expect(stockStatus({ stock: 0, reorder_level: 0 })).toBe("out"));
});

describe("parseQty", () => {
  it("applies the sign", () => {
    expect(parseQty("5", 1)).toBe(5);
    expect(parseQty(" 5 ", -1)).toBe(-5);
  });
  it.each(["", "0", "-3", "1.5", "abc", "1e3", "1000001"])("rejects %j", (v) => expect(parseQty(v, 1)).toBeNull());
});

describe("formatPrice", () => {
  it("formats baht", () => expect(formatPrice("1234.5")).toMatch(/1,234\.50/));
  it("handles garbage", () => expect(formatPrice("abc")).toBe("-"));
});
