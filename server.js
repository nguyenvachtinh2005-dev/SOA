
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./config/database');
const authMiddleware = require('./middleware/authMiddleware');

const orderRoutes = require('./routes/orderRoutes');
const orderItemRoutes = require('./routes/orderItemRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Kiểm tra server
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Order Management Service is running',
        port: process.env.PORT
    });
});

// Kiểm tra database
app.get('/health', async (req, res) => {
    try {
        await db.query('SELECT 1');

        res.json({
            success: true,
            message: 'Database connected successfully'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Xác thực trước khi sử dụng API
app.use(authMiddleware);

// API quản lý đơn hàng
app.use('/orders', orderRoutes);

// API quản lý chi tiết đơn hàng
app.use('/order_items', orderItemRoutes);

// Xử lý API không tồn tại
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'API không tồn tại'
    });
});

const PORT = process.env.PORT || 5002;

app.listen(PORT, () => {
    console.log(`Order Service running at http://localhost:${PORT}`);
});
