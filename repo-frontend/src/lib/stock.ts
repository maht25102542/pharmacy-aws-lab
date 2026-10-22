export type Medicine = {
  id: number;
  sku: string;
  name: string;
  category: number | null;
  category_name: string | null;
  unit: string;
  price: string;
  stock: number;
  reorder_level: number;
  low_stock: boolean;
  is_active: boolean;
};

export type Page<T> = { count: number; next: string | null; previous: string | null; results: T[] };
export type Status = "out" | "low" | "ok";

// สถานะสต็อก: หมด / ใกล้หมด (ต่ำกว่าหรือเท่าจุดสั่งซื้อ) / ปกติ
export function stockStatus(m: { stock: number; reorder_level: number }): Status {
  if (m.stock === 0) return "out";
  return m.stock <= m.reorder_level ? "low" : "ok";
}

export function formatPrice(v: string | number): string {
  const n = Number(v);
  return Number.isFinite(n) ? new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(n) : "-";
}

// แปลงค่าที่พิมพ์ในช่องจำนวน: ต้องเป็นจำนวนเต็มบวก (ทิศทาง +/- มาจากปุ่มที่กด) ไม่ถูกต้อง = null
export function parseQty(input: string, sign: 1 | -1): number | null {
  if (!/^\d+$/.test(input.trim())) return null;
  const n = Number(input);
  return n > 0 && n <= 1_000_000 ? n * sign : null;
}
