# ของจริงอยู่ที่: ราก repo pharmacy-frontend (Jenkins สั่ง docker build ที่โฟลเดอร์นี้)
# syntax=docker/dockerfile:1

# ── ด่านที่ 1: deps — ติดตั้งแพ็กเกจจาก package-lock.json เป๊ะๆ (npm ci)
#    COPY เฉพาะ package*.json ก่อน: แก้โค้ดแล้ว layer นี้ใช้ cache เดิม ไม่ต้องโหลดแพ็กเกจใหม่
FROM node:22.12.0-alpine3.21 AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ── ด่านที่ 2: build — คอมไพล์ Next.js เป็นโฟลเดอร์ standalone (ด่านนี้ไม่ถูกส่งขึ้น ECR)
FROM node:22.12.0-alpine3.21 AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules node_modules
COPY . .
RUN npm run build

# ── ด่านที่ 3: runtime — image ที่ส่งขึ้น ECR มีแต่ของที่ต้องใช้รัน (ไม่มี node_modules ทั้งก้อน ไม่มีซอร์สโค้ด)
FROM node:22.12.0-alpine3.21 AS runtime
ARG APP_VERSION=dev
LABEL org.opencontainers.image.title="pharmacy-frontend" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.description="Pharmacy stock web (Next.js)"

# NODE_ENV=production: ปิดโหมด dev · HOSTNAME=0.0.0.0: รับคำขอจากนอก container (ไม่ใช่แค่ localhost)
# APP_VERSION: แสดงท้ายหน้าเว็บ · BACKEND_URL: ที่อยู่ backend (ใน Kubernetes ตั้งใน deployment.yaml)
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    APP_VERSION=${APP_VERSION}

# ผู้ใช้ธรรมดา ไม่ใช่ root: ถ้าแอปโดนเจาะ ผู้โจมตีไม่ได้สิทธิ์ root ใน container
RUN addgroup -S -g 10001 app && adduser -S -u 10001 -G app -H -s /sbin/nologin app

WORKDIR /app
COPY --from=build --chown=10001:10001 /app/.next/standalone ./
COPY --from=build --chown=10001:10001 /app/.next/static ./.next/static
# โฟลเดอร์ cache ของ Next (ใน Kubernetes เมาท์ emptyDir ทับ เพราะ root filesystem อ่านอย่างเดียว)
RUN mkdir -p .next/cache && chown 10001:10001 .next/cache

USER 10001
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:3000/healthz > /dev/null || exit 1

CMD ["node", "server.js"]
