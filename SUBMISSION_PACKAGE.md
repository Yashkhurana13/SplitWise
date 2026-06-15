# Submission Package: Splitwise Shared Expenses & Import System

## 1. Project Links
* **GitHub Repository:** [https://github.com/Yashkhurana13/SplitWise.git](https://github.com/Yashkhurana13/SplitWise.git)
* **Public Deployed URL:** [https://splitwise.yashkhurana.dev](https://splitwise.yashkhurana.dev) (Deployment Pending AWS Infrastructure)
* **API Health Check Endpoint:** `https://splitwise.yashkhurana.dev/api/groups` (Returns 401 Unauthorized if working correctly)

## 2. Architecture Summary
This application is a robust, full-stack React and Express platform focused heavily on financial data integrity. It abandons the traditional "assume everything is correct" model of CRUD apps in favor of a staging-queue architecture. 
* **React SPA (Frontend):** Serves dynamic modal queues for anomaly resolution.
* **Express & Prisma (Backend):** Node.js API with strict PostgreSQL schema modeling temporal group membership.
* **Import Pipeline:** Uses `csv-parse` and a custom heuristic Anomaly Engine to flag 13 distinct types of accounting violations, ensuring that no ledger is ever corrupted without explicit human approval.
* **Production Stack:** AWS EC2, PM2 Process Manager, Nginx Reverse Proxy, Let's Encrypt SSL, and Neon PostgreSQL.

## 3. Deliverables Checklist
- [x] **README.md:** Project setup, environment config, and overview.
- [x] **SCOPE.md:** Comprehensive anomaly tracking boundaries.
- [x] **DECISIONS.md:** Architectural Decision Records (ADRs).
- [x] **AI_USAGE.md:** Documented AI correction logs and prompts.
- [x] **VERIFICATION_REPORT.md:** Concrete proof of implementation via db logs and git history.
- [x] **INTERVIEW_PREP.md:** Extensive defense guide with 25 expected questions.
- [x] **DEPLOYMENT_PLAN.md:** Step-by-step production server setup.
- [x] **Import Report:** Fully dynamic React UI rendering the staged anomalies.

## 4. Known Limitations
1. **Exchange Rates:** Currently static (`USD = 83.5 INR`). A production build requires integration with `Fixer.io` or `OpenExchangeRates`.
2. **Auto-Rebalancing:** Percentage splits totaling >100% block approval successfully but offer no "auto-normalize" button in the UI.
3. **Scale:** The Balance Engine performs an O(N^2) pairwise netting calculation on every read. For groups >500 members, this requires a cached materialized view.

## 5. Interview Talking Points
When presenting this assignment, control the narrative by focusing on these three pillars:
1. **"I prioritized Data Integrity over UX Convenience."** Explain why you chose to increase user friction (forcing them to approve rows) rather than silently mutating debts.
2. **"I built Temporal Membership Tracking."** Explain how Meera leaving in March means she mathematically cannot owe for groceries in April, and how your database tracks `leftAt` boundaries.
3. **"I designed perfect Traceability."** Explain that if a user questions a 50-rupee debt, your app traces `Balance -> ExpenseSplit -> Expense -> ImportJob -> rawCSVRow`. You preserve the raw string forever for the audit trail.
