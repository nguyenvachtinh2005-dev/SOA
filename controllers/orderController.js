
const db = require('../config/database');
const { checkStock } = require('../services/productService');

// GET /orders
// Lấy tất cả đơn hàng
exports.getAllOrders = async (req, res) => {
    try {
        const [orders] = await db.query(
            'SELECT * FROM orders ORDER BY created_at DESC'
        );

        res.status(200).json({
            success: true,
            data: orders
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// GET /orders/:id
// Lấy chi tiết đơn hàng
exports.getOrderById = async (req, res) => {
    try {
        const { id } = req.params;

        const [orders] = await db.query(
            'SELECT * FROM orders WHERE id = ?',
            [id]
        );

        if (orders.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        const [items] = await db.query(
            'SELECT * FROM order_items WHERE order_id = ?',
            [id]
        );

        res.status(200).json({
            success: true,
            data: {
                ...orders[0],
                items
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// POST /orders
// Tạo đơn hàng mới và kiểm tra tồn kho
exports.createOrder = async (req, res) => {
    const connection = await db.getConnection();

    try {
        const {
            customer_name,
            customer_email,
            items
        } = req.body;

        if (!customer_name || !customer_email ||
            !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập đầy đủ thông tin đơn hàng'
            });
        }

        // Kiểm tra dữ liệu và tồn kho
        const productItems = [];
        let totalAmount = 0;

        for (const item of items) {
            const productId = Number(item.product_id);
            const quantity = Number(item.quantity);

            if (!Number.isInteger(productId) ||
                productId <= 0 ||
                !Number.isInteger(quantity) ||
                quantity <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Mã sản phẩm hoặc số lượng không hợp lệ'
                });
            }

            const product = await checkStock(
                productId,
                quantity,
                req.token
            );

            if (!Number.isFinite(product.price) ||
                product.price < 0) {
                throw new Error('Giá sản phẩm không hợp lệ');
            }

            const totalPrice = product.price * quantity;

            productItems.push({
                product_id: product.id,
                product_name: product.name,
                quantity,
                unit_price: product.price,
                total_price: totalPrice
            });

            totalAmount += totalPrice;
        }

        // Bắt đầu transaction
        await connection.beginTransaction();

        // Tạo đơn hàng
        const [orderResult] = await connection.query(
            `INSERT INTO orders
            (customer_name, customer_email, total_amount, status)
            VALUES (?, ?, ?, 'pending')`,
            [customer_name, customer_email, totalAmount]
        );

        const orderId = orderResult.insertId;

        // Tạo chi tiết đơn hàng
        for (const item of productItems) {
            await connection.query(
                `INSERT INTO order_items
                (order_id, product_id, product_name,
                quantity, unit_price, total_price)
                VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    orderId,
                    item.product_id,
                    item.product_name,
                    item.quantity,
                    item.unit_price,
                    item.total_price
                ]
            );
        }

        await connection.commit();

        res.status(201).json({
            success: true,
            message: 'Tạo đơn hàng thành công',
            data: {
                order_id: orderId,
                customer_name,
                customer_email,
                total_amount: totalAmount,
                status: 'pending',
                items: productItems
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

// PUT /orders/:id
// Cập nhật trạng thái đơn hàng
exports.updateOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatus = [
            'pending',
            'completed',
            'cancelled'
        ];

        if (!validStatus.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Trạng thái không hợp lệ'
            });
        }

        const [result] = await db.query(
            'UPDATE orders SET status = ? WHERE id = ?',
            [status, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Cập nhật trạng thái đơn hàng thành công'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// DELETE /orders/:id
// Xóa đơn hàng
exports.deleteOrder = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.query(
            'DELETE FROM orders WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Xóa đơn hàng thành công'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
