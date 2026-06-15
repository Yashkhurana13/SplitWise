# Top 20 Interview Questions & Answers

This document prepares you for a 45-minute live technical review.

## Architecture & Philosophy

**1. What is the core philosophy of your Import System?**
*Answer:* "No Silent Guesses." I prioritized data integrity over UX convenience. The system operates on a staging queue—every imported row is marked `PENDING` and must be explicitly approved before any live `ExpenseSplit` records or balances are touched.

**2. Why did you use Prisma instead of Raw SQL?**
*Answer:* Prisma’s strict typing prevented massive headaches when dealing with complex relational boundaries (User -> GroupMember -> Expense -> Split). It also provides built-in connection pooling (`pgbouncer=true`) which is vital when deploying to a serverless DB like Neon.

**3. Why use a Single Page Application (React/Vite) instead of SSR (Next.js)?**
*Answer:* The primary complexity is client-side state management (the Import Report queue and interactive resolution modals). SEO is irrelevant for an authenticated financial dashboard.

## Import Pipeline & Anomalies

**4. How do you ensure Traceability (Rohan's Requirement)?**
*Answer:* I added a `rawCSVRow` JSON field to the `Expense` model. If Rohan disputes a balance, I query his `ExpenseSplit` -> the parent `Expense` -> and extract the exact unadulterated string uploaded from the CSV. The chain is unbreakable.

**5. How do you handle Meera leaving the group? (Temporal Membership)**
*Answer:* The `GroupMember` model tracks `joinedAt` and `leftAt`. If the CSV contains an expense dated *after* Meera's `leftAt` date but lists her in `split_with`, the Anomaly Engine intercepts it and throws a `MEMBER_INACTIVE` flag.

**6. What happens if I click "Approve Anyway" on a row with an unknown ghost user (Kabir)?**
*Answer:* The backend API explicitly blocks the request with a 400 Bad Request. I refuse to silently strip Kabir and redistribute his debt onto the valid members, as that corrupts the financial intent of the row.

**7. How exactly do you detect duplicates? (Meera's Requirement)**
*Answer:* The Anomaly Engine does a multi-pass check against the DB and the current file. If the timestamp is within 48 hours and the amounts are close, it calculates a String Similarity score (Jaccard/Levenshtein). If similarity > 0.6, it flags `DUPLICATE`.

**8. If I reject a duplicate, is the data lost permanently?**
*Answer:* No. It simply flips the status from `PENDING` to `REJECTED`. The original parsed data and `rawCSVRow` remain in the database for the audit trail.

**9. How do you detect a Settlement vs an Expense in a flat CSV?**
*Answer:* Heuristics. If `paid_by` is one user, `split_with` is exactly one user, and either `split_type` is empty or the description contains keywords like "paid back", we flag it as `SETTLEMENT`.

**10. How does a Settlement resolve if I approve it?**
*Answer:* The UI has a "Convert to Settlement" button. The backend marks the staged Expense as `REJECTED`, creates a pure `Settlement` record, and the Balance Engine ingests it seamlessly.

## Mathematical Core

**11. How do you calculate percentages and shares?**
*Answer:* I built a unified `split.service.js` consumed by both manual inputs and the CSV approval route. It processes `EQUAL`, `UNEQUAL`, `PERCENTAGE`, and `SHARES`, rounds to 2 decimal places, and critically, calculates the exact remainder and assigns the leftover pennies to the Payer to ensure the splits perfectly equal the total amount.

**12. What happens if a CSV row claims 110% total percentage?**
*Answer:* The parser catches it, sums it, and flags `MATH_ERROR`. It is staged. You cannot approve it until the math is overridden to equal 100%.

**13. Why convert USD to INR statically at import?**
*Answer:* To keep the live Balance Engine O(N) and single-dimensional. Storing historical fluctuations complicates pairwise netting. The tradeoff is locked exchange rates, but we preserve the `originalAmount` and `originalCurrency` on the Expense for auditing.

**14. Explain your Balance Engine. (Aisha's "One Number" Requirement)**
*Answer:* It builds a directed graph. It iterates over all `APPROVED` ExpenseSplits (edges of debt) and Settlements (edges of payment), and calculates the absolute pairwise net between every two users in a group. The frontend then aggregates these to show a global "You Owe" or "You are Owed".

## Deployment & Security

**15. How did you lock down CORS?**
*Answer:* Removed the `origin: '*'` wildcard from Express and Socket.io, restricting them strictly to `https://splitwise.yashkhurana.dev`. 

**16. How do you deploy this?**
*Answer:* Nginx acts as a reverse proxy, routing `/api/` and `/socket.io/` to a PM2-managed Node process on port 5001. The React app is built statically via Vite and served directly by Nginx at the root block.

**17. What happens if the server crashes mid-import?**
*Answer:* The `ImportJob` model stays in `PARSING` status. Since no rows are automatically pushed to the live ledger, financial data is never corrupted by a half-finished job.

**18. What is the weakest part of your architecture?**
*Answer:* The lack of an auto-rebalancing engine for percentage splits that don't equal 100%. Currently, it blocks the user, forcing them to manually reject or edit. A robust system would offer an "Auto-Normalize to 100%" button.

**19. Could someone upload a 10-million row CSV and crash the server?**
*Answer:* Yes. Currently, parsing happens inline on the POST request. A true production system would push the file to S3 and process it asynchronously using a worker queue like BullMQ.

**20. If you had one more week, what would you add?**
*Answer:* A live exchange rate API integration (e.g., Fixer.io) querying historical rates based on the CSV row's `date` timestamp.
