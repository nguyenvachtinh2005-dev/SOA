
const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    // Kiểm tra header Authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            message: 'Vui lòng đăng nhập để truy cập API'
        });
    }

    // Lấy token sau chữ Bearer
    const token = authHeader.slice(7).trim();

    if (!token) {
        return res.status(401).json({
            message: 'JWT không được để trống'
        });
    }

    // Không cho xác thực nếu server chưa cấu hình secret
    if (!process.env.JWT_SECRET) {
        console.error('Chưa cấu hình JWT_SECRET');
        return res.status(500).json({
            message: 'Máy chủ chưa được cấu hình xác thực'
        });
    }

    try {
        // Xác minh chữ ký, thời hạn và issuer
        const decoded = jwt.verify(token, process.env.JWT_SECRET, {
            issuer: process.env.JWT_ISSUER || 'auth-service'
        });

        // Lưu thông tin người dùng để các handler có thể sử dụng
        req.user = decoded;

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                message: 'JWT đã hết hạn, vui lòng đăng nhập lại'
            });
        }

        return res.status(401).json({
            message: 'JWT không hợp lệ'
        });
    }
}

module.exports = authMiddleware;
