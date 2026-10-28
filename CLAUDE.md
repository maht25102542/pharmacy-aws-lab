# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A learning lab that simulates a production release flow on AWS using only VMs. Terraform creates machines, Ansible configures them, Jenkins builds/pushes images, ArgoCD deploys to k3s. README.md (Thai) has the full step-by-step; **the stack has never been run on AWS yet** (account suspended), so expect first-run errors. Files are only syntax-checked.

## Repo layout is a mock of several real places

This directory is not one deployable unit. Each top-level folder maps to a different location in the "real" system; every folder has a `WHERE.md` with the real path of each file, and every config file has a "ของจริงอยู่ที่" header comment. Keep both in sync when adding/moving files.

- `terraform/`, `ansible/`: run from the laptop.
- `terraform-managed/`: alternative to `terraform/` (+ most of `ansible/`) using EKS + RDS Multi-AZ + SSM instead of k3s + Galera + bastion. Same network/ALB/ECR design. `terraform validate` passes for both stacks; neither has been applied on AWS. Don't apply both in one account (names clash). The Console Lab tab "เทียบ VM กับ Managed" (`src/ui-managed.js`) reads these files from LABFILES, so renaming resources there means updating its `mgBlock(...)` calls. The simulator also runs `terraform-managed/` end to end (EKS/RDS/ASG/SG-rule providers in `src/mod/32-managed.js`, console pages in `src/ui-aws2.js` for the EKS / RDS / SSM top-bar services, `buildManaged()` scenarios, `checksManaged()`); each terraform dir has its own state (`tfUseDir`), so VM and managed stacks don't mix. `node test.js` applies both (59 and 57 resources).
- `vm-*/`: files that Ansible copies onto the VM of that name (`vm-jenkins`, `vm-sonarqube`, `vm-k8s`, `vm-db`; `vm-k8s` goes to both `pharmacy-k8s-1` and `pharmacy-dev`). Not runnable locally. `*.j2` files are Ansible templates.
- `tools/console-lab/` (Console Lab: AWS + Terraform + Ansible simulator; `node build.js` then `node test.js`): single-file browser simulator of the AWS console (not deployed anywhere, calls no AWS). `node tools/console-lab/test.js` checks its engine. Its `checks()`/`buildLab()` hardcode this lab's resource names, so renaming resources in `terraform/` means updating them.
- `labs/NN-*/`: standalone real-world use-case stacks (Terraform only, each its own state dir): `01-static-site` (S3 + CloudFront OAC + Route 53 + ACM, dev+prd via `for_each`). `02-ecs-fargate` (ECR + ALB + ECS Fargate + RDS Postgres; sim in `src/mod/38-ecs.js`, `41-ecs-lab.js`, `ui-aws4.js`). `03-serverless` (API Gateway HTTP API + Lambda + DynamoDB; sim in `src/mod/42-sls.js`, `43-sls-lab.js`, `ui-aws5.js`). `04-cicd` (CodePipeline + CodeBuild → ECR → ECS dev → approve → prd, runs on top of lab 02; sim in `src/mod/44-cicd.js`, `45-cicd-lab.js`, `ui-aws6.js`). `05-github-actions` (GitHub Actions + OIDC → ECR → ECS, dev auto / prd approval; sim in `src/mod/48-gha.js`, `49-gha-lab.js`, `ui-aws8.js`, GitHub Actions tab inside the Browser GitHub page `wbGhActions`). `06-single-vm` (single EC2 + Docker Compose + Caddy, user_data semantics in `src/mod/50-single.js`, `51-single-lab.js`, `ec2Web` in `70-web.js`). `07-app-runner` (App Runner + ECR access role; sim in `src/mod/52-apprunner.js`, `53-apprunner-lab.js`, console `src/ui-aws9.js`; overview page "เลือกแบบไหน" `PAGES["lab-ap"]` is there too, EKS+ArgoCD row points at the managed/main labs, not a separate lab). `08-ecs-express` (ECS Express Mode: ให้ image + 2 role ได้ ALB/HTTPS/URL, แทน App Runner ที่ปิดรับลูกค้าใหม่; sim in `src/mod/54-express.js`, `55-express-lab.js`, console `src/ui-aws10.js` ใต้ ECS › Express mode, Express service = ECS service ที่มี `express:true` + `S.exps`). All planned labs are done. Pending real-AWS verification: `labs/VERIFY.md`. First-run steps per lab: `labs/CHECKLIST.md`; `labs/sample-api/` is a tiny `/healthz` app used as the image for labs 02/04/05/07 (repo-backend has no `/healthz` and uses MariaDB, lab 02 uses Postgres). Simulator side per lab: engine/providers in `src/mod/3x-*.js`, console pages `src/ui-aws3.js`, use-case page (diagram/animation/tf↔console/errors) `src/ui-usecase.js` (add an object to `UC`), scenarios grouped via `SCEN_CATS`. Validate real Terraform with a downloaded `terraform` binary (`validate` + `fmt -check`).
- `repo-backend/` and `repo-frontend/`: become the GitHub repos `pharmacy-backend` (Django REST + gunicorn + mysqlclient, MariaDB) and `pharmacy-frontend` (Next.js 15 / React 19 / TypeScript, `output: standalone`). Separate repos, each with its own `Jenkinsfile`, Dockerfile, Sonar project, tags and Jenkins job; the Jenkinsfiles differ only by the `SERVICE` constant and the `Test` stage. The browser talks only to Next.js: `src/app/api/[...path]/route.ts` is a BFF proxy that adds the DRF token from an httpOnly cookie and forwards to `BACKEND_URL` (Service `backend:8000`, ClusterIP).
- `repo-manifests/`: becomes the GitHub repo `pharmacy-manifests`. Jenkins rewrites the `image:` line in `{dev,prd}/{frontend,backend}/deployment.yaml` via `sed`; ArgoCD apps defined in `argocd-apps/apps.yaml`. Don't change the `image:` line format without updating the Jenkinsfile's `Update manifest` stage.

