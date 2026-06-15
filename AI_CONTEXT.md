# Splitwise Clone - Project Context

This document serves as the single source of truth for the project. It contains all agreed-upon requirements, architecture, schemas, UI/UX decisions, and implementation details.

## 1. Product Goals & Research
**Primary Goal:** Demonstrate a complete end-to-end expense-sharing application with a strong focus on backend business logic (expense splitting, balance calculation, and settlements). Correctness of financial calculations is the highest priority, along with a clean UI.

**Core Value Proposition ("Magic Moment"):**
Users can easily record shared expenses and instantly understand who owes whom and how much.

**Core Workflow:**
1. Create a group.
2. Add members.
3. Record expenses using different split methods.
4. Automatically calculate balances.
5. Record settlements and update balances.

## 2. Core Workflows & Personas
**Target Users:**
1. Roommates sharing rent, groceries, and utility bills.
2. Friends going on trips and splitting travel expenses.
3. Students sharing daily expenses.
4. Small groups managing common expenses.
*(Designed for small groups of 2-20 members)*

## 3. MVP Scope & Out-of-Scope

**In Scope:**
* User registration and login.
* Create, view, update, and delete groups.
* Add and remove members from groups.
* Create expenses within groups.
* Support four split methods: Equal, Unequal, Percentage, Share-based.
* View group balances.
* View personal balance summary across all groups.
* Record settlements/payments.
* Real-time chat within an expense using WebSockets.
* Responsive web interface.
* Relational database storage.

**Out of Scope:**
* Multi-currency support.
* Receipt scanning or OCR.
* Recurring expenses.
* Expense categories and analytics.
* Push notifications & Email invitations.
* Social login (Google, Facebook, etc.).
* Mobile applications & Offline support.
* File attachments.
* Advanced balance simplification algorithms.
* Audit logs and activity feeds.
* Production-grade authorization roles and permissions.

## 4. Data Model & Database Schema

**Key Decisions:**
* **Expenses & Payers:** Single payer per expense to simplify calculations and workflows.
* **Expense Splits:** Use a dedicated `ExpenseSplits` table to store exact calculated amounts for all split types. The logic is strictly unified under `split.service.js` which guarantees consistent math for both manual creation and CSV approvals.
* **Settlements:** Dedicated `Settlements` table distinct from expenses.
* **Expense Schema Improvements:** Included `title` (required), `description` (optional), and a strict `SplitMethod` enum for type safety.
* **Financial Data:** All monetary values are stored as `Decimal(10,2)`. Business logic rounds values to two decimal places before persistence. Floating-point storage is avoided for financial correctness.
* **Indexes:** Optimized with composite unique constraints and foreign key indexes.

**Prisma Schema:**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum SplitMethod {
  EQUAL
  UNEQUAL
  PERCENTAGE
  SHARES
}

model User {
  id           String         @id @default(uuid())
  email        String         @unique
  passwordHash String
  name         String
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  memberships  GroupMember[]
  expensesPaid Expense[]      @relation("ExpensePayer")
  expenseSplits ExpenseSplit[]
  paymentsMade Settlement[]   @relation("SettlementPayer")
  paymentsRcvd Settlement[]   @relation("SettlementPayee")
  messages     ChatMessage[]
}

model Group {
  id          String        @id @default(uuid())
  name        String
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  members     GroupMember[]
  expenses    Expense[]
  settlements Settlement[]
}

model GroupMember {
  id        String   @id @default(uuid())
  groupId   String
  userId    String
  joinedAt  DateTime @default(now())

  group     Group    @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([groupId, userId])
  @@index([groupId])
  @@index([userId])
}

model Expense {
  id          String         @id @default(uuid())
  groupId     String
  payerId     String
  amount      Decimal        @db.Decimal(10,2)
  title       String
  description String?
  splitMethod SplitMethod
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  group       Group          @relation(fields: [groupId], references: [id], onDelete: Cascade)
  payer       User           @relation("ExpensePayer", fields: [payerId], references: [id])
  splits      ExpenseSplit[]
  messages    ChatMessage[]

  @@index([groupId])
  @@index([payerId])
  @@index([createdAt])
}

