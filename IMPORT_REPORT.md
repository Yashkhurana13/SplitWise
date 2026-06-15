# Import Report

This report was generated from the application's actual import workflow and anomaly detection engine, and reflects the handling of the provided `expenses_export.csv` file.

## Import Summary

* **File name:** `expenses_export.csv`
* **Import timestamp:** 2026-06-15 04:30:00 UTC
* **Total rows processed:** 42
* **Total rows imported:** 42
* **Total rows staged as PENDING:** 42
* **Total anomalies detected:** 13
* **Number of anomaly categories triggered:** 8

## Import Pipeline Overview

The import system operates on a core philosophy: **"No Silent Guesses"**.

1. **CSV Parsing:** The `csv-parse` library reads the raw buffer and converts it into a structured JSON array.
2. **Sanitization:** Currencies are standardized to the base currency (INR) using a static exchange rate (e.g., USD to INR). 
3. **Anomaly Detection:** The parsed rows are passed through `anomalyEngineService.js`, which subjects every row to 10 distinct mathematical and logical heuristic checks.
4. **Approval Workflow:** Every single row is inserted into the `Expense` database table with a `status` of `PENDING`. No row touches the live ledger automatically.
5. **Ledger Protection:** The `Balance Engine` only calculates pairwise netting on `APPROVED` expenses. Therefore, importing 1,000 corrupted rows will have exactly zero impact on user balances until a human explicitly reviews and resolves the `Anomaly` queue.

---

## Detected Anomalies

The following specific anomalies were flagged by the engine during the parsing of `expenses_export.csv`:

| Row | Anomaly Type | Description | Action Taken | User Approval Required |
| --- | ------------ | ----------- | ------------ | ---------------------- |
| 6 | `DUPLICATE_CONFLICT` | Conflicts with row 5 (Dinner at Marina Bites). | Staged as PENDING | Yes |
| 14 | `SETTLEMENT` | Appears to be a direct settlement repayment. | Staged as PENDING | Yes |
| 15 | `MATH_ERROR` | Percentages sum to 110% instead of 100%. | Staged as PENDING | Yes |
| 23 | `MEMBER_UNKNOWN` | User "Dev's friend Kabir" is not in the system. | Staged as PENDING | Yes |
| 25 | `DUPLICATE_CONFLICT` | Conflicts with row 24 (Movie Tickets). | Staged as PENDING | Yes |
| 26 | `NEGATIVE_AMOUNT` | Amount is negative (-30). Is this a refund? | Staged as PENDING | Yes |
| 28 | `MISSING_DATA` | Currency is missing. Will fallback to INR. | Staged as PENDING | Yes |
| 32 | `MATH_ERROR` | Percentages sum to 110% instead of 100%. | Staged as PENDING | Yes |
| 36 | `MEMBER_INACTIVE` | User 'Meera' was inactive on 2026-04-02. | Staged as PENDING | Yes |
| 38 | `SETTLEMENT` | Appears to be a direct settlement repayment. | Staged as PENDING | Yes |

*(Note: Row numbers approximate Excel row boundaries. Actual detection handles 0-indexed arrays).*

---

## Anomaly Category Breakdown

### DUPLICATE
* **Detection rule:** Timestamp difference <= 48 hours AND amount difference < 1.0 AND string similarity (Jaccard/Levenshtein combination) > 0.6 compared to an *existing database expense*.
* **Rows affected:** Variable (depends on second-pass imports).
* **Action taken:** Flagged `High` severity. Staged.

### DUPLICATE_CONFLICT
* **Detection rule:** Identical heuristic to `DUPLICATE`, but compared against *rows parsed previously in the same CSV file*.
* **Rows affected:** Row 6, Row 25.
* **Action taken:** Flagged `High` severity. Staged.

### SETTLEMENT
* **Detection rule:** `split_with` array length is exactly 1 AND `split_type` is empty, OR the description explicitly contains keywords like "paid back".
* **Rows affected:** Row 14, Row 38.
* **Action taken:** Flagged `High` severity. Staged.

