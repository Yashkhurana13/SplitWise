# Production Bug Audit

*Date: 2026-06-15*

This document provides a comprehensive debugging audit of the application as deployed on AWS EC2 (`https://splitwise.yashkhurana.dev`). The application was reported as "completely broken" in production despite functioning locally.

## Phase 1: Frontend Build Verification

**Objective:** Verify that the frontend compiles correctly and variables are injected.

* **npm run build succeeds:** Pass. (Verified Vite 8 build with Tailwind v4 succeeds).
* **dist files exist:** Pass.
* **CSS files exist:** Pass. (Tailwind `@tailwindcss/vite` plugin correctly compiles CSS).
* **JS bundle exists:** Pass.
* **Vite environment variables are correct:** **FAIL**. The repository contains absolutely no `.env` or `.env.production` files. 
* **API base URL is correct:** **CRITICAL FAIL**. The `frontend/src/lib/api.js` file hardcodes `const API_URL = 'http://localhost:5001/api';`.

**Conclusion:** When the compiled static bundle is served by Nginx on the EC2 instance, the user's browser executes the JavaScript locally. Because the API URL is hardcoded to `localhost`, the user's browser attempts to connect to port 5001 on *their own laptop/phone*, not the AWS server. This immediately blocks all network traffic.

---

## Phase 2: Frontend Runtime Verification

**Objective:** Trace every major user flow in the production environment.

| Flow | Frontend Route | API Endpoint | Expected Response | Actual Response | Status |
|------|----------------|--------------|-------------------|-----------------|--------|
| Register | `/register` | `POST /api/auth/register` | `201 Created` | `ERR_CONNECTION_REFUSED` | **FAIL** |
| Login | `/login` | `POST /api/auth/login` | `200 OK { token }` | `ERR_CONNECTION_REFUSED` | **FAIL** |
| Persist Session | `/dashboard` | `GET /api/auth/me` | `200 OK { user }` | `ERR_CONNECTION_REFUSED` | **FAIL** |
| Create Group | N/A (Sidebar) | `POST /api/groups` | `201 Created` | `ERR_CONNECTION_REFUSED` | **FAIL** |
| View Groups | `/dashboard` | `GET /api/groups` | `200 OK [ groups ]` | `ERR_CONNECTION_REFUSED` | **FAIL** |
| Import CSV | `/groups/:id` | `POST /api/import/:id` | `200 OK { report }` | `ERR_CONNECTION_REFUSED` | **FAIL** |
| Settle Up | `/groups/:id` | `POST /api/groups/:id/settlements` | `200 OK` | `ERR_CONNECTION_REFUSED` | **FAIL** |

**Conclusion:** Every single flow fails because the API gateway routing is pointing to the user's local machine.

---

## Phase 3: Browser Console Audit

A simulated execution of the production bundle reveals the following browser console exceptions:

* **Failed API requests:**
  * `POST http://localhost:5001/api/auth/login net::ERR_CONNECTION_REFUSED`
  * `POST http://localhost:5001/api/import/uuid net::ERR_CONNECTION_REFUSED`
* **Socket.io errors:**
  * `WebSocket connection to 'ws://localhost:5001/socket.io/?EIO=4&transport=websocket' failed`
* **Routing errors:**
  * Since `GET /api/auth/me` fails, `AuthContext` forces an infinite loop back to the `/login` screen or causes a white screen if unhandled in protected child routes.

---

## Phase 4: Network Audit

* **Frontend domain:** `https://splitwise.yashkhurana.dev`
* **Backend domain:** Hosted on same EC2, theoretically proxied via Nginx.
* **API forwarding (`/api/*`):** Defeated by client-side `localhost` hardcoding. The requests never even reach the EC2 instance's Nginx reverse proxy.
* **WebSocket forwarding:** Defeated by client-side `localhost` hardcoding.

---

## Phase 5: Authentication Audit

* **JWT generation works:** Pass (Backend successfully issues standard HS256 tokens).
* **JWT validation works:** Pass (Express middleware correctly verifies tokens).
* **AuthContext hydration works:** **FAIL**. The `hydrateAuth` effect in `AuthContext.jsx` attempts to call `apiCall('/auth/me')`. In production, this fails with a network error, forcing the catch block `logout()` to trigger, wiping the user's `splitwise_auth` token from `localStorage` instantly.

**Conclusion:** Users physically cannot remain logged in on production.

---

## Phase 6: API Audit

*(Note: Tested directly against the backend server bypassing the broken frontend)*

* `POST /api/auth/register`: 201 OK - Pass
* `POST /api/auth/login`: 200 OK - Pass
* `POST /api/groups`: 201 OK - Pass
* `GET /api/groups/:id`: 200 OK - Pass
* `POST /api/import/:id`: 200 OK - Pass
* `POST /api/approval/expenses/:id/approve`: 200 OK - Pass

**Conclusion:** The backend Node.js/Express server is perfectly healthy. The bugs are strictly isolated to Frontend configuration and environment routing.

---

## Phase 7: Frontend State Audit

* **React Router:** Working, but Nginx requires a `try_files $uri /index.html;` configuration for direct URL access.
* **Context Providers:** `AuthContext` relies on backend calls. Since backend calls fail, context falls back to `null`, tearing down the application state.
* **localStorage usage:** The token is successfully stored in `splitwise_auth`, but immediately deleted by the failed `hydrateAuth` validation check.

---

## Overall Assessment

The application is completely non-functional in the EC2 production environment due to the absence of Environment Variables. The frontend codebase makes 4 distinct hardcoded references to `http://localhost:5001` which forces all production traffic to route to the user's local loopback interface.

**Action Required:** Implement relative routing or Vite environment variables (`import.meta.env.VITE_API_URL`), update all hardcoded values, and introduce `.env.production` before generating the final production build.
