"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { dayLabel, type ExpiryRow, expiryState, type SalesReport } from "@/lib/sales";
import { formatPrice } from "@/lib/stock";
import type { Me } from "@/lib/users";

// รายงาน: ยอดขายรายวัน (เภสัชกร/ผู้ดูแล) + ยาใกล้หมดอายุ (ทุกคน)
export default function ReportsPanel() {
  const [me, setMe] = useState<Me | null>(null);
  const [days, setDays] = useState(14);
  const [rep, setRep] = useState<SalesReport | null>(null);
  const [exp, setExp] = useState<{ count: number; results: ExpiryRow[] } | null>(null);
  const [expDays, setExpDays] = useState(90);
  const [error, setError] = useState("");

  useEffect(() => { api<Me>("/auth/me").then(setMe).catch(() => undefined); }, []);
  useEffect(() => { if (me?.is_staff) api<SalesReport>(`/reports/sales?days=${days}`).then(setRep).catch((e) => setError(e.message)); }, [me, days]);
  useEffect(() => { api<{ count: number; results: ExpiryRow[] }>(`/reports/expiry?days=${expDays}`).then(setExp).catch((e) => setError(e.message)); }, [expDays]);

  const max = Math.max(1, ...(rep?.days.map((d) => Number(d.total)) ?? [1]));
  return (
    <>
      {error && <div className="notice bad">{error}</div>}
      <div className="card">
        <div className="toolbar"><h2 style={{ margin: 0 }}>ยอดขายรายวัน</h2><span className="sp" /><select value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="ช่วงเวลา"><option value={7}>7 วัน</option><option value={14}>14 วัน</option><option value={30}>30 วัน</option></select></div>
        {!me?.is_staff ? <div className="empty">รายงานยอดขายดูได้เฉพาะเภสัชกรและผู้ดูแลระบบ</div> : !rep ? <div className="empty">กำลังโหลด…</div> : (
          <>
            <div className="cards" style={{ marginBottom: 12 }}>
              <div className="card stat"><div><div className="n">{formatPrice(rep.totals.total)}</div><div className="l">ยอดขายรวม {days} วัน</div></div></div>
              <div className="card stat"><div><div className="n">{rep.totals.count}</div><div className="l">จำนวนบิล</div></div></div>
              <div className="card stat"><div><div className="n">{formatPrice(rep.totals.average)}</div><div className="l">เฉลี่ยต่อบิล</div></div></div>
            </div>
            <div className="chart" role="img" aria-label="กราฟยอดขายรายวัน">
              {rep.days.map((d) => (
                <div key={d.date} className="col" title={`${d.date}: ${formatPrice(d.total)} (${d.count} บิล)`}>
                  <div className="barwrap"><i style={{ height: `${(Number(d.total) / max) * 100}%` }} /></div>
                  <span>{dayLabel(d.date)}</span>
                </div>
              ))}
            </div>
            <h2 style={{ marginTop: 20 }}>ยาขายดี (จำนวนชิ้น)</h2>
            <table><thead><tr><th>ยา</th><th className="num">ขายได้</th><th className="num">รายได้</th></tr></thead>
              <tbody>{rep.top.map((t) => <tr key={t.medicine}><td>{t.name} <span className="muted">({t.sku})</span></td><td className="num">{t.qty}</td><td className="num">{formatPrice(t.revenue)}</td></tr>)}{rep.top.length === 0 && <tr><td colSpan={3} className="empty">ยังไม่มียอดขายในช่วงนี้</td></tr>}</tbody></table>
          </>
        )}
      </div>
      <div className="card flush">
        <div className="toolbar" style={{ padding: "16px 16px 0" }}><h2 style={{ margin: 0 }}>ยาใกล้หมดอายุ / หมดอายุแล้ว</h2><span className="sp" /><select value={expDays} onChange={(e) => setExpDays(Number(e.target.value))} aria-label="หมดอายุภายใน"><option value={30}>ภายใน 30 วัน</option><option value={90}>ภายใน 90 วัน</option><option value={180}>ภายใน 180 วัน</option></select></div>
        <table>
          <thead><tr><th>ยา</th><th>ล็อต</th><th>วันหมดอายุ</th><th className="num">คงเหลือ</th><th>สถานะ</th></tr></thead>
          <tbody>
            {exp?.results.map((r) => { const st = expiryState(r.days_left); return (
              <tr key={r.id}><td>{r.medicine_name} <span className="muted">({r.medicine_sku})</span></td><td>{r.lot_no}</td><td>{r.expiry_date}</td><td className="num">{r.qty_remaining}</td>
                <td><span className={`badge ${st === "expired" ? "out" : st === "soon" ? "low" : "ok"}`}>{st === "expired" ? `หมดอายุแล้ว ${-r.days_left} วัน` : `อีก ${r.days_left} วัน`}</span></td></tr>
            ); })}
            {exp && exp.results.length === 0 && <tr><td colSpan={5} className="empty">ไม่มีล็อตที่ใกล้หมดอายุ 🎉</td></tr>}
          </tbody>
        </table>
        {exp && exp.results.some((r) => r.expired) && <div className="notice bad" style={{ margin: 16 }}>มีล็อตหมดอายุแล้ว: ขายไม่ได้ · ไปที่ สต็อกยา → จ่ายออก → เหตุผล &quot;หมดอายุ/ทิ้ง&quot; เพื่อตัดออกจากสต็อก</div>}
      </div>
    </>
  );
}
