// ของจริงอยู่ที่: ราก repo pharmacy-frontend
/** @type {import('next').NextConfig} */
const nextConfig = {
  // standalone: build แล้วได้โฟลเดอร์ที่มีเฉพาะไฟล์ที่ต้องใช้รัน (node server.js) ทำให้ image เล็ก
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    }];
  },
};
export default nextConfig;
