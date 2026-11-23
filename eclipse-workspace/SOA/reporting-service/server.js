
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./config/database');
const authMiddleware = require('./middleware/authMiddleware');
const reportRoutes = require('./routes/reportRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Kiểm tra service
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Reporting Service is running!',
        port: process.env.PORT || 5004
    });
});

// Kiểm tra kết nối database
app.get('/health', async (req, res) => {
    try {
        await db.query('SELECT 1');

        res.status(200).json({
            success: true,
            message: 'Reporting Service và Database đang hoạt động!'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Không thể kết nối Database!',
            error: error.message
        });
    }
});

// Xác thực trước khi truy cập API báo cáo
app.use('/reports', authMiddleware, reportRoutes);

// Xử lý API không tồn tại
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'API không tồn tại!'
    });
});

const PORT = process.env.PORT || 5004;

app.listen(PORT, () => {
    console.log(`Reporting Service running at http://localhost:${PORT}`);
});
