# Pre-Schema Architecture Review

This document addresses the final architectural questions to ensure the upcoming database schema explicitly satisfies all stakeholder requirements.

---

### 1. Historical Membership Accounting

**Scenario:** Meera leaves on March 28. 
* **Case A: Expense on March 20 includes Meera.**
  * **Import Result:** Saved as `status: PENDING`.
  * **Anomaly Status:** Clean (No anomaly). Meera's membership is valid on March 20.
  * **Balance Impact:** Zero. Balances do not update until the user clicks "Approve".
* **Case B: Expense on April 2 includes Meera.**
  * **Import Result:** Saved as `status: PENDING`.
  * **Anomaly Status:** Flagged as `MEMBER_INACTIVE`. The engine detects April 2 > March 28.
  * **Balance Impact:** Zero. The UI blocks approval. The user must manually resolve it (e.g., remove Meera and recalculate, or manually extend Meera's `leftAt` date).

---

### 2. Currency Conversion Strategy
The system handles multi-currency without breaking the core single-currency `Balance Engine`.

* **Storage Strategy:** The `Expense` model will store four distinct fields:
  1. `originalAmount` (e.g., 540)
  2. `originalCurrency` (e.g., "USD")
  3. `exchangeRate` (e.g., 83.5)
  4. `amount` (e.g., 45090) -> This is the converted base-currency (INR) amount used for all math.
* **Conversion Strategy:** Executed exactly at the time of import (Option A from our analysis).
* **Reporting Strategy:** The UI shows "₹45,090" in the main feed, but the Expense Details view clearly states "(Originally $540 USD at 83.5 INR)".

---

### 3. Explainability Requirement (Rohan's Requirement)
> *"If the app says I owe ₹2300, I want to see exactly which expenses make that up."*

**Traceability Chain:**
Our architecture uses a dynamic, continuous ledger rather than a static matrix. The chain is 100% traceable:
1. **Current Balance (UI):** Rohan owes Aisha ₹2300.
2. **↓ ExpenseSplit Rows:** The API queries all `ExpenseSplit` records where `userId = Rohan` and the parent `Expense.payerId = Aisha`.
3. **↓ Expense:** Each split links directly to a specific `Expense` (e.g., "Wifi bill", "Pizza").
4. **↓ Import Source:** The `Expense` has an `importJobId` linking it to "May2026_Export.csv" and a `rawCSVRow` field storing the exact text string originally uploaded. 
Rohan can trace a debt down to the exact row in the exact CSV file.

---

### 4. Meera's Requirement
> *"Clean up duplicates, but I want to approve anything the app deletes or changes."*

* **What data is preserved:** When an anomaly is detected, the raw row is saved into a new `Expense` record with `status: PENDING`. A `rawCSVRow` JSON field ensures the exact original text is never lost. An `Anomaly` record is attached.
* **What data is modified:** The system does **not** silently delete the duplicate. Instead, it highlights it in the Approval UI.
* **Audit Trail:** The user must explicitly click "Reject/Delete". The `Anomaly` record is marked as `resolved: true` and the user's action is recorded. Nothing is permanently lost without human consent.

---

### 5. Final Schema Justification

Every new field traces back to an assignment requirement:

| New Field/Table | Reason | Requirement Satisfied |
|-----------------|--------|-----------------------|
| `Expense.status` (`PENDING`/`APPROVED`) | Prevents imports from corrupting ledgers. | **Meera:** "I want to approve anything..." |
| `Expense.rawCSVRow` | Stores the unadulterated source text. | **Rohan/Meera:** Traceability and Audit Trail. |
| `Expense.originalCurrency` / `exchangeRate` | Tracks foreign transactions cleanly. | **Multi-currency support** requirement. |
| `Expense.importJobId` | Links an expense to a specific file upload. | **Traceability** & Import Report Generation. |
| `GroupMember.joinedAt` / `leftAt` | Defines temporal boundaries for members. | **Historical Membership Timeline** requirement. |
| `ImportJob` (Table) | Tracks upload metadata and global status. | **Import workflow** requirement. |
| `Anomaly` (Table) | Explicitly models flags (Duplicates, Settlements). | **Meera:** "Clean up duplicates but approve..." |
