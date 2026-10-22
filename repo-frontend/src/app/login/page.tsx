"use client";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
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
    setError(r.status === 429 ? "ลองบ่อยเกินไป รอสักครู่แล้วลองใหม่" : errorText(await r.json().catch(() => ({}))) || "เข้าสู่ระบบไม่สำเร็จ");
    setBusy(false);
  }

  return (
    <main className="login">
      <h1>💊 Pharmacy Stock</h1>
      <form className="card form" onSubmit={submit}>
        <label>ชื่อผู้ใช้<input name="username" autoComplete="username" required autoFocus /></label>
        <label>รหัสผ่าน<input name="password" type="password" autoComplete="current-password" required /></label>
        {error && <div className="err" role="alert">{error}</div>}
        <button className="pri" disabled={busy}>{busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}</button>
      </form>
    </main>
  );
}
