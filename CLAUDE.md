# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A learning lab that simulates a production release flow on AWS using only VMs. Terraform creates machines, Ansible configures them, Jenkins builds/pushes images, ArgoCD deploys to k3s. README.md (Thai) has the full step-by-step; **the stack has never been run on AWS yet** (account suspended), so expect first-run errors. Files are only syntax-checked.

## Repo layout is a mock of several real places

This directory is not one deployable unit. Each top-level folder maps to a different location in the "real" system; every folder has a `WHERE.md` with the real path of each file, and every config file has a "ของจริงอยู่ที่" header comment. Keep both in sync when adding/moving files.

- `terraform/`, `ansible/`: run from the laptop.
- `vm-*/`: files that Ansible copies onto the VM of that name (`vm-jenkins`, `vm-sonarqube`, `vm-k8s`, `vm-db`; `vm-k8s` goes to both `pharmacy-k8s-1` and `pharmacy-dev`). Not runnable locally. `*.j2` files are Ansible templates.
- `repo-app/`: becomes the GitHub repo `pharmacy-app` (Flask backend, nginx frontend, `Jenkinsfile`).
- `repo-manifests/`: becomes the GitHub repo `pharmacy-manifests`. Jenkins rewrites the `image:` line in `{dev,prd}/{frontend,backend}/deployment.yaml` via `sed`; ArgoCD apps defined in `argocd-apps/apps.yaml`. Don't change the `image:` line format without updating the Jenkinsfile's `Update manifest` stage.

## Commands

```bash
# infra (terraform/): copy terraform.tfvars.example -> terraform.tfvars first
terraform init && terraform plan && terraform apply
terraform destroy            # always when done; 9 VMs + ALB bill hourly

# config (ansible/): inventory is dynamic (amazon.aws.aws_ec2), needs pip install ansible boto3 botocore
ansible-inventory --graph    # verify all groups present
ansible-playbook site.yml    # db -> k8s (prd cluster, dev cluster, register dev in ArgoCD) -> sonarqube -> jenkins (order matters)
ansible-playbook jenkins.yml # one role only
```

There is no test suite or linter configured. Cheap-mode: set `k8s_node_count = 1` and `db_count = 1` (dev VM is always created) in `terraform.tfvars`.

## Architecture notes (cross-file)

- **Flow:** git tag in `pharmacy-app` → Jenkins job (params: `TARGET_ENV`, `SERVICE`, `VERSION` tag, `ACTION`, `AUTO_SYNC`) → SonarQube scan → docker build/push to ECR → Jenkins commits new image to `pharmacy-manifests` → ArgoCD syncs (auto if `AUTO_SYNC`, else manual in UI).
- Jenkins gets `ECR_REGISTRY`, `SONAR_HOST_URL`, `ARGOCD_SERVER`, `MANIFESTS_REPO` from `/opt/jenkins/.env` (written by `ansible/jenkins.yml`), plus three UI-created credentials: `github-token`, `sonar-token`, `argocd-admin`. Changing a variable name means touching Jenkinsfile, the ansible playbook, and the compose file.
- Jenkins runs as root with `docker.sock`; the scanner container uses `--volumes-from jenkins`.
- `prd` only accepts tags matching `vN.N.N`; `deploy-only` reuses an existing ECR image (promote dev→prd / rollback).
- Deploy backend before frontend on first release (frontend needs the backend Service).
- Two k3s clusters: prd on `pharmacy-k8s-1..3` (FE/BE 3 replicas each, namespace `prd`) and dev on single VM `pharmacy-dev` (namespace `dev`, ALB :8080). ArgoCD runs only on k8s-1 and manages dev via a cluster Secret named `pharmacy-dev` (created in `ansible/k8s.yml`); the dev Applications in `apps.yaml` reference it by `destination.name`, so keep names in sync. The same `vm-k8s/cluster-base.yaml.j2` renders per-cluster via the `namespaces` var. Both clusters share the Galera DB (databases `pharmacy_dev` / `pharmacy_prd`).
- ECR credentials expire every 12h; `vm-k8s/ecr-refresh.{sh,service,timer}` refreshes the pull secret on `pharmacy-k8s-1` and `pharmacy-dev` (namespaces from `NAMESPACES` in `/etc/default/ecr-refresh`).
- DB is a MariaDB Galera cluster (`vm-db/60-galera.cnf.j2`); backend reaches it through a plain k8s Service with no health check (known simplification).
- `ansible/group_vars/all/main.yml` holds `github_user` (placeholder `YOUR_GITHUB_USER`, also in `repo-manifests/argocd-apps/apps.yaml`) and plaintext lab passwords.
- Ansible defaults: user `ubuntu`, key `~/.ssh/id_ed25519`, host key checking off.
