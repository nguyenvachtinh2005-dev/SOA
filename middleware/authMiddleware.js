
const axios = require('axios');

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Vui lòng đăng nhập để sử dụng dịch vụ'
            });
        }

        const token = authHeader.split(' ')[1];

        const response = await axios.get(
            `${process.env.AUTH_SERVICE_URL}/auth/verify`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        req.user = response.data.user || response.data;
        req.token = token;

        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Token không hợp lệ hoặc đã hết hạn'
        });
    }
};

module.exports = authMiddleware;
