# Production Readiness Checklist

This checklist verifies the environment state immediately prior to AWS EC2 deployment.

| Component | Status | Details / Action Required |
|-----------|--------|---------------------------|
| Prisma Config | **PASS** | `&pgbouncer=true` documented for Neon PostgreSQL in AWS Runbook. |
| Env Variables | **PASS** | Documented securely in the AWS runbook. |
| JWT Secrets | **ACTION REQUIRED** | Must generate a secure 64-byte string on the EC2 server prior to PM2 startup. |
| Socket.io | **PASS** | Hardened to `https://splitwise.yashkhurana.dev`. |
| CORS Config | **PASS** | Hardened to `https://splitwise.yashkhurana.dev`. |
| PM2 Readiness | **PASS** | `index.js` verified to run cleanly in background daemon. |
| Nginx Readiness | **PASS** | Reverse proxy config block written and verified in plan. |
| SSL Readiness | **PASS** | Certbot commands prepared in AWS runbook. |
| React Build | **PASS** | `npm run build` succeeds locally; prepared for remote execution. |

**Final Assessment:** The codebase is fully prepared for cloud deployment. The only remaining action is provisioning the actual AWS infrastructure and executing the runbook.
