
const db = require('../config/db');

// Kiểm tra ID hợp lệ
function isValidId(id) {
    return /^\d+$/.test(id) && Number(id) > 0;
}

// GET /products - Lấy danh sách sản phẩm
exports.getAllProducts = async (req, res) => {
    try {
        const [products] = await db.execute(
            'SELECT * FROM products ORDER BY id DESC'
        );

        return res.status(200).json({
            message: 'Lấy danh sách sản phẩm thành công',
            data: products
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: 'Lỗi khi lấy danh sách sản phẩm'
        });
    }
};

// GET /products/:id - Lấy chi tiết sản phẩm
exports.getProductById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return res.status(400).json({
                message: 'ID sản phẩm không hợp lệ'
            });
        }

        const [products] = await db.execute(
            'SELECT * FROM products WHERE id = ?',
            [id]
        );

        if (products.length === 0) {
            return res.status(404).json({
                message: 'Không tìm thấy sản phẩm'
            });
        }

        return res.status(200).json({
            message: 'Lấy thông tin sản phẩm thành công',
            data: products[0]
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: 'Lỗi khi lấy thông tin sản phẩm'
        });
    }
};

// POST /products - Thêm sản phẩm
exports.createProduct = async (req, res) => {
    try {
        const { name, description = null, price, quantity } = req.body;

        if (
            typeof name !== 'string' ||
            name.trim() === '' ||
            name.trim().length > 255
        ) {
            return res.status(400).json({
                message: 'Tên sản phẩm là bắt buộc và tối đa 255 ký tự'
            });
        }

        if (
            price === undefined ||
            price === null ||
            price === '' ||
            !Number.isFinite(Number(price)) ||
            Number(price) < 0 ||
            !/^\d+(\.\d{1,2})?$/.test(String(price))
        ) {
            return res.status(400).json({
                message: 'Giá phải là số không âm, tối đa 2 chữ số thập phân'
            });
        }

        if (
            quantity === undefined ||
            !Number.isInteger(quantity) ||
            quantity < 0
        ) {
            return res.status(400).json({
                message: 'Số lượng phải là số nguyên không âm'
            });
        }

        if (
            description !== null &&
            typeof description !== 'string'
        ) {
            return res.status(400).json({
                message: 'Mô tả phải là chuỗi hoặc null'
            });
        }

        const [result] = await db.execute(
            `INSERT INTO products
                (name, description, price, quantity)
             VALUES (?, ?, ?, ?)`,
            [name.trim(), description, Number(price), quantity]
        );

        const [products] = await db.execute(
            'SELECT * FROM products WHERE id = ?',
            [result.insertId]
        );

        return res.status(201).json({
            message: 'Thêm sản phẩm thành công',
            data: products[0]
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: 'Lỗi khi thêm sản phẩm'
        });
    }
};

// PUT /products/:id - Cập nhật sản phẩm
exports.updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description = null, price, quantity } = req.body;

        if (!isValidId(id)) {
            return res.status(400).json({
                message: 'ID sản phẩm không hợp lệ'
            });
        }

        if (
            typeof name !== 'string' ||
            name.trim() === '' ||
            name.trim().length > 255
        ) {
            return res.status(400).json({
                message: 'Tên sản phẩm là bắt buộc và tối đa 255 ký tự'
            });
        }

        if (
            price === undefined ||
            price === null ||
            price === '' ||
            !Number.isFinite(Number(price)) ||
            Number(price) < 0 ||
            !/^\d+(\.\d{1,2})?$/.test(String(price))
        ) {
            return res.status(400).json({
                message: 'Giá phải là số không âm, tối đa 2 chữ số thập phân'
            });
        }

        if (
            quantity === undefined ||
            !Number.isInteger(quantity) ||
            quantity < 0
        ) {
            return res.status(400).json({
                message: 'Số lượng phải là số nguyên không âm'
            });
        }

        if (
            description !== null &&
            typeof description !== 'string'
        ) {
            return res.status(400).json({
                message: 'Mô tả phải là chuỗi hoặc null'
            });
        }

        const [existing] = await db.execute(
            'SELECT id FROM products WHERE id = ?',
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                message: 'Không tìm thấy sản phẩm'
            });
        }

        await db.execute(
            `UPDATE products
             SET name = ?, description = ?, price = ?, quantity = ?
             WHERE id = ?`,
            [name.trim(), description, Number(price), quantity, id]
        );

        const [products] = await db.execute(
            'SELECT * FROM products WHERE id = ?',
            [id]
        );

        return res.status(200).json({
            message: 'Cập nhật sản phẩm thành công',
            data: products[0]
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: 'Lỗi khi cập nhật sản phẩm'
        });
    }
};

// DELETE /products/:id - Xóa sản phẩm
exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return res.status(400).json({
                message: 'ID sản phẩm không hợp lệ'
            });
        }

        const [result] = await db.execute(
            'DELETE FROM products WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: 'Không tìm thấy sản phẩm'
            });
        }

        return res.status(200).json({
            message: 'Xóa sản phẩm thành công'
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: 'Lỗi khi xóa sản phẩm'
        });
    }
};
