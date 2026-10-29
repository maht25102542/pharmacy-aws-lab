// ไอคอนเส้นง่ายๆ (inline SVG) ไม่พึ่งไลบรารี
const P: Record<string, string> = {
  home: "M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10",
  pill: "M10.5 20.5a5 5 0 0 1-7-7l9-9a5 5 0 0 1 7 7zM8.5 8.5l7 7",
  history: "M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 7v5l3 2",
  users: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21c0-4 3-7 7-7s7 3 7 7M17 11a3 3 0 1 0 0-6M19 14c2 .7 3 3 3 6",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 4-7 8-7s8 3 8 7",
  api: "M8 6L3 12l5 6M16 6l5 6-5 6M14 4l-4 16",
  alert: "M12 3l10 18H2zM12 10v5M12 18v.1",
  box: "M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10",
  coin: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v10M9 9.5c0-1 1-1.5 3-1.5s3 .7 3 1.7-1 1.5-3 1.8-3 .8-3 1.8 1 1.7 3 1.7 3-.5 3-1.5",
  out: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 8l8 8",
  logout: "M10 4H5v16h5M15 8l4 4-4 4M9 12h10",
  plus: "M12 5v14M5 12h14",
};
export function Icon({ name }: { name: keyof typeof P | string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[name] ?? P.box} />
    </svg>
  );
}

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <span className="logo" style={{ width: size, height: size }}>
      <svg viewBox="0 0 32 32" width={size * 0.62} height={size * 0.62} aria-hidden="true">
        <rect x="12" y="4" width="8" height="24" rx="3" fill="#0f8f82" />
        <rect x="4" y="12" width="24" height="8" rx="3" fill="#14b8a6" />
      </svg>
    </span>
  );
}