model ExpenseSplit {
  id         String   @id @default(uuid())
  expenseId  String
  userId     String
  amountOwed Decimal  @db.Decimal(10,2)
  createdAt  DateTime @default(now())

  expense    Expense  @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  user       User     @relation(fields: [userId], references: [id])

  @@unique([expenseId, userId])
  @@index([expenseId])
  @@index([userId])
}

model Settlement {
  id        String   @id @default(uuid())
  groupId   String
  payerId   String
  payeeId   String
  amount    Decimal  @db.Decimal(10,2)
  createdAt DateTime @default(now())

  group     Group    @relation(fields: [groupId], references: [id], onDelete: Cascade)
  payer     User     @relation("SettlementPayer", fields: [payerId], references: [id])
  payee     User     @relation("SettlementPayee", fields: [payeeId], references: [id])

  @@index([groupId])
  @@index([payerId])
  @@index([payeeId])
}

model ChatMessage {
  id        String   @id @default(uuid())
  expenseId String
  userId    String
  content   String
  createdAt DateTime @default(now())

  expense   Expense  @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id])

  @@index([expenseId])
  @@index([createdAt])
}
```

## 5. Balance Calculation Algorithm
* **Algorithm:** Exact pairwise net balances.
* **Storage/Performance:** Calculated dynamically on-the-fly from Expenses, ExpenseSplits, and Settlements. No materialized balances table in the MVP.

## 6. Architecture & Tech Stack
* **Frontend:** React, Vite, React Router, Tailwind CSS, shadcn/ui.
* **Backend:** Node.js with Express.js.
* **Database & ORM:** PostgreSQL with Prisma.
* **Authentication:** Stateless JWT.
* **Real-time:** Socket.io for chat within expenses.

## 7. UI/UX, Routing & Authorization
**Authorization Rules (MVP):**
* Only authenticated users can access application routes.
* Only group members can view a group's expenses and balances.
* Any group member can create expenses or record settlements inside the group.
* No owner/admin role system is required.
* **Group Membership:** Users can only add existing registered users to a group (No email invitations, no pending states).

**Routes:**
* `/login`, `/register`, `/dashboard`, `/profile`
* `/groups`, `/groups/:id`
* `/expenses/create`, `/expenses/:expenseId`
* `/settlements/create`

Groups & Balances:
* `GET /api/groups`: List user's groups
* `POST /api/groups`: Create group
* `GET /api/groups/:id`: Group details (members, expenses)
* `POST /api/groups/:id/members`: Add user to group by email
* `DELETE /api/groups/:id/members/:userId`: Remove user from group
* `GET /api/groups/:id/balances`: List all pairwise nets for group
* `GET /api/balances`: Global net balances across all groups

Settlements:
* `POST /api/settlements`: Create a settlement (payment) between two users
* `GET /api/groups/:id/settlements`: List all historical settlements in group

Expense Chat:
* `POST /api/expenses/:id/messages`: Post a new message
* `GET /api/expenses/:id/messages`: Get historical messages for an expense

Socket.io Events:
* `join-expense`: Client joins room
* `send-message`: Client sends message
* `message-received`: Server broadcasts message to room

## 8. API Design & Authentication Flows
**Authentication Flows:**
1. **User Registration:** User sends credentials -> Backend validates & hashes password -> Returns User + JWT.
2. **User Login:** User sends credentials -> Backend verifies hash -> Returns User + JWT.
3. **Protected Route:** Client attaches `Authorization: Bearer <token>` -> Middleware verifies JWT -> Sets `req.user`.
4. **Token Validation & Hydration:** On boot, the client reads the `splitwise_auth` key from `localStorage` (which contains `{ token, user }`), immediately hydrates the React Context to prevent render blocking, and fires a background request to `GET /api/auth/me`. If validation fails, local storage is cleared and the user is redirected to login.
5. **Logout Flow:** Purely frontend-driven. Client deletes `splitwise_auth` from `localStorage` and clears React Context state.

**Security Decisions:**
* **Password Library:** `bcrypt`
* **Hashing Strategy:** 10 salt rounds (balances speed with security).
* **JWT Expiration:** 7 days (`7d`).
* **JWT Payload:** `{ id: user.id }`.
* **Secret Management:** Loaded via `process.env.JWT_SECRET`.
* **Error Handling:** 400 Bad Request for validation errors; 401 Unauthorized for bad tokens/credentials; 500 for server errors.

**Validation Rules:**
* **Name:** Required, not empty.
* **Email:** Required, must match basic regex format (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`).
* **Password:** Required, minimum 6 characters.

