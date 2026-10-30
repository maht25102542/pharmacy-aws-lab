import { describe, expect, it } from "vitest";
import { addToCart, changeDue, dayLabel, expiryState, parseMoney, setQty, totals, type CartLine } from "./sales";

const para = { id: 1, sku: "PCM500", name: "Paracetamol", unit: "box", price: 35, max: 3 };

describe("cart", () => {
  it("adds a line, then increases qty up to the stock limit", () => {
    let c: CartLine[] = addToCart([], para);
    c = addToCart(addToCart(addToCart(c, para), para), para);
    expect(c).toHaveLength(1);
    expect(c[0].qty).toBe(3); // max 3
  });
  it("does not add out-of-stock medicine", () => expect(addToCart([], { ...para, max: 0 })).toEqual([]));
  it("setQty removes below 1 and clamps to max", () => {
    const c = addToCart([], para);
    expect(setQty(c, 1, 99)[0].qty).toBe(3);
    expect(setQty(c, 1, 0)).toEqual([]);
    expect(setQty(c, 1, NaN)).toEqual([]);
  });
});

describe("money", () => {
  it("totals use integer satang and clamp discount", () => {
    const c: CartLine[] = [{ ...para, price: 0.1, qty: 3 }, { ...para, id: 2, price: 19.99, qty: 2 }];
    expect(totals(c, 0)).toEqual({ subtotal: 40.28, discount: 0, total: 40.28 });
    expect(totals(c, 1000).total).toBe(0);
    expect(totals(c, -5).discount).toBe(0);
  });
  it("change", () => expect(changeDue(105, 200)).toBe(95));
  it("parseMoney", () => {
    expect(parseMoney("1,250.50")).toBe(1250.5);
    expect(parseMoney("100")).toBe(100);
    for (const bad of ["", "-1", "abc", "1.234", "1e3"]) expect(parseMoney(bad)).toBeNaN();
  });
});

describe("expiry", () => {
  it("states", () => {
    expect(expiryState(-1)).toBe("expired");
    expect(expiryState(0)).toBe("soon");
    expect(expiryState(30)).toBe("soon");
    expect(expiryState(31)).toBe("ok");
  });
  it("dayLabel", () => expect(dayLabel("2026-10-05")).toBe("5/10"));
});
