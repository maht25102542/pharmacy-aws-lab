"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { Page } from "@/lib/stock";

type Movement = { id: number; medicine_sku: string; medicine_name: string; delta: number; stock_after: number; reason: string; note: string; created_by_name: string | null; created_at: string };
const REASONS: Record<string, string> = { receive: "รับเข้า", dispense: "จ่ายออก", adjust: "ปรับยอด", expired: "หมดอายุ/ทิ้ง" };

export default function MovementsPage() {
  const [data, setData] = useState<Page<Movement> | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  useEffect(() => { api<Page<Movement>>(`/movements?page=${page}`).then((d) => { setData(d); setError(""); }).catch((e) => setError(e.message)); }, [page]);
  const pages = data ? Math.max(1, Math.ceil(data.count / 10)) : 1;
  return (
    <>
      <h1>ประวัติการเคลื่อนไหวของสต็อก</h1>
      <div className="card">
        {error && <div className="err" role="alert">{error}</div>}
        <table>
          <thead><tr><th>เวลา</th><th>ยา</th><th>เหตุผล</th><th className="num">เปลี่ยน</th><th className="num">คงเหลือ</th><th>โดย</th><th>หมายเหตุ</th></tr></thead>
          <tbody>
            {data?.results.map((m) => (
              <tr key={m.id}>
                <td className="muted">{new Date(m.created_at).toLocaleString("th-TH")}</td>
                <td>{m.medicine_name} <span className="muted">({m.medicine_sku})</span></td>
                <td>{REASONS[m.reason] ?? m.reason}</td>
                <td className="num" style={{ color: m.delta > 0 ? "var(--ok)" : "var(--out)" }}>{m.delta > 0 ? `+${m.delta}` : m.delta}</td>
                <td className="num">{m.stock_after}</td><td>{m.created_by_name ?? "-"}</td><td className="muted">{m.note}</td>
              </tr>
            ))}
            {data && data.results.length === 0 && <tr><td colSpan={7} className="muted">ยังไม่มีประวัติ</td></tr>}
          </tbody>
        </table>
        <div className="pager">
          <span className="muted">{data ? `${data.count} รายการ · หน้า ${page}/${pages}` : ""}</span>
          <button className="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>ก่อนหน้า</button>
          <button className="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>ถัดไป</button>
        </div>
      </div>
    </>
  );
}
