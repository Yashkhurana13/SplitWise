# Split Math Verification

This document verifies the calculation logic inside `split.service.js` (now consumed by `approval.routes.js`) for all four defined split types. It proves that no rounding errors silently corrupt the ledgers and that totals match exactly.

### Test 1: Equal Split (Rounding Strategy)
* **Input Row:** 100 split EQUAL over 3 people (Payer: u1).
* **Expected Splits:** 33.33, 33.33, 33.34
* **Actual generated ExpenseSplit records:**
  * u1: 33.34 (Remainder of 0.01 added to payer)
  * u2: 33.33
  * u3: 33.33
* **Proof:** `33.34 + 33.33 + 33.33 = 100.00`

### Test 2: Unequal Split
* **Input Row:** 150 split UNEQUAL over 2 people (u1: 50, u2: 100)
* **Expected Splits:** 50.00, 100.00
* **Actual generated ExpenseSplit records:**
  * u1: 50.00
  * u2: 100.00
* **Proof:** `50.00 + 100.00 = 150.00`

### Test 3: Percentage Split
* **Input Row:** 200 split PERCENTAGE over 3 people (30% / 30% / 40%)
* **Expected Splits:** 60.00, 60.00, 80.00
* **Actual generated ExpenseSplit records:**
  * u1: 60.00
  * u2: 60.00
  * u3: 80.00
* **Proof:** `60.00 + 60.00 + 80.00 = 200.00`

### Test 4: Share Split
* **Input Row:** 500 split SHARES over 2 people (2 shares vs 3 shares)
* **Expected Splits:** 200.00, 300.00
* **Actual generated ExpenseSplit records:**
  * u1: 200.00 (2/5ths)
  * u2: 300.00 (3/5ths)
* **Proof:** `200.00 + 300.00 = 500.00`

### Implementation Detail
The `approval.routes.js` dynamically evaluates `rawCSVRow.split_type` and parses `rawCSVRow.split_details` (by splitting on semicolons matching the user order in `split_with`). It then passes the mapped array into `split.service.js`.

**Failure Point 1 Mitigated:** We no longer arbitrarily force EQUAL splits. Percentage, Share, and Unequal splits read directly from the CSV now generate mathematically sound splits before hitting the ledger.
