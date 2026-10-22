# โฟลเดอร์นี้อยู่ที่ไหนในระบบจริง

ทั้งโฟลเดอร์นี้คือ **GitHub repo ชื่อ `pharmacy-frontend`** (Next.js / React + TypeScript) ไม่ได้อยู่บน VM ไหนเลย (backend อยู่อีก repo: `pharmacy-backend`)

| ไฟล์ | ใครใช้ | ใช้เมื่อไหร่ |
|---|---|---|
| `Jenkinsfile` | Jenkins (VM `pharmacy-jenkins`) job ชื่อ `pharmacy-frontend` | ทุกครั้งที่กด build Jenkins ดึงไฟล์นี้จาก GitHub มาอ่านว่าต้องทำอะไร |
| `sonar-project.properties` | ขั้น SonarQube ใน pipeline | บอกว่าให้ตรวจอะไร (โปรเจกต์ `pharmacy-frontend`) |
| `Dockerfile`, `package.json`, `package-lock.json`, `next.config.mjs`, `src/` | ขั้น docker build ใน pipeline | ถูก build เป็น image `pharmacy/frontend` แล้ว push ขึ้น ECR |
| `src/**/*.test.ts`, `eslint.config.mjs`, `vitest.config.ts` | ขั้น Test ใน pipeline และเครื่องคุณ | `npm ci && npm run lint && npm run typecheck && npm test` ไม่ถูกใส่ใน image |
| `docker-compose.yml` | คุณ (เครื่องนักพัฒนา) | `docker compose up --build` เปิด http://localhost:3000 (ต้องรัน backend ไว้ก่อน) |

หน้าเว็บเรียก `/api/...` ที่โดเมนเดียวกัน แล้ว Next.js (`src/app/api/[...path]/route.ts`) ส่งต่อไป Service ชื่อ `backend` ใน Kubernetes พร้อมใส่ token จาก cookie ดังนั้น **ปล่อย backend ก่อน frontend** ในครั้งแรก

ตัวแปรที่แอปอ่านตอนรัน (มาจาก `deployment.yaml`): `BACKEND_URL`, `APP_VERSION`, `COOKIE_SECURE`
