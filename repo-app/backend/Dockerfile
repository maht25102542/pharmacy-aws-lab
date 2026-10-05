FROM python:3.12-slim

ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py .

USER nobody
EXPOSE 8000
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "2", "app:app"]