**API Contracts:**

#### `POST /api/auth/register`
**Request:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "securepassword123"
}
```
**Response (201 Created):**
```json
{
  "id": "uuid",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "token": "eyJhbG..."
}
```

#### `POST /api/auth/login`
**Request:**
```json
{
  "email": "jane@example.com",
  "password": "securepassword123"
}
```
**Response (200 OK):**
```json
{
  "id": "uuid",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "token": "eyJhbG..."
}
```

#### `GET /api/auth/me`
**Headers:** `Authorization: Bearer <token>`
**Response (200 OK):**
```json
{
  "id": "uuid",
  "name": "Jane Doe",
  "email": "jane@example.com"
}
```

## 9. Build Order
1. Project setup
2. Database schema
3. Authentication
4. Group management
5. Expense creation and split logic
6. Balance calculation engine
7. Settlement workflow
8. Expense chat (Socket.io)
9. Frontend integration
10. Testing
11. Deployment
12. Documentation updates

## 10. Deployment & Testing
* **Deployment Targets:** Vercel (Frontend), Render (Backend), Neon PostgreSQL (Database).
* **Database Setup:** Project Name: `ep-nameless-dream-aoc43vg5-pooler`.
* **Migration Commands:** `npx prisma migrate dev --name init`
* **Migration Issues & Workaround:** During the initial migration run, Prisma threw a `P1001` error (`Can't reach database server at ep-nameless-dream-aoc43vg5-pooler...`). The root cause is a development environment connectivity issue blocking external database access. To continue development, we are using a local Docker PostgreSQL container for development and migration verification. The production deployment target remains Neon PostgreSQL.
* **Testing Strategy:** Focus strictly on unit tests for the core split calculation and balance calculation logic. Conduct manual testing for complete user flows.

## 11. Risks & Tradeoffs
* **Floating-Point vs Decimal:** To ensure strict financial accuracy, all monetary amounts are stored using PostgreSQL `Decimal(10,2)`. This avoids JavaScript floating-point arithmetic errors. Remainder from Equal/Share-based splits is calculated accurately and absorbed by the payer.
* **WebSocket Disconnects:** Chat updates may be temporarily lost. Fallback to fetching messages on reload.
* **Dynamic Balances:** More DB work, but acceptable for MVP scale.
* **Concurrent Updates:** Minor risk of seeing stale data. Users must refresh after mutations.

## 12. Future Enhancements
* Multi-payer expenses
* Email invitations
* Debt simplification algorithm
* Expense attachments
* Notifications

## 13. Success Criteria
1. Register and log in.
2. Create a group.
3. Add members.
4. Add expenses using all four split methods.
5. View balances correctly.
6. Record settlements.
7. Use real-time expense chat.
8. Access the deployed application through a public URL.

## 14. Splitwise Feature Mapping & Alignment

### Detailed Workflow Mapping

1. **User Registration and Login**
   - **Splitwise:** Supports email/password, Google, Apple, and Facebook login. Can send invites to unregistered users.
   - **Our App:** Supports only email/password registration and login.
   - **Difference:** No social login; no invite links.
   - **Why Acceptable:** Social auth requires complex third-party configurations that bloat a 3-day MVP. Email/password is sufficient to establish identity.

2. **Dashboard Experience**
   - **Splitwise:** Shows total balance, "you owe", "you are owed", a list of friends with balances, and recent activity feed.
   - **Our App:** Shows total aggregate balance, list of user's groups, and recent expenses.
   - **Difference:** We focus heavily on Group context rather than 1-on-1 friendship balances outside of groups.
   - **Why Acceptable:** Scoping to Group-only balances dramatically simplifies the database architecture while preserving the core logic of expense splitting.