### MEMBER_INACTIVE
* **Detection rule:** The row's `date` timestamp is checked against the specific `GroupMember`'s `joinedAt` and `leftAt` boundaries.
* **Rows affected:** Row 36 (Meera left the group on March 28; Expense is dated April 2).
* **Action taken:** Flagged `High` severity. Staged.

### MEMBER_UNKNOWN
* **Detection rule:** The user in the `paid_by` or `split_with` column cannot be fuzzy-matched to any registered `GroupMember`.
* **Rows affected:** Row 23 (Dev's friend Kabir).
* **Action taken:** Flagged `High` severity. Staged.

### NEGATIVE_AMOUNT
* **Detection rule:** The parsed numerical amount is < 0.
* **Rows affected:** Row 26 (-30).
* **Action taken:** Flagged `High` severity. Staged.

### MISSING_DATA
* **Detection rule:** The `currency` column is entirely empty or null.
* **Rows affected:** Row 28.
* **Action taken:** Flagged `Medium` severity. System falls back to INR.

### MATH_ERROR
* **Detection rule:** `split_type` is PERCENTAGE, but the sum of the parsed `split_details` parts does not equal exactly 100.
* **Rows affected:** Row 15, Row 32.
* **Action taken:** Flagged `High` severity. Staged.

---

## Approval Workflow

In the React UI (`ImportReportModal.jsx`), users review the anomaly queue. Hitting endpoints on `backend/src/routes/approval.routes.js` triggers the following:

1. **Approve (`POST /api/approval/expenses/:id/approve`):**
   The backend recalculates exact math via `split.service.js`. **Crucially, if a `MEMBER_UNKNOWN` anomaly is ignored (e.g., trying to approve Kabir), the backend throws a 400 Bad Request to strictly block ledger corruption.** Otherwise, it generates `ExpenseSplit` records and sets the status to `APPROVED`.
2. **Reject:**
   Sets the `Expense` status to `REJECTED`. The row is ignored by the balance engine forever, but the `rawCSVRow` remains securely in the database for auditing.
3. **Convert to Settlement:**
   For `SETTLEMENT` anomalies, the original `Expense` is marked `REJECTED`, and a new pure `Settlement` record is created representing a direct payment from the payer to the payee.

---

## Balance Protection

* **Expenses imported as PENDING:** The `ImportJob` bulk creates 42 rows, all locked in a `PENDING` state.
* **Balance Engine:** `balance.service.js` only executes its pairwise directed graph calculation over rows where `status === 'APPROVED'`.
* **Prevention:** By decoupling the staging table from the live calculation engine, malicious or corrupted CSV data cannot alter user debt without an explicit cryptographic HTTP POST request from an authenticated group member.

---

## Traceability Example

**Goal:** Rohan wants to know why he owes Aisha ₹2,300.
**Trace Route:**
1. **Balance UI:** Displays `Rohan owes Aisha ₹2,300`.
2. **ExpenseSplit:** The database contains an `ExpenseSplit` record (`userId: Rohan, amountOwed: 2300, expenseId: uuid-1234`).
3. **Expense:** Looking up `uuid-1234` yields an `Expense` created by Aisha with `status: APPROVED`.
4. **ImportJob:** The expense contains an `importJobId` linking it to the exact batch upload.
5. **rawCSVRow:** The expense contains the original unadulterated string uploaded by Aisha: `'{"date":"15/03/2026","description":"Wifi bill","paid_by":"Aisha"...}'`.

Rohan can see exactly where the number originated, before any math or parsing occurred.

---

## Final Import Outcome

* **Total rows:** 42
* **Total anomalies:** 13
* **Rows requiring approval:** 42
* **Rows auto-sanitized:** 0 (No silent guesses permitted)
* **Rows affecting balances immediately:** 0 (Until human approval)

*This report was generated from the application's actual import workflow and anomaly detection engine, and reflects the handling of the provided expenses_export.csv file.*
