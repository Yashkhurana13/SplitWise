# Updated Requirements Gap Analysis

## Initial Estimation
* **Percentage of New Assignment Already Covered:** ~40%. We have a rock-solid foundation for users, groups, relational debts, balance netting, authentication, and split math.
* **Percentage Missing:** ~60%. The entire CSV parsing pipeline, anomaly detection engine, multi-currency conversion, approval workflow, and historical state-tracking are completely absent.

---

## 1. Existing Features We Already Satisfy
* User Authentication (Registration, Login, JWT).
* Group Management (Creation, viewing members).
* Expense Management (Creation, title, amount).
* Split Calculation (Equal, Unequal, Percentage, Shares).
* Balance Engine (Calculating net debts via continuous ledgering).
* Settlements (Recording manual payments).
* Real-time expense chat.
* Basic Splitwise UI.

## 2. Features That Are Partially Satisfied
* **Database Models:** We have Expenses and ExpenseSplits, but they only support a single implicit currency (assumed `$`) and do not track temporal status like `status: PENDING_APPROVAL`.
* **Group Membership:** We track who is in a group *now*, but we do NOT track membership changes *over time* (e.g., when they joined vs. when they left), which is critical for backdated CSV imports.

## 3. Features That Are Completely Missing
* **CSV Import Engine:** Parsing arbitrary CSV formats (bank statements, exported logs).
* **Multi-Currency Support:** Converting foreign transaction currencies into a normalized base currency, tracking exchange rates at specific dates.
* **Anomaly Detection Pipeline:**
  * Duplicate detection.
  * Settlement-vs-expense detection (e.g., classifying a bank transfer as a Settlement rather than a new Expense).
* **Approval Workflow:** Staging imported expenses in a `PENDING` state until the user explicitly approves them into the live ledger.
* **Import Report Generation:** Providing a summary of what was parsed, what was flagged as anomalous, and what was approved/rejected.
* **New Documentation:** `SCOPE.md`, `DECISIONS.md`, `AI_USAGE.md`.

---

## 4. Required Schema Changes
* **Currency Support:** Add `currency` (e.g., "USD", "EUR") and `exchangeRate` to `Expense` and `Settlement`.
* **Temporal Membership:** Add `joinedAt` and `leftAt` to `GroupMember`.
* **Approval States:** Add `status` (e.g., `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED`) to `Expense`.
* **Import Metadata:** Create an `ImportJob` model to track file uploads, parsed rows, and report generation.
* **Anomalies:** Create an `Anomaly` model linked to a specific Expense/Row, tracking confidence scores and anomaly types (Duplicate, Misclassified Settlement).

## 5. Required API Changes
* `POST /api/import`: Upload and parse a CSV file, returning an `ImportJob` ID.
* `GET /api/import/:id`: Retrieve the status and anomalies of an import job.
* `POST /api/import/:id/approve`: Bulk approve or individually approve pending expenses from an import.
* `GET /api/groups/:id/reports`: Generate the Import Report.

## 6. Required UI Changes
* **Import Workflow Screen:** A dedicated page or modal for uploading CSVs.
* **Anomaly Resolution Queue:** A UI table showing pending expenses, flagging duplicates or suspicious entries, and offering "Approve" / "Reject" toggles.
* **Currency Selection:** Dropdowns on manual expense creation for different currencies.

## 7. Required Import Pipeline Architecture
1. **File Upload:** Accept `multipart/form-data`.
2. **Parser Service:** Standardize incoming CSV rows into a generic `RawTransaction` object.
3. **Enrichment Service:** Apply currency conversion (if needed) and infer payer/participants based on text matching.
4. **Staging:** Save as `Expense` with `status: PENDING_APPROVAL`.

## 8. Required Anomaly Detection Architecture
This engine runs directly after the Parser Service:
* **Duplicate Detector:** Queries existing expenses within a +/- 2 day window with a matching amount (+/- 1%) and similar title. Flags if confidence > 80%.
* **Settlement Detector:** Uses keyword heuristics (e.g., "Venmo", "Zelle", "Payment", "Transfer") or negative amounts to flag a transaction as a potential Settlement rather than a shared Expense.

## 9. New Documentation Requirements
* **`SCOPE.md`:** Define the exact boundaries of the CSV import (e.g., supported formats, max file size).
* **`DECISIONS.md`:** Architectural Decision Records (ADRs) explaining *why* we chose specific anomaly detection heuristics over Machine Learning.
* **`AI_USAGE.md`:** Documenting how LLM tools were utilized in architecting the pipeline.
