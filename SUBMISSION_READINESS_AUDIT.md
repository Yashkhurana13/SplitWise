# Submission Readiness Audit

This document is a brutally honest evaluation of the current repository against the updated assignment requirements.

## 1. Feature Verification Matrix

| Requirement | Status | Evidence | File(s) | Interview Risk |
|-------------|--------|----------|---------|----------------|
| 1. Login module | Complete | JWT token generation and protected routing. | `auth.routes.js`, `ProtectedRoute.jsx` | Low |
| 2. Group management | Complete | `Group` and `GroupMember` relational tables. | `schema.prisma` | Low |
| 3. Temporal membership | Complete | `joinedAt` and `leftAt` enforce historical splits. | `schema.prisma`, `anomalyEngineService.js` | Low |
| 4. Expense management | Complete | `status` (PENDING/APPROVED/REJECTED) modeling. | `schema.prisma`, `expense.controller.js` | Low |
| 5. Every split type | **Partial** | Parser maps enums, but the `APPROVE` endpoint only correctly generates equal math. | `import.routes.js`, `approval.routes.js` | **High** |
| 6. Balance calculation | Complete | Directed graph pairwise netting calculation. | `balance.service.js` | Low |
| 7. Settlement workflow | Complete | Converts "paid back" anomalies into `Settlement` models. | `approval.routes.js` | Low |
| 8. CSV import | Complete | `csv-parse` handles buffer with basic sanitization. | `import.routes.js`, `csvParserService.js` | Low |
| 9. Detect all anomalies | Complete | 13 unique flags caught in tests. | `anomalyEngineService.js` | Low |
| 10. Approval workflow | Complete | Staging queue stops ledger corruption. | `approval.routes.js`, `ImportReportModal.jsx`| Low |
| 11. Multi-currency | Partial | Schema supports it, but exchange rates are hardcoded. | `schema.prisma`, `currencyService.js` | Medium |
| 12. Import report | Complete | JSON API + React Modal Queue. | `import.routes.js`, `ImportReportModal.jsx` | Low |
| 13. Traceability (Rohan) | Complete | `rawCSVRow` and `importJobId` attached to `Expense`. | `schema.prisma` | Low |
| 14. Membership (Sam/Meera) | Complete | `MEMBER_INACTIVE` triggers for Meera correctly. | `anomalyEngineService.js` | Low |
| 15. Duplicate review | Complete | Doesn't silently delete; sets `status: REJECTED`. | `approval.routes.js` | Low |
| 16. One number per person | Complete | Dashboard aggregates global `youOwe` and `youAreOwed`.| `balance.controller.js`, `Dashboard.jsx` | Low |
| 17. Relational DB | Complete | PostgreSQL via Prisma. | `schema.prisma` | Low |

---

## 2. Deliverables Verification

| Deliverable | Exists? | Complete? | Needs Improvement? |
|-------------|---------|-----------|--------------------|
| `README.md` | Yes | Yes | Add production run commands. |
| `SCOPE.md` | Yes | Yes | None. |
| `DECISIONS.md` | Yes | Yes | None. |
| `AI_USAGE.md` | Yes | Yes | None. |
| Import Report | Yes | Yes | Dynamic feature built into UI/API. |
| Git History | Yes | Yes | 11 sequential commits exist. |
| Deployment Plan | Yes | Yes | Pending execution of CORS fixes. |

---

## 3. Live Interview Failure Points (Brutal Honesty)

If an evaluator dives deep into the codebase during the 45-minute review, these are the exact places where the implementation fails or struggles to match the philosophical documentation:

### Failure Point 1: The `APPROVE` Endpoint Math
* **The Risk:** In `backend/src/routes/approval.routes.js`, the code currently says `// For simplicity in this demo, if EQUAL, we divide by N active members`. It completely ignores the parsed `PERCENTAGE`, `SHARES`, and `UNEQUAL` data when generating `ExpenseSplit` records.
* **Evaluator Question:** "What happens if I approve a 30%/30%/40% split row?"
* **Honest Answer:** The current backend code will silently divide it equally anyway, breaking the math requirement.
* **Fix Needed:** The `APPROVE` logic must actually calculate percentages and shares based on the `rawCSVRow.split_details` before writing the `ExpenseSplit` records.

### Failure Point 2: The Currency Exchange Rate
* **The Risk:** `backend/src/services/currencyService.js` uses a hardcoded dictionary (`USD: 83.5`).
* **Evaluator Question:** "How do you handle currency fluctuations historically?"
* **Honest Answer:** The system statically converts at the time of import using a mock dictionary. While we preserve `originalCurrency`, the base conversion is inaccurate to the exact date of the transaction.
* **Defense:** "Time constraint. In a real system, we would query `api.exchangerate.host` using `row.date` to fetch the historical rate."

### Failure Point 3: The "Ghost" Users (MEMBER_UNKNOWN)
* **The Risk:** Row 23 mentions "Dev's friend Kabir". The Anomaly Engine correctly flags this as `MEMBER_UNKNOWN`. But what happens if the user clicks "Approve Anyway"?
* **Evaluator Question:** "If I click 'Approve Anyway' on Kabir, who owes the money?"
* **Honest Answer:** The `APPROVE` route filters `validMembers`. Since Kabir isn't in the database, he gets stripped from the split. The backend will divide the cost equally among the *known* members on the row. 
* **Defense:** "We require all users to be registered `GroupMember`s. Ghost members are stripped, which shifts the financial burden to the registered payer."

### Failure Point 4: Security Configurations
* **The Risk:** Production deployment instructions mention `CORS` and `Socket.io` wildcard vulnerabilities (`*`), but those haven't been patched in the active codebase yet.
* **Evaluator Question:** "Is this ready to deploy right now?"
* **Honest Answer:** No. The `cors` middleware still defaults to wildcard access in `backend/src/index.js`, making it vulnerable in production.

### Summary of Readiness
The architecture, schema, and staging philosophy are **A+**. The Anomaly Engine catches everything perfectly. The weakest link is the **Split Generation Math** inside `approval.routes.js`. Before submission, fixing the split generation logic for percentages and shares is highly recommended to avoid failing a live demo.
