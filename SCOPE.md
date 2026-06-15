# Project Scope

This document tracks the explicit boundaries, rules, and known anomalies of the CSV import pipeline.

## Known Anomalies
* `DUPLICATE`: Exact match on amount, date ±48 hours, high string similarity.
* `DUPLICATE_CONFLICT`: Exact match on date, but differing amounts or payers.
* `FORMAT_ERROR`: Commas in numbers, trailing spaces, >2 decimal places.
* `MISSING_DATA`: Null currency, missing payer.
* `SETTLEMENT`: Single payer, single payee, `split_type` empty or notes imply payback.
* `MATH_ERROR`: Percentages sum to >100%.
* `MEMBER_UNKNOWN`: Split includes a user not in the system.
* `MEMBER_INACTIVE`: Split includes a user outside their active `joinedAt`-`leftAt` window.
* `NEGATIVE_AMOUNT`: Amount < 0 (Implies refund or reverse debt).
* `ZERO_AMOUNT`: Amount = 0 (Requires rejection/ignoring).
* `DATE_AMBIGUITY`: E.g., `04/05/2026` could be April 5 or May 4.
* `CONFLICTING_SPLIT`: `split_type` says equal, but `split_details` has shares.

## Handling Policies
* **No Silent Guesses:** All anomalies require user approval to modify balances.
* **Auto-Resolvable:** Minor `FORMAT_ERROR` (stripping commas, trailing spaces) and `MISSING_DATA` (falling back to Base Currency INR). Even auto-resolved items are flagged for review.

## Database Schema
* `Expense.status`: `PENDING`, `APPROVED`, `REJECTED`.
* `Expense.originalCurrency` & `exchangeRate`: For multi-currency conversion at import.
* `Expense.rawCSVRow`: Complete audit trail.
* `GroupMember.joinedAt` / `leftAt`: Temporal tracking.

## CSV Assumptions
* The CSV is comma-separated with a specific header row.
* Dates can be in multiple formats but are generally parseable by standard date libraries.

## Currency Assumptions
* The base currency is INR. 
* Exchange rates are statically applied at the time of import (e.g. 1 USD = 83 INR).
