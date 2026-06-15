require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const groupRoutes = require('./routes/group.routes');
const { globalBalanceRouter } = require('./routes/balance.routes');
const { globalSettlementRouter } = require('./routes/settlement.routes');
const importRoutes = require('./routes/import.routes');
const approvalRoutes = require('./routes/approval.routes');

const app = express();
app.use(cors({ origin: 'https://splitwise.yashkhurana.dev', credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/balances', globalBalanceRouter);
app.use('/api/settlements', globalSettlementRouter);
app.use('/api/import', importRoutes);
app.use('/api/approval', approvalRoutes);
app.use('/api/expenses/:id/messages', require('./routes/chat.routes'));

const http = require('http');
const { initializeSocket } = require('./socket');

const server = http.createServer(app);
initializeSocket(server);

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
