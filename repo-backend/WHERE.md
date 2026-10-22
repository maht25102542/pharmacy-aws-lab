# โฟลเดอร์นี้อยู่ที่ไหนในระบบจริง

ทั้งโฟลเดอร์นี้คือ **GitHub repo ชื่อ `pharmacy-backend`** (Python / Django REST Framework) ไม่ได้อยู่บน VM ไหนเลย (frontend อยู่อีก repo: `pharmacy-frontend`)

| ไฟล์ | ใครใช้ | ใช้เมื่อไหร่ |
|---|---|---|
| `Jenkinsfile` | Jenkins (VM `pharmacy-jenkins`) job ชื่อ `pharmacy-backend` | ทุกครั้งที่กด build Jenkins ดึงไฟล์นี้จาก GitHub มาอ่านว่าต้องทำอะไร |
| `sonar-project.properties` | ขั้น SonarQube ใน pipeline | บอกว่าให้ตรวจอะไร (โปรเจกต์ `pharmacy-backend`) |
| `Dockerfile`, `manage.py`, `config/`, `stock/`, `requirements/base.txt`, `requirements/prod.txt` | ขั้น docker build ใน pipeline | ถูก build เป็น image `pharmacy/backend` แล้ว push ขึ้น ECR |
| `stock/tests/`, `conftest.py`, `pytest.ini`, `requirements/dev.txt` | ขั้น Test ใน pipeline และเครื่องคุณ | เทสต์ API ด้วย sqlite ไม่ต้องมี DB: `pip install -r requirements/dev.txt && pytest` ไม่ถูกใส่ใน image (กันด้วย `.dockerignore`) |
| `stock/migrations/` | Job `backend-migrate` ใน deployment.yaml | ก่อนปล่อยทุกครั้ง ArgoCD รัน `manage.py migrate` ให้ตารางตรงกับโค้ดเวอร์ชันนั้น |
| `docker-compose.yml` | คุณ (เครื่องนักพัฒนา) | `docker compose up --build` ได้ backend + MariaDB ในเครื่อง ไม่ได้ขึ้น server |

ตัวแปรที่แอปอ่านตอนรัน (ใน Kubernetes มาจาก `deployment.yaml` และ Secret `db-credentials` / `app-secrets`): `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DJANGO_ADMIN_PASSWORD`, `LOG_LEVEL`

ตัวโค้ดไม่เคยถูกวางบนเครื่อง Kubernetes โดยตรง สิ่งที่ไปถึงเครื่องคือ image ที่ build แล้ว
