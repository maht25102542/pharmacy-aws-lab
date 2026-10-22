import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import MedicineTable from "@/components/MedicineTable";
import { authHeaders, backendUrl, TOKEN_COOKIE } from "@/lib/backend";
import { formatPrice } from "@/lib/stock";

type Summary = { medicines: number; low_stock: number; out_of_stock: number; stock_value: string; served_by: string };

// หน้าหลักเป็น Server Component: ดึงตัวเลขสรุปจาก backend ตอน render (เบราว์เซอร์ไม่ต้องรอ fetch ครั้งที่สอง)
async function loadSummary(): Promise<Summary | null> {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  try {
    const r = await fetch(backendUrl("/api/summary"), { headers: authHeaders(token), cache: "no-store", signal: AbortSignal.timeout(8_000) });
    if (r.status === 401) redirect("/login");
    return r.ok ? await r.json() : null;
  } catch (e) {
    if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
    return null;
  }
}

export default async function Home() {
  const s = await loadSummary();
  return (
    <>
      <h1>สต็อกยา</h1>
      {s ? (
        <div className="cards">
          <div className="card stat"><div className="n">{s.medicines}</div><div className="l">รายการยาที่ใช้งาน</div></div>
          <div className="card stat warn"><div className="n">{s.low_stock}</div><div className="l">ใกล้หมด / ต้องสั่งเพิ่ม</div></div>
          <div className="card stat bad"><div className="n">{s.out_of_stock}</div><div className="l">หมดสต็อก</div></div>
          <div className="card stat"><div className="n">{formatPrice(s.stock_value)}</div><div className="l">มูลค่าสต็อกรวม</div></div>
        </div>
      ) : (
        <div className="card err">โหลดตัวเลขสรุปไม่ได้ (backend ไม่ตอบ) ตารางด้านล่างอาจใช้ไม่ได้ด้วย</div>
      )}
      {s && <p className="muted">ตอบโดย backend pod: {s.served_by} (รีเฟรชหลายครั้งจะเห็นสลับระหว่าง replica)</p>}
      <MedicineTable />
    </>
  );
}
