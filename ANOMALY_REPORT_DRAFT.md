# Anomaly Report Draft

| Row | Description | Anomaly Type | Severity | Explanation | Proposed Handling |
|-----|-------------|--------------|----------|-------------|-------------------|
| 6 | dinner - marina bites | `DUPLICATE` | High | Matches Row 5 in date and amount (3200), title is highly similar. | Flag for manual review; default to reject one. |
| 7 | Electricity Feb | `FORMAT_ERROR` | Medium | Amount contains commas `"1,200"`. | Auto-resolve by stripping commas before parsing float. |
| 10 | Cylinder refill | `FORMAT_ERROR` | Low | Amount has 3 decimal places (`899.995`). | Auto-resolve by rounding to nearest two decimals. |
| 13 | House cleaning supplies | `MISSING_DATA` | High | `paid_by` is empty. | Flag for manual input. Cannot create expense without payer. |
| 14 | Rohan paid Aisha back | `SETTLEMENT` | High | Represents a debt repayment (5000), not a shared expense. `split_type` is empty. | Map to Settlement creation instead of Expense creation. |
| 15 | Pizza Friday | `MATH_ERROR` | High | Percentage split sums to 110%. | Flag for manual review/correction. Cannot auto-resolve securely. |
| 23 | Parasailing | `MEMBER_UNKNOWN` | Medium | `split_with` includes "Dev's friend Kabir" who is not a known member. | Create guest profile, or ask user to map to existing member. |
| 25 | Thalassa dinner | `DUPLICATE_CONFLICT` | High | Matches Row 24 (Dinner at Thalassa) on date, but amounts differ (2400 vs 2450) and payers differ (Aisha vs Rohan). Notes confirm dispute. | Flag both for manual user resolution. |
| 26 | Parasailing refund | `NEGATIVE_AMOUNT` | High | Amount is `-30 USD`. | Convert to a positive expense where payer = payee, or treat as income split. Manual review recommended. |
| 28 | Groceries DMart | `MISSING_DATA` | Medium | `currency` is null. | Auto-resolve by falling back to group's default currency (INR) and flagging. |
| 31 | Dinner order Swiggy | `ZERO_AMOUNT` | High | Amount is `0`. Note explicitly says "counted twice earlier - fixing later". | Reject/Ignore row completely. |
| 32 | Weekend brunch | `MATH_ERROR` | High | Percentage split sums to 110%. | Flag for manual review. |
| 34 | Deep cleaning service | `DATE_AMBIGUITY`| Medium | Date is `04/05/2026` but context is unclear if April 5 or May 4. | Infer from chronological surrounding rows (it's listed after March 28 but before April 1. Likely April 5, 2026). |
| 36 | Groceries BigBasket | `MEMBER_INACTIVE` | High | Meera is in `split_with` but left the group on March 28. | Flag for manual review (remove Meera or adjust timeline). |
| 38 | Sam deposit share | `SETTLEMENT` | High | Sam paid Aisha 15000 directly. | Map to Settlement. |
| 42 | Furniture for common room | `CONFLICTING_SPLIT`| Medium | `split_type` is equal, but `split_details` has shares. | Auto-resolve by honoring `split_details` over the `split_type` label, or flag for review. |
