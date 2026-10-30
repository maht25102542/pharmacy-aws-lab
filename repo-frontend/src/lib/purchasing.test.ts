import { describe, expect, it } from "vitest";
import { type DraftLine, draftTotal, type PO, poActions, remaining, validateDraft } from "./purchasing";

const line = (qty: string, cost: string): DraftLine => ({ medicine: 1, sku: "A", name: "Para", qty, cost });

describe("draft", () => {
  it("totals in satang and ignores invalid fields", () => {
    expect(draftTotal([line("3", "0.10"), line("2", "19.99")])).toBe(40.28);
    expect(draftTotal([line("x", "5"), line("2", "abc")])).toBe(0);
  });
  it("validates", () => {
    expect(validateDraft("", [line("1", "1")])).toMatch(/ผู้จัดจำหน่าย/);
    expect(validateDraft("1", [])).toMatch(/อย่างน้อย 1/);
    expect(validateDraft("1", [line("0", "1")])).toMatch(/จำนวน/);
    expect(validateDraft("1", [line("1", "1.234")])).toMatch(/ต้นทุน/);
    expect(validateDraft("1", [line("5", "20.50")])).toBe("");
  });
});

describe("po actions", () => {
  const mk = (status: PO["status"], got = 0): Pick<PO, "status" | "items"> => ({ status, items: [{ id: 1, medicine: 1, sku: "A", name: "n", qty_ordered: 10, qty_received: got, unit_cost: "1" }] });
  it("draft can order/cancel/remove", () => expect(poActions(mk("draft"))).toEqual({ order: true, receive: false, cancel: true, remove: true }));
  it("ordered can receive and cancel until something is received", () => {
    expect(poActions(mk("ordered"))).toEqual({ order: false, receive: true, cancel: true, remove: false });
    expect(poActions(mk("ordered", 1)).cancel).toBe(false);
  });
  it("partial can only receive", () => expect(poActions(mk("partial", 4))).toEqual({ order: false, receive: true, cancel: false, remove: false }));
  it("closed has nothing", () => { expect(poActions(mk("received", 10))).toEqual({ order: false, receive: false, cancel: false, remove: false }); expect(poActions(mk("cancelled"))).toEqual({ order: false, receive: false, cancel: false, remove: false }); });
  it("remaining never negative", () => expect(remaining({ qty_ordered: 5, qty_received: 9 })).toBe(0));
});
