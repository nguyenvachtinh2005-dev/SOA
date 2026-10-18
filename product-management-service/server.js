
require('dotenv').config();

const app = require('./app');
const db = require('./config/db');

const PORT = process.env.PORT || 5001;

async function startServer() {
    try {
        // Kiểm tra kết nối MySQL trước khi chạy server
        const connection = await db.getConnection();
        console.log('Kết nối MySQL thành công!');
        connection.release();

        app.listen(PORT, () => {
            console.log(
                `Product Management Service chạy tại http://localhost:${PORT}`
            );
        });
    } catch (error) {
        console.error('Không thể khởi động service:', error.message);
        process.exit(1);
    }
}

startServer();
