
const db = require('../config/database');
const { checkStock } = require('../services/productService');

// Hàm tính lại tổng tiền đơn hàng
const updateOrderTotal = async (connection, orderId) => {
    await connection.query(
        `UPDATE orders
         SET total_amount = (
             SELECT COALESCE(SUM(total_price), 0)
             FROM order_items
             WHERE order_id = ?
         )
         WHERE id = ?`,
        [orderId, orderId]
    );
};

// GET /order_items
// Lấy tất cả chi tiết đơn hàng
exports.getAllOrderItems = async (req, res) => {
    try {
        const [items] = await db.query(
            'SELECT * FROM order_items ORDER BY id DESC'
        );

        res.status(200).json({
            success: true,
            data: items
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// GET /order_items/:id
// Lấy chi tiết một mặt hàng
exports.getOrderItemById = async (req, res) => {
    try {
        const { id } = req.params;

        const [items] = await db.query(
            'SELECT * FROM order_items WHERE id = ?',
            [id]
        );

        if (items.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy mặt hàng'
            });
        }

        res.status(200).json({
            success: true,
            data: items[0]
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// POST /order_items
// Thêm mặt hàng vào đơn hàng
exports.createOrderItem = async (req, res) => {
    const connection = await db.getConnection();

    try {
        const { order_id, product_id, quantity } = req.body;

        const orderId = Number(order_id);
        const productId = Number(product_id);
        const qty = Number(quantity);

        if (!Number.isInteger(orderId) || orderId <= 0 ||
            !Number.isInteger(productId) || productId <= 0 ||
            !Number.isInteger(qty) || qty <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Dữ liệu không hợp lệ'
            });
        }

        const [orders] = await connection.query(
            'SELECT id, status FROM orders WHERE id = ?',
            [orderId]
        );

        if (orders.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Đơn hàng không tồn tại'
            });
        }

        if (orders[0].status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Chỉ được thêm sản phẩm vào đơn hàng đang chờ'
            });
        }

        const product = await checkStock(
            productId,
            qty,
            req.token
        );

        if (!Number.isFinite(product.price) || product.price < 0) {
            throw new Error('Giá sản phẩm không hợp lệ');
        }

        const totalPrice = product.price * qty;

        await connection.beginTransaction();

        const [result] = await connection.query(
            `INSERT INTO order_items
            (order_id, product_id, product_name,
            quantity, unit_price, total_price)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                orderId,
                product.id,
                product.name,
                qty,
                product.price,
                totalPrice
            ]
        );

        await updateOrderTotal(connection, orderId);

        await connection.commit();

        res.status(201).json({
            success: true,
            message: 'Thêm mặt hàng thành công',
            data: {
                id: result.insertId,
                order_id: orderId,
                product_id: product.id,
                product_name: product.name,
                quantity: qty,
                unit_price: product.price,
                total_price: totalPrice
            }
        });

    } catch (error) {
        await connection.rollback();

        res.status(400).json({
            success: false,
            message: error.message
        });

    } finally {
        connection.release();
    }
};

// PUT /order_items/:id
// Cập nhật mặt hàng
exports.updateOrderItem = async (req, res) => {
    const connection = await db.getConnection();

    try {
        const { id } = req.params;
        const { quantity } = req.body;

        const qty = Number(quantity);

        if (!Number.isInteger(qty) || qty <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Số lượng phải là số nguyên lớn hơn 0'
            });
        }

        const [items] = await connection.query(
            `SELECT oi.*, o.status
             FROM order_items oi
             JOIN orders o ON oi.order_id = o.id
             WHERE oi.id = ?`,
            [id]
        );

        if (items.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy mặt hàng'
            });
        }

        const item = items[0];

        if (item.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Không thể sửa mặt hàng của đơn hàng đã xử lý'
            });
        }

        const product = await checkStock(
            item.product_id,
            qty,
            req.token
        );

        if (!Number.isFinite(product.price) || product.price < 0) {
            throw new Error('Giá sản phẩm không hợp lệ');
        }

        const totalPrice = product.price * qty;

        await connection.beginTransaction();

        await connection.query(
            `UPDATE order_items
             SET quantity = ?, unit_price = ?, total_price = ?
             WHERE id = ?`,
            [qty, product.price, totalPrice, id]
        );

        await updateOrderTotal(connection, item.order_id);

        await connection.commit();

        res.status(200).json({
            success: true,
            message: 'Cập nhật mặt hàng thành công'
        });

    } catch (error) {
        await connection.rollback();

        res.status(400).json({
            success: false,
            message: error.message
        });

    } finally {
        connection.release();
    }
};

// DELETE /order_items/:id
// Xóa mặt hàng khỏi đơn hàng
exports.deleteOrderItem = async (req, res) => {
    const connection = await db.getConnection();

    try {
        const { id } = req.params;

        const [items] = await connection.query(
            `SELECT oi.order_id, o.status
             FROM order_items oi
             JOIN orders o ON oi.order_id = o.id
             WHERE oi.id = ?`,
            [id]
        );

        if (items.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy mặt hàng'
            });
        }

        if (items[0].status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Không thể xóa mặt hàng của đơn hàng đã xử lý'
            });
        }

        const orderId = items[0].order_id;

        await connection.beginTransaction();

        await connection.query(
            'DELETE FROM order_items WHERE id = ?',
            [id]
        );

        await updateOrderTotal(connection, orderId);

        await connection.commit();

        res.status(200).json({
            success: true,
            message: 'Xóa mặt hàng thành công'
        });

    } catch (error) {
        await connection.rollback();

        res.status(500).json({
            success: false,
            message: error.message
        });

    } finally {
        connection.release();
    }
};
