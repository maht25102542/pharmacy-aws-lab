import { describe, expect, it } from "vitest";
import { canEditCatalog, canManageUsers, displayName, formatDateTime, initials, passwordProblems, ROLE_LABEL } from "./users";

describe("displayName / initials", () => {
  it("uses first + last name when present", () => expect(displayName({ username: "u1", first_name: "สมศรี", last_name: "ใจดี" })).toBe("สมศรี ใจดี"));
  it("falls back to username", () => expect(displayName({ username: "boss", first_name: "", last_name: "" })).toBe("boss"));
  it("initial is upper-cased first character", () => expect(initials({ username: "boss" })).toBe("B"));
  it("initial works with Thai", () => expect(initials({ username: "x", first_name: "สมศรี" })).toBe("ส"));
});

describe("passwordProblems", () => {
  it("flags short passwords", () => expect(passwordProblems("abc")).toContain("ต้องยาวอย่างน้อย 10 ตัวอักษร"));
  it("flags numeric-only", () => expect(passwordProblems("1234567890")).toContain("ห้ามเป็นตัวเลขล้วน"));
  it("accepts a good one", () => expect(passwordProblems("Str0ng-Passw0rd!")).toEqual([]));
  it("empty input shows only the length rule", () => expect(passwordProblems("")).toEqual(["ต้องยาวอย่างน้อย 10 ตัวอักษร"]));
});

describe("role helpers", () => {
  it("only admin manages users", () => {
    expect(canManageUsers({ role: "admin" })).toBe(true);
    expect(canManageUsers({ role: "pharmacist" })).toBe(false);
    expect(canManageUsers(null)).toBe(false);
  });
  it("admin and pharmacist edit the catalog, clerk does not", () => {
    expect(canEditCatalog({ role: "admin" })).toBe(true);
    expect(canEditCatalog({ role: "pharmacist" })).toBe(true);
    expect(canEditCatalog({ role: "clerk" })).toBe(false);
  });
  it("has a Thai label for every role", () => expect(Object.values(ROLE_LABEL).every(Boolean)).toBe(true));
});

describe("formatDateTime", () => {
  it("shows a message when never logged in", () => expect(formatDateTime(null)).toBe("ยังไม่เคยเข้าใช้"));
  it("handles garbage", () => expect(formatDateTime("nope")).toBe("-"));
});
