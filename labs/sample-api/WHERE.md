# labs/sample-api/ — แอปจิ๋วให้ lab 02 / 04 / 05 / 07 ใช้ทดสอบ

ตอบ 200 ที่ `/healthz` port 8000 (ตรงกับที่ lab ตั้งไว้) · ไม่ต่อ DB · ใช้แทนแอปจริงเฉพาะตอนทดสอบ infra

```bash
docker build -t sample-api labs/sample-api
docker run --rm -p 8000:8000 -e APP_ENV=dev sample-api   # แล้ว curl localhost:8000/healthz
```