- **Cost & bill management** (ต้องอธิบายในทุก lab): ข้อมูลชุดเดียวที่ `tools/console-lab/src/mod/61-cost-data.js` → การ์ด 💰 ในหน้า Use case จริง (`src/ui-cost.js`), หน้า Lab › ค่าใช้จ่าย & Bill (`lab-cost`), และ `COST.md` ของแต่ละ `labs/NN-*` + root (สร้างด้วย `node tools/console-lab/gen-cost-md.js`). อัตราตรวจกับ AWS Price List API (ap-southeast-1) เมื่อ 28 ต.ค. 2026; จำนวนใช้จริง/free tier/เรทบาทยังสมมติ · lab ใหม่ต้องเพิ่ม entry ใน `COSTD.uc`

## Commands

```bash
# infra (terraform/): copy terraform.tfvars.example -> terraform.tfvars first
terraform init && terraform plan && terraform apply
terraform destroy            # always when done; 10 VMs + ALB + NAT bill hourly

# config (ansible/): inventory is dynamic (amazon.aws.aws_ec2), needs pip install ansible boto3 botocore
ansible-inventory --graph    # verify all groups present
ansible-playbook site.yml    # db -> k8s (prd cluster, dev cluster, register dev in ArgoCD) -> sonarqube -> jenkins (order is by layer; IPs come from the inventory, so playbooks do not depend on each other)
ansible-playbook jenkins.yml # one role only
```

Tests: backend `cd repo-backend && pip install -r requirements/dev.txt && pytest` (pytest-django, sqlite in memory, no DB needed; settings `config.settings_test`); frontend `cd repo-frontend && npm ci && npm run lint && npm run typecheck && npm test` (vitest); Console Lab engine `node tools/console-lab/test.js`. Jenkins' `Test` stage runs the first two in throwaway containers. Cheap-mode: set `k8s_node_count = 1` and `db_count = 1` (dev VM is always created) in `terraform.tfvars`.

