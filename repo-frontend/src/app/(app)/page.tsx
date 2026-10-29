import Link from "next/link";
import { Icon } from "@/components/Icons";
import { serverGet } from "@/lib/server";
import { formatPrice, type Medicine, type Page, stockStatus } from "@/lib/stock";

type Summary = { medicines: number; low_stock: number; out_of_stock: number; stock_value: string; served_by: string };
type Movement = { id: number; medicine_name: string; delta: number; stock_after: number; reason: string; created_by_name: string | null; created_at: string };
const REASONS: Record<string, string> = { receive: "รับเข้า", dispense: "จ่ายออก", adjust: "ปรับยอด", expired: "หมดอายุ/ทิ้ง" };

// หน้าภาพรวม (Server Component): ดึงตัวเลข ยาที่ต้องสั่งเพิ่ม และความเคลื่อนไหวล่าสุดจาก backend ตอน render
export default async function Home() {
  const [s, low, mv] = await Promise.all([
    serverGet<Summary>("/api/summary"),
    serverGet<Page<Medicine>>("/api/medicines?low_stock=1"),
    serverGet<Page<Movement>>("/api/movements"),
  ]);
  return (
    <>
      <div className="pagehead"><div><h1>ภาพรวมร้านยา</h1><p className="sub" style={{ margin: 0 }}>สถานะสต็อกวันนี้ และสิ่งที่ต้องจัดการ</p></div><span className="sp" /><Link href="/medicines" className="badge ok" style={{ textDecoration: "none" }}>ไปที่สต็อกยา →</Link></div>
      {s ? (
        <div className="cards">
          <div className="card stat"><span className="ic"><Icon name="box" /></span><div><div className="n">{s.medicines}</div><div className="l">รายการยาที่ใช้งาน</div></div></div>
          <div className="card stat warn"><span className="ic"><Icon name="alert" /></span><div><div className="n">{s.low_stock}</div><div className="l">ใกล้หมด / ต้องสั่งเพิ่ม</div></div></div>
          <div className="card stat bad"><span className="ic"><Icon name="out" /></span><div><div className="n">{s.out_of_stock}</div><div className="l">หมดสต็อก</div></div></div>
          <div className="card stat val"><span className="ic"><Icon name="coin" /></span><div><div className="n">{formatPrice(s.stock_value)}</div><div className="l">มูลค่าสต็อกรวม</div></div></div>
        </div>
      ) : (
        <div className="notice bad">โหลดตัวเลขสรุปไม่ได้ (backend ไม่ตอบ) กรุณาลองรีเฟรช</div>
      )}
      <div className="two">
        <div className="card">
          <h2>ยาที่ต้องสั่งเพิ่ม</h2>
          {low && low.results.length > 0 ? (
            <ul className="mini">
              {low.results.slice(0, 6).map((m) => {
                const st = stockStatus(m);
                const pct = Math.min(100, Math.round((m.stock / Math.max(m.reorder_level * 2, 1)) * 100));
                return (
                  <li key={m.id}>
                    <div className="grow"><b>{m.name}</b><div className={`bar ${st}`}><i style={{ width: `${pct}%` }} /></div></div>
                    <div style={{ textAlign: "right" }}><b>{m.stock}</b> <span className="muted">/ จุดสั่งซื้อ {m.reorder_level}</span></div>
                    <span className={`badge ${st}`}>{st === "out" ? "หมด" : "ใกล้หมด"}</span>
                  </li>
                );
              })}
            </ul>
          ) : <div className="empty">{low ? "ไม่มียาที่ต้องสั่งเพิ่ม 🎉" : "โหลดไม่ได้"}</div>}
        </div>
        <div className="card">
          <h2>ความเคลื่อนไหวล่าสุด</h2>
          {mv && mv.results.length > 0 ? (
            <ul className="mini">
              {mv.results.slice(0, 6).map((m) => (
                <li key={m.id}>
                  <div className="grow"><b>{m.medicine_name}</b><span className="muted">{REASONS[m.reason] ?? m.reason} · {m.created_by_name ?? "-"} · {new Date(m.created_at).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}</span></div>
                  <b style={{ color: m.delta > 0 ? "var(--ok)" : "var(--out)" }}>{m.delta > 0 ? `+${m.delta}` : m.delta}</b>
                </li>
              ))}
            </ul>
          ) : <div className="empty">{mv ? "ยังไม่มีความเคลื่อนไหว" : "โหลดไม่ได้"}</div>}
          <div style={{ marginTop: 8 }}><Link href="/movements">ดูประวัติทั้งหมด →</Link></div>
        </div>
      </div>
      {s && <p className="muted" style={{ fontSize: ".8rem" }}>ตอบโดย backend pod: {s.served_by} (รีเฟรชหลายครั้งใน Kubernetes จะเห็นสลับระหว่าง replica)</p>}
    </>
  );
}
