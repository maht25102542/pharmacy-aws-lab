// ชนิดข้อมูล + ตัวช่วยของระบบผู้ใช้ (ตรงกับ /api/users ของ backend)
export type Role = "admin" | "pharmacist" | "clerk";

export type User = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: Role;
  is_active: boolean;
  last_login: string | null;
  date_joined: string;
};

export type Me = { id: number; username: string; full_name: string; first_name: string; last_name: string; email: string; role: Role; is_staff: boolean };

export const ROLE_LABEL: Record<Role, string> = { admin: "ผู้ดูแลระบบ", pharmacist: "เภสัชกร", clerk: "พนักงาน" };
export const ROLE_HINT: Record<Role, string> = {
  admin: "จัดการผู้ใช้ได้ + ทำได้ทุกอย่างของเภสัชกร",
  pharmacist: "แก้ราคา ลบยา จัดการหมวดหมู่ + งานของพนักงาน",
  clerk: "ดูสต็อก รับเข้า/จ่ายออก",
};

// ชื่อที่แสดง: ชื่อ-นามสกุล ถ้าไม่มีใช้ username
export function displayName(u: { username: string; first_name?: string; last_name?: string }): string {
  return [u.first_name, u.last_name].filter(Boolean).join(" ").trim() || u.username;
}

// ตัวอักษรในวงกลมโปรไฟล์
export function initials(u: { username: string; first_name?: string; last_name?: string }): string {
  return (displayName(u).trim()[0] ?? "?").toUpperCase();
}

// เช็กรหัสผ่านฝั่งหน้าเว็บให้ผู้ใช้เห็นข้อบกพร่องทันที (ตัวตัดสินจริงคือ backend: ยาว ≥10, ไม่ใช่รหัสที่เดาง่าย)
export function passwordProblems(pw: string): string[] {
  const out: string[] = [];
  if (pw.length < 10) out.push("ต้องยาวอย่างน้อย 10 ตัวอักษร");
  if (pw.length > 0 && /^\d+$/.test(pw)) out.push("ห้ามเป็นตัวเลขล้วน");
  return out;
}

export function canManageUsers(me: { role: Role } | null): boolean {
  return me?.role === "admin";
}

export function canEditCatalog(me: { role: Role } | null): boolean {
  return me?.role === "admin" || me?.role === "pharmacist";
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "ยังไม่เคยเข้าใช้";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}
