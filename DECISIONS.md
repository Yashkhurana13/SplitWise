# Architectural Decision Records (ADRs)

## 1. Currency Conversion Strategy
* **Problem:** CSV contains both INR and USD.
* **Options Considered:** 
  1. Store multiple currencies separately and build a multi-dimensional balance matrix.
  2. Convert foreign currency at the time of import to a Base Currency (INR).
* **Chosen Option:** Option 2 (Convert at import).
* **Reasoning:** Keeps the Balance Engine computationally lightweight (single dimension).
* **Tradeoffs:** Exchange rates fluctuate. We lock in the exchange rate at import time. We mitigate this by storing `originalAmount` and `exchangeRate` for full auditability.

## 2. Duplicate Detection Strategy
* **Problem:** The CSV contains accidental double-entries (Row 5/6) and conflicting entries (Row 24/25).
* **Options Considered:**
  1. Reject duplicates silently.
  2. Flag all possible duplicates and halt the import entirely.
  3. Import as `PENDING` and attach an `Anomaly` flag for user resolution.
* **Chosen Option:** Option 3.
* **Reasoning:** Humans must arbitrate conflicts (e.g., Row 24/25 dispute).
* **Tradeoffs:** Increases user friction during import, but ensures absolute data integrity.

## 3. Membership Validation Strategy
* **Problem:** Members leave (Meera) or join (Sam) mid-timeline.
* **Options Considered:**
  1. Use the current group state for all historical math.
  2. Implement temporal memberships (`joinedAt`, `leftAt`).
* **Chosen Option:** Option 2.
* **Reasoning:** Row 36 includes Meera on April 2, but she left March 28. Using Option 1 would incorrectly split the debt 4 ways instead of 3.
* **Tradeoffs:** Increases the complexity of the Split Calculation Engine.

## 4. Approval Workflow
* **Problem:** Misclassified settlements or 110% math errors break accounting rules.
* **Chosen Option:** No imported expense alters the live ledger until `status` = `APPROVED`.
* **Reasoning:** Fulfills the "Explicit User Consent" requirement.

## 5. Unified Split Calculation Logic
* **Problem:** The `approval.routes.js` and `expense.controller.js` both need to generate `ExpenseSplits` from complex inputs (EQUAL, PERCENTAGE, SHARES, UNEQUAL).
* **Chosen Option:** Consolidate all math into `calculateSplits` within `split.service.js` and consume it in both routes.
* **Reasoning:** Prevents duplicated business logic and ensures that CSV imports follow the exact same rounding and remainder absorption rules as manually created expenses.
