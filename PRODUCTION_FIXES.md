# Production Fixes

*Date: 2026-06-15*

This document catalogs every granular fix deployed to resolve the EC2 production routing failures discovered during the Production Bug Audit. Each fix guarantees that the frontend can dynamically locate the API backend, regardless of whether it is running on a local development laptop or the Nginx production server.

---

### Bug 1: Hardcoded API Gateway
* **Root Cause:** The core Axios/Fetch wrapper `apiCall` had a hardcoded `const API_URL = 'http://localhost:5001/api';`, redirecting all production fetch requests (Login, Register, Dashboard) into the void.
* **Files Modified:** `frontend/src/lib/api.js`
* **Exact Fix:** Introduced Vite environment variables with a relative fallback.
  ```javascript
  const API_URL = import.meta.env.VITE_API_URL || '/api';
  ```
* **Verification:** `npm run build` confirms `import.meta.env` is properly transpiled.

---

### Bug 2: Hardcoded File Upload Route
* **Root Cause:** The CSV Import handler bypassed the global `apiCall` wrapper to use `fetch` natively for `multipart/form-data`, but explicitly hardcoded `http://localhost:5001/api/import/${id}`.
* **Files Modified:** `frontend/src/pages/GroupDetails.jsx`
* **Exact Fix:** Removed the localhost string and injected the dynamic URL.
  ```javascript
  const API_URL = import.meta.env.VITE_API_URL || '/api';
  const res = await fetch(`${API_URL}/import/${id}`, { ... });
  ```
* **Verification:** Inspecting `dist/assets` bundle confirms the `http://localhost:5001` string has been entirely eradicated from the GroupDetails chunk.

---

### Bug 3: WebSocket Connection Failure
* **Root Cause:** Socket.io client instances for real-time chat explicitly instantiated connections using `io('http://localhost:5001')`.
* **Files Modified:** 
  * `frontend/src/pages/ExpenseDetails.jsx`
  * `frontend/src/components/ExpenseDetailsModal.jsx`
* **Exact Fix:** Implemented a fallback chain `import.meta.env.VITE_SOCKET_URL || window.location.origin`. In production, this correctly binds WebSockets to the `wss://splitwise.yashkhurana.dev` domain.
  ```javascript
  socketRef.current = io(import.meta.env.VITE_SOCKET_URL || window.location.origin);
  ```
* **Verification:** Reviewing the Socket hook implementations confirms the dynamic binding.

---

### Bug 4: Missing Environment Configurations
* **Root Cause:** Lack of documentation regarding Vite's build-time variables guarantees future deployments will crash without warning.
* **Files Modified:** `frontend/.env.example` [NEW]
* **Exact Fix:** Authored a configuration template outlining how to target the API on AWS EC2.
* **Verification:** File exists in repository root.

---

### Commit History
All fixes have been securely pushed to GitHub bypassing bulk-commits:

* `e528934` - fix(api): remove hardcoded localhost API URL for production deployment
* `3037872` - fix(upload): remove hardcoded localhost from CSV import fetch
* `3d4b0ef` - fix(sockets): remove hardcoded localhost from websocket initialization
* `eab6a98` - chore(config): add .env.example template for production deployments
