# ของจริงอยู่ที่: ราก repo pharmacy-backend (Jenkins สั่ง docker build ที่โฟลเดอร์นี้)
# syntax=docker/dockerfile:1

# ── ด่านที่ 1: build — ติดตั้ง compiler + header ของ MariaDB แล้ว "คอมไพล์" mysqlclient เป็นไฟล์ wheel
#    (ด่านนี้ไม่ถูกส่งขึ้น ECR: compiler และ header ทั้งหมดถูกทิ้งตรงนี้)
FROM python:3.12.7-slim-bookworm AS build
RUN apt-get update \
 && apt-get install -y --no-install-recommends build-essential pkg-config libmariadb-dev \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /build
COPY requirements/ requirements/
RUN pip wheel --no-cache-dir --wheel-dir /wheels -r requirements/prod.txt

# ── ด่านที่ 2: runtime — image ที่ส่งขึ้น ECR มีแต่ของที่ต้องใช้รัน (เล็กกว่า ช่องโหว่น้อยกว่า)
FROM python:3.12.7-slim-bookworm AS runtime
ARG APP_VERSION=dev
LABEL org.opencontainers.image.title="pharmacy-backend" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.description="Pharmacy stock API (Django REST + gunicorn)"

# PYTHONUNBUFFERED: log ออก stdout ทันที · PYTHONDONTWRITEBYTECODE: ไม่เขียนไฟล์ .pyc (รองรับ read-only filesystem)
ENV APP_VERSION=${APP_VERSION} \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# ไลบรารี MariaDB ฝั่ง client (ตัวที่ mysqlclient เรียกใช้ตอนรัน) + ผู้ใช้ธรรมดา ไม่ใช่ root
# ถ้าแอปโดนเจาะ ผู้โจมตีไม่ได้สิทธิ์ root ใน container
RUN apt-get update \
 && apt-get install -y --no-install-recommends libmariadb3 \
 && rm -rf /var/lib/apt/lists/* \
 && useradd --system --uid 10001 --no-create-home --shell /usr/sbin/nologin app

WORKDIR /app
COPY --from=build /wheels /wheels
COPY requirements/ requirements/
RUN pip install --no-cache-dir --no-index --find-links=/wheels -r requirements/prod.txt \
 && rm -rf /wheels requirements
COPY manage.py .
COPY config config
COPY stock stock

# รวมไฟล์ static ของ admin ไว้ตอน build: ตอนรันไม่ต้องเขียนไฟล์ (WhiteNoise เสิร์ฟจากโฟลเดอร์นี้)
RUN DJANGO_SECRET_KEY=build-only python manage.py collectstatic --noinput

USER 10001
EXPOSE 8000

# ให้ docker รู้สถานะเอง (ใน Kubernetes ใช้ probe ของ Deployment แทน)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD python -c "import urllib.request as u; u.urlopen('http://127.0.0.1:8000/api/health', timeout=2)"

# --worker-tmp-dir /dev/shm: gunicorn เขียนไฟล์ชั่วคราวใน RAM (ใช้ได้แม้ root filesystem เป็น read-only)
# --graceful-timeout: ตอน pod ถูกปิด รอให้คำขอที่ค้างอยู่เสร็จก่อน
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "2", "--threads", "2", \
     "--timeout", "30", "--graceful-timeout", "20", "--worker-tmp-dir", "/dev/shm", \
     "--access-logfile", "-", "--error-logfile", "-"]
