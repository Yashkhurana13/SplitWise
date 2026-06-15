# AI Usage & Mistakes

## Overview
This document tracks the usage of AI tools during the architectural design and implementation phases, specifically highlighting instances where the AI generated incorrect assumptions that required correction.

## Documented AI Mistakes

### Mistake 1: Original Splitwise-Only Architecture
* **What AI Suggested:** Building a simple real-time UI clone of Splitwise with a static database schema that assumed expenses were immediately valid upon creation.
* **Why it was wrong:** It ignored the assignment's explicit requirements for an anomaly detection pipeline and approval workflow. Real-world CSV imports are inherently messy and require staging.
* **How it was detected:** The user halted UI development and forced a Gap Analysis.
* **What was changed:** The database schema was completely overhauled to include a `PENDING` state and an `Anomaly` tracking system.

### Mistake 2: Currency Assumptions
* **What AI Suggested:** In the initial Gap Analysis, the AI proposed silently falling back to INR for missing currencies (Row 28) because 90% of rows were INR.
* **Why it was wrong:** This violated the explicit "No Silent Guesses" philosophy requested by the assignment.
* **How it was detected:** The user specifically reviewed the Gap Analysis and rejected the "Silent Guess" proposal.
* **What was changed:** The policy was updated in `IMPORT_POLICIES.md` to tentatively flag the fallback, but explicitly require manual user confirmation before approval.

### Mistake 3: Membership Model Assumptions
* **What AI Suggested:** The original `GroupMember` schema only tracked who was currently in the group via a simple many-to-many join table.
* **Why it was wrong:** It failed to account for historical timeline math. If Meera left in March, an April expense shouldn't automatically split with her just because the CSV erroneously included her.
* **How it was detected:** The user forced the AI to build a `MEMBERSHIP_TIMELINE.md` based strictly on the CSV data, which revealed Meera leaving and Sam joining.
* **What was changed:** The schema was updated to include `joinedAt` and `leftAt` timestamps to validate the chronicity of splits.
