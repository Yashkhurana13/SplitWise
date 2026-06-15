# Splitwise Clone & CSV Import System

## Project Overview
This is a comprehensive Shared Expenses Application featuring a rigorous CSV Import System, Anomaly Detection Engine, and a transparent Approval Workflow. It models complex financial interactions, foreign currencies, and temporal group memberships.

## Problem Statement
Importing external financial data (like bank CSVs) into a shared expense ledger is inherently messy. Silent failures, math errors (e.g., 110% percentages), duplicates, and mid-ledger membership changes can corrupt financial trust. This system solves that by enforcing a strict "No Silent Guesses" philosophy.

## Features
* **CSV Import Engine:** Parses arbitrary formats with heuristic sanitization.
* **Anomaly Detection Pipeline:** Flags Duplicates, Formatting Errors, Membership Violations, and Settlements.
* **Approval Workflow:** Staging queue (`PENDING`) that blocks ledger corruption until explicit user consent.
* **Historical Membership Tracking:** Validates splits against exact `joinedAt` and `leftAt` dates.
* **Multi-Currency Support:** Evaluates non-base currencies against historical exchange rates.
* **Traceability:** Full audit trail tracking every balance down to the raw CSV string.

## Architecture & Tech Stack
* **Frontend:** React (Vite), Tailwind CSS v4, Socket.io-client.
* **Backend:** Node.js, Express, Socket.io.
* **Database:** PostgreSQL (via Neon) + Prisma ORM.

## Database Schema
The schema heavily relies on:
* `Expense`: Extended with `status`, `originalAmount`, `originalCurrency`, `exchangeRate`, and `rawCSVRow`.
* `GroupMember`: Extended with `joinedAt` and `leftAt` timestamps.
* `ImportJob`: Tracks the state of a bulk import.
* `Anomaly`: Attaches to `Expense` to block ledger updates until resolved.

## Environment Variables
* `DATABASE_URL`: PostgreSQL connection string.
* `JWT_SECRET`: Secret for user authentication.

## Local Setup
1. `cd backend && npm install && npx prisma db push`
2. `npm run dev`
3. `cd frontend && npm install && npm run dev`

## CSV Import Flow
1. User uploads a CSV.
2. `ImportJob` created. Parser processes rows.
3. Anomaly Engine flags issues (saving rows as `PENDING`).
4. UI presents Anomaly Queue.
5. User resolves/approves rows.
6. Rows become `APPROVED`, updating global balances.

## Deployment Instructions
(To be updated during final deployment phase)

## Known Limitations
* Exchange rates are currently statically mocked during import.
* Percentage splits exceeding 100% block approval; no auto-rebalancer exists.
