# Build Plan & Folder Structure

## Project Folder Structure

We will use a standard monorepo-style folder structure, keeping the frontend and backend clearly separated but adjacent for easy full-stack development.

```text
splitwise-clone/
├── backend/
│   ├── package.json
│   ├── prisma/
│   │   └── schema.prisma        # Database schema
│   ├── src/
│   │   ├── index.js             # Entry point & Express setup
│   │   ├── config/              # Environment variables and DB connection
│   │   ├── controllers/         # Request handlers
│   │   ├── middleware/          # JWT auth, error handling
│   │   ├── routes/              # Express routers
│   │   ├── services/            # Core business logic (splits, balances)
│   │   ├── sockets/             # Socket.io event handlers
│   │   └── utils/               # Math/rounding helpers
│   └── tests/                   # Unit tests for core logic
│
├── frontend/
│   ├── package.json
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── src/
│   │   ├── App.jsx              # Routing setup
│   │   ├── main.jsx
│   │   ├── api/                 # Axios/Fetch setup and API calls
│   │   ├── components/          # Reusable UI components (shadcn)
│   │   ├── context/             # React Context for Auth state
│   │   ├── pages/               # Route components (Dashboard, Group Details, etc.)
│   │   ├── utils/               # Formatters, socket client setup
│   │   └── styles/              # Global CSS
│
├── AI_CONTEXT.md                # Single source of truth
└── BUILD_PLAN.md                # This file
```

## Architecture and Tradeoffs

1. **Financial Data Persistence:** We use `Decimal(10,2)` for all monetary data (Expenses, Splits, Settlements) to guarantee financial correctness. This prevents precision loss compared to standard IEEE 754 floats.
2. **Dynamic Balances:** Balances are calculated dynamically rather than stored in a materialized table to reduce write complexity in the MVP.
3. **Single Payer Limitations:** Expenses currently only allow one payer to dramatically reduce edge-case complexity.

## Detailed Task Breakdown

Below is the step-by-step task breakdown following the exact Build Order requested.

**1. Project setup**
- Initialize `backend/` with Node + Express.
- Initialize `frontend/` with Vite + React + Tailwind + shadcn/ui.

**2. Database schema**
- Setup DB connection in `.env`.
- Implement Prisma schema (including the new SplitMethod enum, title/description fields, and Decimal types).
- Run migrations (`npx prisma migrate dev`).

**3. Authentication**
- Backend: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`.
- Backend: JWT middleware.
- Frontend: AuthContext, Login, Register, ProtectedRoute.

**4. Group management**
- Backend: CRUD operations for Groups (`/api/groups`) + Members (`/api/groups/:id/members`).
- Backend: Apply Authorization checks.
- Frontend: Dashboard group list, Group Details page, Add Member UI.

**5. Expense creation and split logic**
- Backend: Split math logic using precise Decimal-friendly calculation.
- Backend: `POST /api/expenses` endpoint.
- Frontend: Create Expense Form.

**6. Balance calculation engine**
- Backend: Pairwise balance aggregation logic aggregating Decimal values correctly.
- Backend: `GET /api/groups/:id/balances` and `GET /api/balances` endpoints.
- Frontend: Display balances on Group Details and Dashboard.

**7. Settlement workflow**
- Backend: `POST /api/settlements`.
- Frontend: "Record a Payment" modal UI.

**8. Expense chat (Socket.io)**
- Backend: Initialize Socket.io server, handle rooms and DB storage.
- Frontend: Integrate Socket.io client in Expense details.

**9. Frontend integration**
- Polish UI, routing, state management.

**10. Testing**
- Backend unit tests for math. Manual E2E tests.

**11. Deployment**
- Deploy to Neon, Render, and Vercel.

**12. Documentation updates**
- Final updates to AI_CONTEXT.md and post-launch checklist.
