
const express = require('express');
const authRoutes = require('./routes/authRoutes');

const app = express();

// Đọc dữ liệu JSON từ request body
app.use(express.json());

app.get('/', (req, res) => {
    res.status(200).json({
        message: 'Auth Service is running'
    });
});

app.use('/api/auth', authRoutes);

app.use((req, res) => {
    res.status(404).json({
        message: 'API không tồn tại'
    });
});

module.exports = app;
