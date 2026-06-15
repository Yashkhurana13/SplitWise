# Currency Analysis

### Currencies Present
1. **INR (Indian Rupee):** The primary operating currency for the group. Accounts for 38 out of 42 valid transaction rows.
2. **USD (US Dollar):** Accounts for 3 transactions (Goa villa booking, Beach shack lunch, Parasailing).
3. **NULL/Empty:** Accounts for 1 transaction (Groceries DMart - Row 28).

### Affected Expenses
* Row 20: `Goa villa booking` (540 USD)
* Row 21: `Beach shack lunch` (84 USD)
* Row 23: `Parasailing` (150 USD)
* Row 26: `Parasailing refund` (-30 USD)

### Proposed Currency Strategy

**1. Default/Base Currency**
* The group must have a defined "Base Currency" (which is clearly INR).
* Missing currencies (Row 28) should implicitly default to the group's Base Currency.

**2. Conversion Strategy**
Splitwise relies on calculating net debts in a single base currency per group. We have two options:
* **Option A (Static Exchange Rates):** For the scope of this assignment, we maintain a static hardcoded exchange rate mapping in the parser (e.g., `1 USD = 83 INR`). Foreign amounts are converted to INR *at the time of import*. Balances are tracked purely in INR.
* **Option B (Multi-Currency Balances):** Do not convert. Track that "Aisha owes Dev 50 USD" AND "Dev owes Aisha 2000 INR" separately. This adds immense complexity to the Balance Engine.

**Recommendation:** Option A (Conversion at Import) is significantly more resilient and prevents the Balance Engine from becoming a multi-dimensional matrix. During the `POST /api/import` phase, any `USD` expense is parsed, converted to `INR` via an `ExchangeRateService`, and stored. The original amount and currency can be saved in `originalAmount` and `originalCurrency` columns for audit purposes.
