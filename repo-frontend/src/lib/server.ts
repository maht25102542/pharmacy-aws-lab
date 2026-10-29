// ตัวช่วยฝั่ง server (Server Component): เรียก backend ด้วย token จาก cookie · 401 = กลับไปหน้า login
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authHeaders, backendUrl, TOKEN_COOKIE } from "./backend";

export async function serverGet<T>(path: string): Promise<T | null> {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  let r: Response;
  try {
    r = await fetch(backendUrl(path), { headers: authHeaders(token), cache: "no-store", signal: AbortSignal.timeout(8_000) });
  } catch {
    return null;
  }
  if (r.status === 401) redirect("/login");
  return r.ok ? ((await r.json()) as T) : null;
}
