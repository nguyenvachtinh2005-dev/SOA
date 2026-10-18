
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Đăng ký tài khoản
exports.register = async (req, res) => {
    try {
        const { fullname, email, password } = req.body;

        // Kiểm tra dữ liệu đầu vào
        if (
            typeof fullname !== 'string' ||
            fullname.trim() === '' ||
            typeof email !== 'string' ||
            email.trim() === '' ||
            typeof password !== 'string' ||
            password.length < 8
        ) {
            return res.status(400).json({
                message: 'Họ tên, email là bắt buộc; mật khẩu phải có ít nhất 8 ký tự'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Kiểm tra định dạng email cơ bản
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            return res.status(400).json({
                message: 'Email không hợp lệ'
            });
        }

        // Kiểm tra email đã tồn tại chưa
        const [existingUsers] = await db.execute(
            'SELECT id FROM users WHERE email = ?',
            [normalizedEmail]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                message: 'Email đã được đăng ký'
            });
        }

        // Mã hóa mật khẩu trước khi lưu
        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await db.execute(
            `INSERT INTO users (fullname, email, password)
             VALUES (?, ?, ?)`,
            [fullname.trim(), normalizedEmail, hashedPassword]
        );

        return res.status(201).json({
            message: 'Đăng ký tài khoản thành công',
            data: {
                id: result.insertId,
                fullname: fullname.trim(),
                email: normalizedEmail
            }
        });
    } catch (error) {
        console.error('Lỗi đăng ký:', error.message);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                message: 'Email đã được đăng ký'
            });
        }

        return res.status(500).json({
            message: 'Lỗi máy chủ khi đăng ký'
        });
    }
};

// Đăng nhập và cấp JWT
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (
            typeof email !== 'string' ||
            email.trim() === '' ||
            typeof password !== 'string' ||
            password === ''
        ) {
            return res.status(400).json({
                message: 'Vui lòng nhập email và mật khẩu'
            });
        }

        if (!process.env.JWT_SECRET) {
            console.error('Chưa cấu hình JWT_SECRET');
            return res.status(500).json({
                message: 'Máy chủ chưa được cấu hình xác thực'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const [users] = await db.execute(
            `SELECT id, fullname, email, password
             FROM users
             WHERE email = ?`,
            [normalizedEmail]
        );

        // Không tiết lộ email hay mật khẩu nào sai
        if (users.length === 0) {
            return res.status(401).json({
                message: 'Email hoặc mật khẩu không chính xác'
            });
        }

        const user = users[0];

        const passwordMatches = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatches) {
            return res.status(401).json({
                message: 'Email hoặc mật khẩu không chính xác'
            });
        }

        // Tạo token có thời hạn
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN || '1h',
                issuer: 'auth-service'
            }
        );

        return res.status(200).json({
            message: 'Đăng nhập thành công',
            tokenType: 'Bearer',
            expiresIn: process.env.JWT_EXPIRES_IN || '1h',
            token,
            data: {
                id: user.id,
                fullname: user.fullname,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Lỗi đăng nhập:', error.message);

        return res.status(500).json({
            message: 'Lỗi máy chủ khi đăng nhập'
        });
    }
};
