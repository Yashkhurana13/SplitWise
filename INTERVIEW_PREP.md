# Interview Preparation Guide

This document prepares you to defend every architectural decision, anomaly rule, and schema choice during your 45-minute technical review session.

## Core Philosophy (The "Hook")
If asked broadly about the project, start with your core philosophy:
**"My architecture revolves around Explicit User Consent. Financial ledgers are sacred; therefore, I built an anomaly engine and a staging queue (PENDING state) to guarantee that no dirty CSV data ever silently corrupts live balances."**

---

## Technical & Architectural Questions (1-10)

**1. Why did you choose to convert USD to INR at the time of import instead of storing it natively and calculating balances dynamically?**
*Answer:* I chose import-time conversion because it allows the core Balance Engine to remain a lightweight, single-dimensional graph calculation. Storing historical fluctuations complicates pairwise netting. *Tradeoff:* We lock in the exchange rate at the time of import. *Defense:* We maintain perfect auditability by storing `originalAmount`, `originalCurrency`, and `exchangeRate` directly on the `Expense` model.

**2. Why did you add a `status` field (`PENDING`/`APPROVED`) to `Expense` rather than having a separate `ImportStaging` table?**
*Answer:* Using a `status` field keeps the data model DRY. An `Expense` is semantically an expense whether it's pending human review or fully approved. It also allows the `ImportReportModal` to seamlessly transition rows into the live ledger without heavy data migrations between tables. 

**3. Explain how your Balance Engine calculates "Who owes whom".**
*Answer:* The engine aggregates all `ExpenseSplit` records (debts) and `Settlement` records (payments). It computes the net positional balance for every user relative to every other user using Pairwise Netting, resulting in a directed acyclic graph of minimal transactions. Crucially, it only selects `Expense` rows where `status === 'APPROVED'`.

**4. How does the system handle Meera leaving the group on March 28th?**
*Answer:* The `GroupMember` schema tracks `joinedAt` and `leftAt`. If an April expense names Meera, the Anomaly Engine intercepts the discrepancy by checking the transaction timestamp against her membership window. It throws a `MEMBER_INACTIVE` flag, forcing human intervention.

**5. Rohan wants perfect traceability. How did you provide it?**
*Answer:* Every `Expense` record points to an `importJobId` and stores the `rawCSVRow` as JSON. A final balance traces down to an `ExpenseSplit`, which traces back to the `Expense`, which traces back to the exact unadulterated string uploaded from the CSV.

**6. Why does `ExpenseSplit` generation happen during Approval instead of Parsing?**
*Answer:* Generating splits during parsing creates massive database churn for rows that might ultimately be rejected. Generating them upon `APPROVE` ensures the ledger is only populated with mathematically verified data (e.g., preventing 110% math errors from entering the DB).

**7. How do you distinguish between a Shared Expense and a Settlement in a flat CSV?**
*Answer:* Heuristics in the `anomalyEngineService`. If `paid_by` is one user, `split_with` is exactly one user, and either `split_type` is empty or the description contains keywords like "paid back", we flag it as `SETTLEMENT`. 

**8. If it's flagged as a Settlement, how is it resolved?**
*Answer:* The user clicks "Convert to Settlement". The API marks the staged `Expense` as `REJECTED`, and simultaneously creates a pure `Settlement` model record. The Balance Engine respects this natively.

**9. What happens if the CSV has a 110% percentage split?**
*Answer:* The Anomaly Engine parses the string, sums the floats, and flags `MATH_ERROR`. It is impossible for this to silently corrupt the ledger. The user must manually override the amount or reject the row.

**10. Why did you choose React + Vite over Next.js for this?**
*Answer:* Because the primary complexity is client-side state management (the Import Report queue) rather than SEO or server-side rendering. A Single Page Application fits the rich, interactive "modal queue" requirement better.

---

## Anomaly Defense Questions (11-20)

**11. Why flag missing currencies instead of assuming the Base Currency?**
*Answer:* "No Silent Guesses." Assuming INR because 90% of rows are INR could lead to catastrophic math errors if an unnoticed row was actually GBP. We stage it as `MISSING_DATA` so the user explicitly approves the INR fallback.

**12. How do you detect duplicates?**
*Answer:* I use a multi-pass approach. First, check against the DB. Second, check against previously parsed rows in the same file. The heuristic demands the amount is within a small delta, the time is within 48 hours, and a Levenshtein/Jaccard similarity on the description > 0.6.

**13. Why did you flag Row 26 (Parasailing refund, -30 USD) instead of just processing it?**
*Answer:* Negative amounts reverse the flow of debt. It implies Dev owes the group, not the group owing Dev. Because this fundamentally changes the math, I built an explicit `NEGATIVE_AMOUNT` anomaly to ensure the user confirms the reversal.

**14. What happens when a CSV row says "Split EQUAL" but then provides percentage details?**
*Answer:* `CONFLICTING_SPLIT` anomaly. The parser caught the discrepancy between intent and data.

**15. If a user clicks "Reject & Delete" on a duplicate, is the data lost?**
*Answer:* No. The `Expense` status simply changes to `REJECTED`. The `rawCSVRow` and `importJobId` remain intact for the audit trail. Meera's requirement for "nothing permanently lost" is preserved.

**16. How did you implement real-time Chat for expenses?**
*Answer:* Socket.io attached to Expense IDs acting as room names. Every emitted message is also persisted to PostgreSQL.

**17. What happens if a file upload fails mid-way?**
*Answer:* The `ImportJob` model starts in `PARSING` status. If `csv-parse` throws an unrecoverable format error, the job flips to `FAILED` and no partial data enters the ledger.

**18. Why use Prisma instead of Raw SQL?**
*Answer:* Prisma's schema enforceability and type safety in TypeScript/JS drastically reduces runtime errors when handling complex, relational ledger data (User -> GroupMember -> Expense -> Split -> Anomaly).

**19. How did you structure your CSS architecture?**
*Answer:* Tailwind CSS v4 to enforce Splitwise's specific color variables (`--color-brand`, `--color-debt`) across standard layout grids.

**20. Could the Anomaly Engine be abused to upload millions of rows and DOS the server?**
*Answer:* Currently, yes, as there's no row limit. *Tradeoff:* For a production system, I'd move the parser into a background worker (e.g., BullMQ) rather than processing it inline during the POST request.

---

## Scenario & "What If" Questions (21-25)

**21. What if two users upload the exact same CSV file at the same time?**
*Answer:* Two `ImportJobs` are created. The second one will immediately flag every row as a `DUPLICATE` of the first job's PENDING rows due to my cross-referencing logic in the Anomaly Engine.

**22. How would you handle a Group default currency if requested?**
*Answer:* Add `defaultCurrency` to the `Group` model. The `csvParserService` would then pass this group default into the Anomaly Engine instead of hardcoding 'INR'.

**23. What if Rohan wants to edit an APPROVED expense?**
*Answer:* Because splits are already generated, we would need to delete the associated `ExpenseSplit` records, revert the Expense to `PENDING`, allow the edit, and re-run the split generation.

**24. What happens if you need to scale this to 100,000 groups?**
*Answer:* The Balance Engine calculating everything on-the-fly would become a bottleneck. We would need to implement a materialized view or a running balance cache that updates only when an `Expense` transitions to `APPROVED`.

**25. What is the weakest part of your architecture right now?**
*Answer:* The lack of an auto-rebalancing engine for percentage splits that don't equal 100%. Currently, it blocks the user, forcing them to do math. A robust system would offer a "Normalize to 100%" auto-fix button in the UI.
