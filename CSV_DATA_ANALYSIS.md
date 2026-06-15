# CSV Data Analysis

## Overview
* **Total Rows:** 43 (including header)
* **Total Columns:** 9
* **Column Names:** `date`, `description`, `paid_by`, `amount`, `currency`, `split_type`, `split_with`, `split_details`, `notes`

## Column Analysis

### 1. date
* **Type:** String (representing dates)
* **Example Values:** `2026-02-01`, `01/03/2026`, `Mar 14`
* **Data Quality Issues:** High inconsistency. Mixing `YYYY-MM-DD`, `DD/MM/YYYY`, and textual formats (`Mar 14`). Ambiguity exists (e.g., `04/05/2026` noted as "is this April 5 or May 4?").
* **Missing Values:** None.

### 2. description
* **Type:** String
* **Example Values:** `February rent`, `Dinner at Marina Bites`
* **Data Quality Issues:** Case inconsistency (`Dinner at Marina Bites` vs `dinner - marina bites`).
* **Missing Values:** None.

### 3. paid_by
* **Type:** String
* **Example Values:** `Aisha`, `priya`, `Priya S`, `rohan `
* **Data Quality Issues:** Case sensitivity (`priya`), trailing spaces (`rohan `), variations (`Priya S` vs `Priya`).
* **Missing Values:** 1 row (Row 13: `House cleaning supplies` has no `paid_by`).

### 4. amount
* **Type:** Numeric / String
* **Example Values:** `48000`, `"1,200"`, `899.995`, ` 1450 `, `-30`
* **Data Quality Issues:** Comma-separated thousands (`"1,200"`), leading/trailing spaces (` 1450 `), excessive decimals (`899.995`), negative amounts (`-30`), zero amounts (`0`).
* **Missing Values:** None.

### 5. currency
* **Type:** String
* **Example Values:** `INR`, `USD`
* **Data Quality Issues:** None specific to the values present.
* **Missing Values:** 1 row (Row 28: `Groceries DMart` has an empty currency field).

### 6. split_type
* **Type:** Enum (equal, unequal, percentage, share)
* **Example Values:** `equal`, `unequal`, `percentage`, `share`
* **Data Quality Issues:** Row 42 claims `equal` but provides share-based `split_details`.
* **Missing Values:** 1 row (Row 14: `Rohan paid Aisha back` is a settlement).

### 7. split_with
* **Type:** Semicolon-separated String
* **Example Values:** `"Aisha;Rohan;Priya;Meera"`
* **Data Quality Issues:** Extraneous non-group members included on the fly (e.g., `Dev's friend Kabir`). Members included who had already left (e.g., `Meera` included in April).
* **Missing Values:** None.

### 8. split_details
* **Type:** Semicolon-separated String
* **Example Values:** `"Aisha 30%; Rohan 30%; Priya 30%; Meera 20%"`
* **Data Quality Issues:** Mathematical errors (percentages sum to 110%). 
* **Missing Values:** Present heavily for `equal` splits (which is acceptable).

### 9. notes
* **Type:** String
* **Example Values:** `Dev visiting for the weekend`, `this is a settlement not an expense??`
* **Data Quality Issues:** None, entirely freeform text.
* **Missing Values:** Heavily missing (which is acceptable).
