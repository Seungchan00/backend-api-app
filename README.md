# backend-api

## 개요

CI/CD GitOps 파이프라인의 배포 대상으로 만든 작은 Node.js 서버입니다. 
별도의 비즈니스 기능은 없고, 헬스체크, Prometheus 메트릭, 장애 실습용 엔드포인트만 제공합니다.
배포 설정은 [backend-api-gitops](https://github.com/Seungchan00/backend-api-gitops)에서 관리합니다.

## 구조

- src/index.js : HTTP 서버 
- Dockerfile : 멀티스테이지, non-root(UID 1001)
- .github/workflows/ci.yml : CI 파이프라인
- .dockerignore, .trivyignore

## 엔드포인트

| 경로 | 용도 |
| --- | --- |
| `/` | 기본 응답 |
| `/healthz` | liveness/readiness probe |
| `/metrics` | Prometheus 메트릭 (`http_requests_total`, `http_request_duration_seconds`) |
| `/leak` | 메모리 누수 장애 실습용. 운영에 쓰면 안 됨 |

## CI 파이프라인

트리거 : PR merge

단계   : 빌드 -> Trivy 스캔 -> GHCR 푸시 -> GitOps 태그 갱신 

PR을 main에 merge 하면 GitHub Actions가 실행됩니다.

- amd64 이미지를 빌드후 Trivy로 취약점을 검사합니다. (CRITICAL 취약점이 발견되면 파이프라인이 중단됩니다.)
- 통과하면 GHCR에 amd64/arm64 멀티 아키텍처 이미지를 푸시, 태그는 커밋 SHA입니다.
- Deploy key로 GitOps 레포 체크아웃, `yq`로 `values-dev.yaml`의 `image.tag`를 갱신해 커밋합니다.
- ArgoCD가 변경을 감지해 dev에 배포합니다. (prod는 검증 태그를 수동으로 반영합니다.)

## 필요한 Secret

`GITOPS_DEPLOY_KEY`: GitOps 레포에 쓰기 권한이 있는 Deploy key의 비밀키입니다.
공개키는 GitOps 레포의 Deploy keys에 쓰기 허용으로 등록합니다.

## 로컬 실행
```bash
npm install
npm start 
```
기본포트는 8080이고 , `PORT` 환경변수로 변경 가능
```bash
curl http://localhost:8080/healthz
```
# 한계

Trivy 스캔은 amd64 이미지만 대상입니다.