3. **Group Creation**
   - **Splitwise:** Users create a group, select a group type (Trip, Home, etc.), and add a photo.
   - **Our App:** Users create a group with just a Name.
   - **Difference:** No group types or photos.
   - **Why Acceptable:** Types and photos are purely cosmetic and do not affect the core financial algorithms.

4. **Group Membership Management**
   - **Splitwise:** Can invite via email/SMS. Users show up as "pending" until they sign up.
   - **Our App:** Users can only add *existing registered users* directly by email.
   - **Difference:** No pending invites or email integrations.
   - **Why Acceptable:** Sending emails and handling pending shadow-users introduces significant state complexity. For an MVP, assuming users sign up first is a practical constraint.

5. **Expense Creation**
   - **Splitwise:** Complex modal allowing multiple payers, image attachments, dates, categories, and varied split algorithms.
   - **Our App:** Single payer (the creator), title, amount, and four exact split methods.
   - **Difference:** Single payer only, no categories, no receipt attachments.
   - **Why Acceptable:** Multi-payer math is extremely edge-case heavy. Single payer covers 90% of real-world use cases (e.g., "I paid the dinner bill").

6. **Equal Split**
   - **Splitwise:** Splits the total evenly. If the total doesn't divide cleanly, one person gets the extra penny.
   - **Our App:** Splits evenly using `Decimal(10,2)`. The payer absorbs any 1-cent remainder to balance the books perfectly.
   - **Difference:** Handled similarly.
   - **Why Acceptable:** Identical core logic.

7. **Unequal Split**
   - **Splitwise:** Users manually type the exact currency amount each person owes. Total must match the expense total.
   - **Our App:** Users input exact amounts. Validation ensures the sum equals the total.
   - **Difference:** Handled similarly.
   - **Why Acceptable:** Identical core logic.

8. **Percentage Split**
   - **Splitwise:** Users enter percentages (must sum to 100%). App calculates precise currency amounts.
   - **Our App:** Exact same behavior.
   - **Difference:** Handled identically.
   - **Why Acceptable:** Identical core logic.

9. **Share-based Split**
   - **Splitwise:** Users assign abstract "shares" (e.g., 2 shares for Bob, 1 for Alice). App calculates weights.
   - **Our App:** Exact same behavior.
   - **Difference:** Handled identically.
   - **Why Acceptable:** Identical core logic.

10. **Expense History**
    - **Splitwise:** Global and group-specific chronological feeds of expenses, edits, and deletions.
    - **Our App:** Group-specific chronological list of expenses.
    - **Difference:** No global activity feed, no edit logs.
    - **Why Acceptable:** Building an audit log system is out of scope. A simple group ledger is sufficient.

11. **Group Balances**
    - **Splitwise:** Calculates exact "Who owes who" using an optional debt-simplification graph algorithm.
    - **Our App:** Calculates direct pairwise balances without graph simplification.
    - **Difference:** If A owes B $10, and B owes C $10, we don't automatically simplify to A owes C $10.
    - **Why Acceptable:** Debt simplification is a complex algorithmic feature (minimum edge weight matching in a directed graph) that is too risky for a 3-day MVP. Pairwise balances are mathematically correct and standard.

12. **Overall Balances**
    - **Splitwise:** Aggregates all group and non-group balances into a net positive/negative number.
    - **Our App:** Aggregates all group balances into a single net total on the Dashboard.
    - **Difference:** Handled similarly.
    - **Why Acceptable:** Identical core logic.

13. **Settlements**
    - **Splitwise:** Click "Settle Up", choose payer and payee, and record a cash payment or use Venmo integrations.
    - **Our App:** Click "Settle Up", choose payer and payee, record payment.
    - **Difference:** No third-party payment integrations.
    - **Why Acceptable:** Processing actual money is out of scope. 

14. **Expense Comments/Chat**
    - **Splitwise:** Users can comment on individual expenses.
    - **Our App:** Real-time Socket.io chat room tied to each expense.
    - **Difference:** Ours will be real-time.
    - **Why Acceptable:** Adds a "Wow" factor and demonstrates advanced full-stack skills beyond basic CRUD.

