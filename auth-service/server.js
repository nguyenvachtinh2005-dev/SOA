
require('dotenv').config();

const app = require('./app');
const db = require('./config/db');

const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        const connection = await db.getConnection();
        console.log('Kết nối MySQL auth_db thành công!');
        connection.release();

        app.listen(PORT, () => {
            console.log(
                `Auth Service chạy tại http://localhost:${PORT}`
            );
        });
    } catch (error) {
        console.error(
            'Không thể khởi động Auth Service:',
            error.message
        );
        process.exit(1);
    }
}

startServer();
