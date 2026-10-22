FROM python:3.12-slim

ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py .

USER nobody
EXPOSE 8000
# ให้ docker รู้สถานะเอง (ใน Kubernetes ใช้ probe ของ Deployment แทน)
HEALTHCHECK --interval=30s --timeout=3s CMD python -c "import urllib.request as u; u.urlopen('http://127.0.0.1:8000/api/health', timeout=2)"
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "2", "app:app"]