### Structural Alignments

**Dashboard Alignment**
Splitwise relies on a 3-column layout on the web (Left nav, Center feed, Right balances). Our app will use a modern, responsive layout: a prominent top header showing Net Balance, a list of Groups for navigation, and a feed of Recent Expenses. It will feel leaner but achieve the identical goal: giving users an instant snapshot of their financial standing.

**Group Page Alignment**
Splitwise places Expenses in the center column and a "Group Balances" block on the right. Our implementation will use a tabbed or side-by-side view (using shadcn/ui):
* **Expenses Tab:** The ledger of all transactions.
* **Balances Tab:** The pairwise breakdown of who owes whom.
* **Members Tab:** List of participants.
This aligns perfectly with user expectations while fitting better onto modern responsive screens.

**Expense Creation Alignment**
In Splitwise, creating an expense involves choosing a group, entering a description and amount, and opening a modal to toggle between =, %, and exact amounts. Our flow will mirror this precisely: a clean form where the user inputs Title and Amount, and then selects a Split Method (Equal, Exact, Percentage, Shares) which dynamically renders the split distribution fields beneath it. 

### MVP Feature Coverage Table

| Splitwise Feature | Our Implementation | Status |
| ----------------- | ------------------ | ------ |
| Registration / Auth | Email/Password JWT | Simplified |
| Social Login | None | Out of Scope |
| Group Management | Name only, add existing users | Simplified |
| Friendship (1-on-1) | Group-based only | Simplified |
| Expense Creation | Single payer, Title, Amount | Simplified |
| Equal Splits | Fully implemented, handles remainders | Fully Supported |
| Exact Splits | Fully implemented | Fully Supported |
| Percentage Splits | Fully implemented | Fully Supported |
| Share-based Splits| Fully implemented | Fully Supported |
| Group Balances | Pairwise aggregation | Fully Supported |
| Debt Simplification | None | Out of Scope |
| Settlements | Manual ledger entry | Fully Supported |
| Payment Integration | None | Out of Scope |
| Expense Chat | Real-time WebSockets | Fully Supported |

### Final Conclusion

**"If a Splitwise user opens our application, will they immediately understand how to use it and recognize the same core workflows?"**

Yes. A seasoned Splitwise user will instantly recognize the mechanics. They will create a group, add their friends, hit "Add Expense," enter a dollar amount, and select a split method (Equal, Percentage, etc.). When they navigate to the Group Balances view, they will see the familiar "User A owes User B $25.00" paradigm. While we have intentionally stripped away cosmetic bloat (like receipt scanning, social logins, and complex debt simplification graphs) to fit a 3-day timeline, the core "magic moment" of frictionless expense splitting and exact debt calculation remains 100% intact and recognizable.

## 15. Balance Calculation Engine

The balance engine utilizes a dynamic **Ledger Aggregation Process**.
Conceptually:
1. **Expenses create debt entries.**
2. **Settlements reduce debt entries.**
3. **Pairwise netting produces final balances.**

#### Example 1: Single Expense
**Expense:** A paid ₹300, split equally between A, B, and C.
**Generated ledger entries:**
* B → A: ₹100
* C → A: ₹100
**Final Balance Output:** B owes A ₹100, C owes A ₹100.

#### Example 2: Multiple Expenses (Pairwise Netting)
**Continuing from Example 1**, B pays ₹40, split between A and B (₹20 each).
**Generated ledger entries:**
* A → B: ₹20
**Intermediate Ledger State:** B → A: ₹100 | C → A: ₹100 | A → B: ₹20
**Pairwise Netting (B → A):** ₹100 - ₹20 = ₹80.
**Final Balance Output:** B owes A ₹80, C owes A ₹100.

#### Example 3: Expenses plus Settlement
**Continuing from Example 2**, B decides to pay back a portion of their debt and hands A ₹30 in cash.
**Generated adjustment:** B → A: -₹30
**Intermediate Ledger State (B → A):** ₹80 - ₹30 = ₹50.
**Final Balance Output:** B owes A ₹50, C owes A ₹100.
