# Production Security Review

This document verifies the resolution of **Interview Risk 2: Production Security**.

### Previous Configuration
* **Express CORS:** `app.use(cors());` -> Defaulted to `origin: '*'` (Allowed any domain to hit the API).
* **Socket.io CORS:** `cors: { origin: '*' }` -> Allowed any domain to connect to WebSockets.
* **Risk:** Cross-Site Request Forgery (CSRF) or malicious actors hosting a clone site could directly interact with the API using a victim's hijacked session token.

### New Configuration
**`backend/src/index.js`**
```javascript
app.use(cors({ origin: 'https://splitwise.yashkhurana.dev', credentials: true }));
```

**`backend/src/socket.js`**
```javascript
const io = new Server(server, {
  cors: { origin: 'https://splitwise.yashkhurana.dev', credentials: true }
});
```

### Deployment Implications
* **Local Development Blocked:** Attempting to run the frontend on `http://localhost:5173` while the backend runs locally on `5001` will now throw CORS errors.
* **To Develop Locally:** The developer must inject `process.env.NODE_ENV === 'development'` conditionals into the CORS config, or temporarily revert the string during local dev.
* **Production Integrity:** The API and WebSocket endpoints are now strictly bound to `https://splitwise.yashkhurana.dev`.
