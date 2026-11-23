
const axios = require('axios');

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Vui lòng cung cấp token!'
            });
        }

        const response = await axios.get(
            `${process.env.AUTH_SERVICE_URL}/auth/verify`,
            {
                headers: {
                    Authorization: authHeader
                }
            }
        );

        req.user = response.data.user || response.data;
        req.token = authHeader.substring(7);

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Token không hợp lệ hoặc đã hết hạn!'
        });
    }
};

module.exports = authMiddleware;
