// ชนิดข้อมูล + ตัวช่วยของผู้จัดจำหน่าย/ใบสั่งซื้อ (ตรงกับ /api/suppliers, /api/purchase-orders)
export type Supplier = { id: number; name: string; contact_name: string; phone: string; email: string; address: string; is_active: boolean; open_orders: number };
export type POStatus = "draft" | "ordered" | "partial" | "received" | "cancelled";
export type POItem = { id: number; medicine: number; sku: string; name: string; qty_ordered: number; qty_received: number; unit_cost: string };
export type PO = { id: number; po_no: string; supplier: number; supplier_name: string; status: POStatus; expected_date: string | null; note: string; total: string; created_by_name: string | null; created_at: string; ordered_at: string | null; received_at: string | null; items: POItem[] };
export type Suggestion = { medicine: number; sku: string; name: string; stock: number; reorder_level: number; on_order: number; suggested_qty: number; last_cost: string };

export const PO_LABEL: Record<POStatus, string> = { draft: "ร่าง", ordered: "สั่งแล้ว", partial: "รับบางส่วน", received: "รับครบ", cancelled: "ยกเลิก" };
export const PO_BADGE: Record<POStatus, string> = { draft: "off", ordered: "pharmacist", partial: "low", received: "ok", cancelled: "out" };

export type DraftLine = { medicine: number; sku: string; name: string; qty: string; cost: string };

// ยอดรวมของร่างใบสั่งซื้อ (สตางค์) · ช่องที่ไม่ถูกต้องนับเป็น 0
export function draftTotal(lines: DraftLine[]): number {
  return lines.reduce((s, l) => {
    const q = /^\d+$/.test(l.qty) ? Number(l.qty) : 0;
    const c = /^\d+(\.\d{1,2})?$/.test(l.cost) ? Math.round(Number(l.cost) * 100) : 0;
    return s + q * c;
  }, 0) / 100;
}

// ตรวจร่างก่อนส่ง: คืนข้อความผิดพลาดหรือ "" ถ้าส่งได้
export function validateDraft(supplier: string, lines: DraftLine[]): string {
  if (!supplier) return "เลือกผู้จัดจำหน่ายก่อน";
  if (lines.length === 0) return "เพิ่มยาอย่างน้อย 1 รายการ";
  for (const l of lines) {
    if (!/^\d+$/.test(l.qty) || Number(l.qty) < 1) return `จำนวนของ ${l.name} ต้องเป็นเลขจำนวนเต็มมากกว่า 0`;
    if (!/^\d+(\.\d{1,2})?$/.test(l.cost)) return `ราคาต้นทุนของ ${l.name} ไม่ถูกต้อง`;
  }
  return "";
}

// ปุ่มที่ทำได้ตามสถานะ: สั่งซื้อ/ลบ = ร่าง · รับของ = สั่งแล้ว/รับบางส่วน · ยกเลิก = ร่าง/สั่งแล้วที่ยังไม่ได้รับ
export function poActions(po: Pick<PO, "status" | "items">): { order: boolean; receive: boolean; cancel: boolean; remove: boolean } {
  const got = po.items.some((i) => i.qty_received > 0);
  return { order: po.status === "draft", receive: po.status === "ordered" || po.status === "partial", cancel: po.status === "draft" || (po.status === "ordered" && !got), remove: po.status === "draft" };
}

export function remaining(i: Pick<POItem, "qty_ordered" | "qty_received">): number {
  return Math.max(0, i.qty_ordered - i.qty_received);
}
