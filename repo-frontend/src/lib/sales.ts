// ชนิดข้อมูล + ตัวช่วยของระบบขายหน้าร้าน/รายงาน (ตรงกับ /api/sales และ /api/reports ของ backend)
export type SaleItem = { id: number; medicine: number; sku: string; name: string; unit_price: string; qty: number; line_total: string };
export type Sale = {
  id: number; receipt_no: string; customer_name: string; payment: "cash" | "transfer" | "card";
  subtotal: string; discount: string; total: string; paid: string; change: string;
  status: "completed" | "void"; note: string; created_by_name: string | null; created_at: string;
  voided_by_name: string | null; voided_at: string | null; void_reason: string; items: SaleItem[];
};
export type DayRow = { date: string; count: number; total: string };
export type SalesReport = { days: DayRow[]; totals: { count: number; total: string; average: string }; top: { medicine: number; sku: string; name: string; qty: number; revenue: string }[] };
export type ExpiryRow = { id: number; medicine: number; medicine_sku: string; medicine_name: string; lot_no: string; expiry_date: string; qty_remaining: number; days_left: number; expired: boolean };

export const PAYMENT_LABEL: Record<Sale["payment"], string> = { cash: "เงินสด", transfer: "โอนเงิน", card: "บัตร" };

export type CartLine = { id: number; sku: string; name: string; unit: string; price: number; qty: number; max: number };

// เพิ่มยาลงตะกร้า: มีอยู่แล้วเพิ่มจำนวน (ไม่เกินที่ขายได้) · ไม่มีของ = ไม่เพิ่ม
export function addToCart(cart: CartLine[], item: Omit<CartLine, "qty">): CartLine[] {
  if (item.max <= 0) return cart;
  const i = cart.findIndex((l) => l.id === item.id);
  if (i < 0) return [...cart, { ...item, qty: 1 }];
  return cart.map((l, k) => (k === i ? { ...l, max: item.max, qty: Math.min(l.qty + 1, item.max) } : l));
}

export function setQty(cart: CartLine[], id: number, qty: number): CartLine[] {
  if (!Number.isFinite(qty) || qty < 1) return cart.filter((l) => l.id !== id);
  return cart.map((l) => (l.id === id ? { ...l, qty: Math.min(Math.floor(qty), l.max) } : l));
}

// คิดเงินเป็นสตางค์ (จำนวนเต็ม) กันเลขทศนิยมคลาดเคลื่อน
export function totals(cart: CartLine[], discount: number): { subtotal: number; discount: number; total: number } {
  const subtotal = cart.reduce((s, l) => s + Math.round(l.price * 100) * l.qty, 0) / 100;
  const d = Math.min(Math.max(Math.round((Number.isFinite(discount) ? discount : 0) * 100) / 100, 0), subtotal);
  return { subtotal, discount: d, total: Math.round((subtotal - d) * 100) / 100 };
}

export function changeDue(total: number, paid: number): number {
  return Math.round((paid - total) * 100) / 100;
}

// ช่องจำนวนเงิน: "1,250.50" / "100" ได้ · ติดลบหรือไม่ใช่ตัวเลข = NaN
export function parseMoney(input: string): number {
  const t = input.replace(/,/g, "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return NaN;
  return Number(t);
}

export type ExpiryState = "expired" | "soon" | "ok";
// หมดอายุแล้ว / ภายใน 30 วัน / ปกติ
export function expiryState(daysLeft: number): ExpiryState {
  return daysLeft < 0 ? "expired" : daysLeft <= 30 ? "soon" : "ok";
}

export function dayLabel(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${Number(d)}/${Number(m)}`;
}
