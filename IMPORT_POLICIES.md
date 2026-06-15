# Import Policies & Anomaly Handling

The overarching philosophy for this import pipeline is **Explicit User Consent**. The assignment explicitly discourages silent guesses. Therefore, no imported row containing an anomaly should permanently alter the ledger without explicit manual approval.

## Import Philosophy
1. **Should balances change immediately?** No. All imported rows enter the system as `status: PENDING`. Balances are calculated exclusively from `APPROVED` expenses.
2. **Should balances wait for approval?** Yes. Anomalous rows sit in a staging queue where users review the detected anomaly, provide missing context, and explicitly click "Approve". Only then are balances updated.
3. **Should the row be rejected?** Rows with fatal parsing errors (e.g., completely corrupt data structure) are rejected immediately by the parser. Plausible but anomalous rows are flagged as `PENDING` with an `Anomaly` record attached, allowing the user to either fix and approve them, or explicitly delete them.

---

## 1. Missing Currency
**Candidate Row:** Row 28 (`15/03/2026, Groceries DMart, Priya, 2105,,...`)
**Detection Rule:** The `currency` field is null or empty.
**Auto-resolve?** No.
**Requires Approval?** Yes.
**Tradeoff Analysis:**
* *Fallback to INR (Silent Guess):* INR accounts for 38 out of 42 rows. While statistically likely, silently assuming INR violates the "no silent guesses" rule. If it was actually a USD expense, it would drastically corrupt balances.
* *Reject Row:* Too aggressive. The user probably just forgot to type the currency.
* *Group Default Currency + Approval:* **Recommended.** The system tentatively flags it with the group's default currency but requires the user to explicitly confirm it during the approval flow.

## 2. Duplicate Detection
**Candidate Rows:** 
* Exact Duplicate: Row 5 (`Dinner at Marina Bites, Dev, 3200`) vs Row 6 (`dinner - marina bites, Dev, 3200`).
* Conflicting Duplicate: Row 24 (`Dinner at Thalassa, Aisha, 2400`) vs Row 25 (`Thalassa dinner, Rohan, 2450`).
**Detection Rule:** Date difference ≤ 48 hours AND string similarity of `description` > 75%.
**Auto-resolve?** No.
**Requires Approval?** Yes.
**Reasoning:** Only humans can decipher conflicts. In Row 24/25, the notes explicitly mention a dispute ("Aisha also logged this I think hers is wrong"). The UI must present both rows side-by-side and force the user to pick one and discard the other.

## 3. Settlement Detection
**Candidate Rows:** 
* Row 14 (`Rohan paid Aisha back`, Rohan, 5000, `split_type` empty, `split_with` Aisha).
* Row 38 (`Sam deposit share`, Sam, 15000, `split_with` Aisha).
**Detection Rule:** `paid_by` is one user, `split_with` is exactly one other user AND (`split_type` is empty OR description contains keywords like "paid back", "deposit", "settlement").
**Auto-resolve?** No.
**Requires Approval?** Yes.
**Reasoning:** If treated as an expense, Rohan paying Aisha $5000 means Aisha owes Rohan $2500. Treated correctly as a settlement, Aisha's debt to Rohan is reduced by $5000. Because the math impact is inverted, misclassification is catastrophic. The user must confirm "Yes, this is a settlement."

## 4. Membership Violations
**Candidate Rows:**
* Row 36 (`02-04-2026, Groceries BigBasket, Meera included in split`). Meera left the group on March 28.
* Row 23 (`11-03-2026, Parasailing, Dev's friend Kabir`). Kabir is an unregistered ghost.
**Detection Rule:** A user in `split_with` does not match an active `GroupMember` during the transaction's `date`.
**Auto-resolve?** No.
**Requires Approval?** Yes.
**Reasoning:** For Row 36, the importer cannot silently drop Meera, because it would change the math (splitting by 3 instead of 4). The user must be asked: "Meera had left the group by April 2. Should we exclude her and recalculate, or was she temporarily visiting?"

## 5. Negative Amounts
**Candidate Row:** Row 26 (`Parasailing refund`, Dev, -30 USD).
**Detection Rule:** `amount` < 0.
**Auto-resolve?** No.
**Requires Approval?** Yes.
**Reasoning:** A negative expense acts as income or a debt reduction. A refund of 30 USD means Dev *owes* the group money, rather than the group owing Dev. The system will flag this as a `NEGATIVE_AMOUNT` anomaly and ask the user to explicitly confirm that the reverse-math is intended.

## 6. Percentage Errors
**Candidate Rows:** Row 15 (`Pizza Friday`) and Row 32 (`Weekend brunch`). Both specify `Aisha 30%; Rohan 30%; Priya 30%; Meera 20%` (Sum = 110%).
**Detection Rule:** `split_type` = percentage AND sum of percentages ≠ 100%.
**Auto-resolve?** No.
**Requires Approval?** Yes.
**Reasoning:** A 110% split means the database will create $110 of debt for a $100 expense, breaking the core double-entry accounting rule. The UI must block this row from being approved until the user manually adjusts the sliders to equal exactly 100%.
