# Ghost Member Fix Verification

This document verifies the resolution of **Interview Risk 1: Ghost User Approval**.

### Previous Behavior
* **The Flaw:** When an imported row contained an unknown user (e.g., Row 23 with "Dev's friend Kabir"), the Anomaly Engine correctly flagged it as `MEMBER_UNKNOWN`. However, if an evaluator maliciously clicked "Approve Anyway", the backend `approval.routes.js` used `.filter(Boolean)` to map the splits.
* **The Result:** The ghost user was silently stripped. The expense was then mathematically split equally among the remaining *valid* users, silently shifting the financial burden and violating the "No Silent Guesses" philosophy.

### New Behavior
* **The Fix:** Removed `.filter(Boolean)` and added an explicit check: `if (mappedSplitDetails.includes(null))`.
* **The Result:** The system now throws an immediate HTTP 400 Bad Request: *"Cannot approve expense: It contains unknown or inactive members. Please reject this row or manually edit the members to assign valid registered users."*

### Test Case: Row 23 ("Parasailing")
* **Input:** `split_with: "Aisha; Rohan; Dev's friend Kabir"`
* **Action:** POST to `/api/approval/expenses/:id/approve`
* **Output:** 
```json
{
  "error": "Cannot approve expense: It contains unknown or inactive members. Please reject this row or manually edit the members to assign valid registered users."
}
```
* **Proof:** Approval is strictly blocked at the routing layer. No `ExpenseSplit` records are generated, and the ledger is protected.
