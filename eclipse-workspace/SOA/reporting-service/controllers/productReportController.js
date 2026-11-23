
const db = require('../config/database');
const { getOrderById } = require('../services/orderService');
const {
    getProductById,
    getProductCost
} = require('../services/productService');

// GET /reports/products
const getAllProductReports = async (req, res) => {
    try {
        const [reports] = await db.query(`
            SELECT
                pr.*,
                orp.order_id,
                orp.total_revenue AS order_total_revenue
            FROM product_reports pr
            JOIN orders_reports orp
                ON pr.order_report_id = orp.id
            ORDER BY pr.id DESC
        `);

        return res.status(200).json({
            success: true,
            message: 'Lấy danh sách báo cáo sản phẩm thành công!',
            data: reports
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// GET /reports/products/:id
const getProductReportById = async (req, res) => {
    try {
        const { id } = req.params;

        const [reports] = await db.query(`
            SELECT
                pr.*,
                orp.order_id
            FROM product_reports pr
            JOIN orders_reports orp
                ON pr.order_report_id = orp.id
            WHERE pr.id = ?
        `, [id]);

        if (reports.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy báo cáo sản phẩm!'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Lấy chi tiết báo cáo sản phẩm thành công!',
            data: reports[0]
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// POST /reports/products
// Body: { "order_id": 1 }
const createProductReport = async (req, res) => {
    let connection;

    try {
        const { order_id } = req.body;

        if (!order_id || !Number.isInteger(Number(order_id))) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp order_id hợp lệ!'
            });
        }

        const order = await getOrderById(Number(order_id), req.token);

        if (!order.items || order.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Đơn hàng không có sản phẩm!'
            });
        }

        if (order.status && order.status !== 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Chỉ tạo báo cáo cho đơn hàng đã hoàn thành!'
            });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();

        // Tìm báo cáo đơn hàng đã tồn tại
        const [orderReports] = await connection.query(
            'SELECT id FROM orders_reports WHERE order_id = ?',
            [Number(order_id)]
        );

        if (orderReports.length === 0) {
            await connection.rollback();

            return res.status(400).json({
                success: false,
                message: 'Chưa có báo cáo đơn hàng. Hãy tạo báo cáo đơn hàng trước!'
            });
        }

        const orderReportId = orderReports[0].id;

        // Xóa báo cáo sản phẩm cũ để tránh trùng dữ liệu
        await connection.query(
            'DELETE FROM product_reports WHERE order_report_id = ?',
            [orderReportId]
        );

        const productReports = [];

        for (const item of order.items) {
            const product = await getProductById(
                item.product_id,
                req.token
            );

            const quantity = Number(item.quantity);

            if (!Number.isInteger(quantity) || quantity <= 0) {
                throw new Error('Số lượng sản phẩm không hợp lệ!');
            }

            const unitPrice = Number(
                item.unit_price ?? item.price ?? product.price
            );

            if (!Number.isFinite(unitPrice) || unitPrice < 0) {
                throw new Error(
                    `Giá bán của sản phẩm ${item.product_id} không hợp lệ!`
                );
            }

            const unitCost = getProductCost(product);

            const revenue = quantity * unitPrice;
            const cost = quantity * unitCost;
            const profit = revenue - cost;

            const report = {
                product_id: item.product_id,
                total_sold: quantity,
                revenue,
                cost,
                profit
            };

            const [result] = await connection.query(
                `INSERT INTO product_reports
                 (order_report_id, product_id, total_sold, revenue, cost, profit)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    orderReportId,
                    report.product_id,
                    report.total_sold,
                    report.revenue,
                    report.cost,
                    report.profit
                ]
            );

            productReports.push({
                id: result.insertId,
                ...report
            });
        }

        await connection.commit();

        return res.status(201).json({
            success: true,
            message: 'Tạo báo cáo sản phẩm thành công!',
            data: productReports
        });
    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        return res.status(400).json({
            success: false,
            message: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

// DELETE /reports/products/:id
const deleteProductReport = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.query(
            'DELETE FROM product_reports WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy báo cáo sản phẩm!'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Xóa báo cáo sản phẩm thành công!'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    getAllProductReports,
    getProductReportById,
    createProductReport,
    deleteProductReport
};