## Architecture notes (cross-file)

- **Flow:** git tag in `pharmacy-backend` or `pharmacy-frontend` → that repo's Jenkins job (params: `TARGET_ENV`, `VERSION` tag, `ACTION`, `AUTO_SYNC`; the service is fixed per job) → SonarQube scan → docker build/push to ECR → Jenkins commits new image to `pharmacy-manifests` → ArgoCD syncs (auto if `AUTO_SYNC`, else manual in UI).
- Jenkins gets `ECR_REGISTRY`, `SONAR_HOST_URL`, `ARGOCD_SERVER`, `MANIFESTS_REPO` from `/opt/jenkins/.env` (written by `ansible/jenkins.yml`), plus three UI-created credentials: `github-token`, `sonar-token`, `argocd-admin`. Changing a variable name means touching Jenkinsfile, the ansible playbook, and the compose file.
- Jenkins runs as root with `docker.sock`; the scanner container uses `--volumes-from jenkins`.
- `prd` only accepts tags matching `vN.N.N`; `deploy-only` reuses an existing ECR image (promote dev→prd / rollback).
- Deploy backend before frontend on first release (frontend needs the backend Service).
- `repo-manifests/*/backend/deployment.yaml` also holds Job `backend-migrate` (ArgoCD PreSync hook: `migrate` + `bootstrap_app`, dev adds `--sample`), so Jenkins' `sed` rewrites **two** `image:` lines per backend file. Secrets `db-credentials` and `app-secrets` (Django SECRET_KEY, admin password) are rendered by Ansible (`vm-k8s/cluster-base.yaml.j2`, values in `ansible/group_vars/all/main.yml`). `DJANGO_ALLOWED_HOSTS=*` is deliberate: kubelet probes use the pod IP as Host. ALB target groups health-check `/healthz` (Next.js answers 307 on `/`).
- Network: 3 AZ; public subnets (ALB, NAT, bastion, Jenkins, SonarQube) and private subnets (k8s ×3, dev, DB ×3), tag `Tier`. Bastion is the only SSH entry (SG `base` allows 22 only from bastion SG); Ansible reaches private hosts via ProxyCommand in `ansible/group_vars/internal.yml`. ArgoCD UI via ALB :8443 → HTTPS TG :30443. One NAT (AZ a) — cost trade-off.
- Two k3s clusters: prd on `pharmacy-k8s-1..3` (all k3s servers, HA embedded etcd: k8s-1 `--cluster-init`, others join serially) (FE/BE 3 replicas each, namespace `prd`) and dev on single VM `pharmacy-dev` (namespace `dev`, ALB :8080). ArgoCD runs only on k8s-1 and manages dev via a cluster Secret named `pharmacy-dev` (created in `ansible/k8s.yml`); the dev Applications in `apps.yaml` reference it by `destination.name`, so keep names in sync. The same `vm-k8s/cluster-base.yaml.j2` renders per-cluster via the `namespaces` var. Both clusters share the Galera DB (databases `pharmacy_dev` / `pharmacy_prd`).
- ECR credentials expire every 12h; `vm-k8s/ecr-refresh.{sh,service,timer}` refreshes the pull secret on `pharmacy-k8s-1` and `pharmacy-dev` (namespaces from `NAMESPACES` in `/etc/default/ecr-refresh`).
- DB is a MariaDB Galera cluster (`vm-db/60-galera.cnf.j2`); backend reaches it through a plain k8s Service with no health check (known simplification).
- `ansible/group_vars/all/main.yml` holds `github_user` (placeholder `YOUR_GITHUB_USER`, also in `repo-manifests/argocd-apps/apps.yaml`) and plaintext lab passwords.
- Ansible defaults: user `ubuntu`, key `~/.ssh/id_ed25519`, host key checking off.
