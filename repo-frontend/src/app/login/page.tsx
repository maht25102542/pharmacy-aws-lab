"use client";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Logo } from "@/components/Icons";
import { errorText } from "@/lib/client";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: f.get("username"), password: f.get("password") }) });
    if (r.ok) { router.replace("/"); router.refresh(); return; }
    setError(r.status === 429 ? "ลองบ่อยเกินไป รอสักครู่แล้วลองใหม่" : r.status === 401 ? "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง (หรือบัญชีถูกปิดการใช้งาน)" : errorText(await r.json().catch(() => ({}))) || "เข้าสู่ระบบไม่สำเร็จ");
    setBusy(false);
  }

  return (
    <div className="loginwrap">
      <section className="loginhero">
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontWeight: 700, fontSize: "1.2rem" }}><Logo size={44} />Pharmacy Stock</div>
        <div>
          <h2>จัดการสต็อกยา ให้ร้านยาของคุณ<br />เรียบร้อยและตรวจสอบได้</h2>
          <p>รับเข้า จ่ายออก และติดตามยาใกล้หมดได้ในที่เดียว ทุกการเปลี่ยนแปลงบันทึกว่าใครทำ เมื่อไหร่</p>
          <ul><li>เตือนยาใกล้หมดตามจุดสั่งซื้อ</li><li>ประวัติการเคลื่อนไหวย้อนดูได้ทุกรายการ</li><li>สิทธิ์ผู้ใช้แยกตามบทบาท: ผู้ดูแล เภสัชกร พนักงาน</li></ul>
        </div>
        <svg className="pillart" viewBox="0 0 200 100" aria-hidden="true"><rect x="0" y="0" width="200" height="100" rx="50" fill="#fff" /><rect x="100" y="0" width="100" height="100" rx="50" fill="#e2f6f3" /></svg>
      </section>
      <section className="loginform">
        <div className="box">
          <h1>เข้าสู่ระบบ</h1>
          <p className="sub">ใช้บัญชีที่ผู้ดูแลระบบสร้างให้</p>
          <form className="form" onSubmit={submit}>
            <label>ชื่อผู้ใช้<input name="username" autoComplete="username" required autoFocus /></label>
            <label>รหัสผ่าน<input name="password" type="password" autoComplete="current-password" required /></label>
            {error && <div className="err" role="alert">{error}</div>}
            <button className="pri" disabled={busy}>{busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}</button>
          </form>
          <p className="apilink">นักพัฒนา: <a href="/api/docs" target="_blank" rel="noreferrer">เอกสาร API (Swagger)</a></p>
        </div>
      </section>
    </div>
  );
}
