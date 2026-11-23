
const db = require('../config/database');
const { getOrderById } = require('../services/orderService');
const {
    getProductById,
    getProductCost
} = require('../services/productService');

// GET /reports/orders
const getAllOrderReports = async (req, res) => {
    try {
        const [reports] = await db.query(`
            SELECT *
            FROM orders_reports
            ORDER BY id DESC
        `);

        return res.status(200).json({
            success: true,
            message: 'Lấy danh sách báo cáo đơn hàng thành công!',
            data: reports
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// GET /reports/orders/:id
const getOrderReportById = async (req, res) => {
    try {
        const { id } = req.params;

        const [reports] = await db.query(
            'SELECT * FROM orders_reports WHERE id = ?',
            [id]
        );

        if (reports.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy báo cáo đơn hàng!'
            });
        }

        const [products] = await db.query(
            'SELECT * FROM product_reports WHERE order_report_id = ?',
            [id]
        );

        return res.status(200).json({
            success: true,
            message: 'Lấy chi tiết báo cáo đơn hàng thành công!',
            data: {
                ...reports[0],
                products
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Hàm tính toán dữ liệu báo cáo
const calculateOrderReport = async (orderId, token) => {
    const order = await getOrderById(orderId, token);

    if (!order.items || order.items.length === 0) {
        throw new Error('Đơn hàng không có sản phẩm!');
    }

    if (order.status && order.status !== 'completed') {
        throw new Error('Chỉ tạo báo cáo cho đơn hàng đã hoàn thành!');
    }

    let totalRevenue = 0;
    let totalCost = 0;

    const productReports = [];

    for (const item of order.items) {
        const productId = item.product_id;
        const quantity = Number(item.quantity);

        if (!productId || !Number.isInteger(quantity) || quantity <= 0) {
            throw new Error('Thông tin sản phẩm trong đơn hàng không hợp lệ!');
        }

        const product = await getProductById(productId, token);

        const unitPrice = Number(
            item.unit_price ?? item.price ?? product.price
        );

        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
            throw new Error(`Giá bán của sản phẩm ${productId} không hợp lệ!`);
        }

        const unitCost = getProductCost(product);

        const revenue = quantity * unitPrice;
        const cost = quantity * unitCost;
        const profit = revenue - cost;

        totalRevenue += revenue;
        totalCost += cost;

        productReports.push({
            product_id: productId,
            total_sold: quantity,
            revenue,
            cost,
            profit
        });
    }

    return {
        orderId: order.id || orderId,
        totalRevenue,
        totalCost,
        totalProfit: totalRevenue - totalCost,
        productReports
    };
};

// POST /reports/orders
const createOrderReport = async (req, res) => {
    let connection;

    try {
        const { order_id } = req.body;

        if (!order_id || !Number.isInteger(Number(order_id))) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp order_id hợp lệ!'
            });
        }

        const reportData = await calculateOrderReport(
            Number(order_id),
            req.token
        );

        connection = await db.getConnection();
        await connection.beginTransaction();

        const [existing] = await connection.query(
            'SELECT id FROM orders_reports WHERE order_id = ?',
            [reportData.orderId]
        );

        let orderReportId;

        if (existing.length > 0) {
            orderReportId = existing[0].id;

            await connection.query(
                `UPDATE orders_reports
                 SET total_revenue = ?, total_cost = ?, total_profit = ?
                 WHERE id = ?`,
                [
                    reportData.totalRevenue,
                    reportData.totalCost,
                    reportData.totalProfit,
                    orderReportId
                ]
            );
        } else {
            const [result] = await connection.query(
                `INSERT INTO orders_reports
                 (order_id, total_revenue, total_cost, total_profit)
                 VALUES (?, ?, ?, ?)`,
                [
                    reportData.orderId,
                    reportData.totalRevenue,
                    reportData.totalCost,
                    reportData.totalProfit
                ]
            );

            orderReportId = result.insertId;
        }

        // Đồng bộ các báo cáo sản phẩm của đơn hàng
        await connection.query(
            'DELETE FROM product_reports WHERE order_report_id = ?',
            [orderReportId]
        );

        for (const item of reportData.productReports) {
            await connection.query(
                `INSERT INTO product_reports
                 (order_report_id, product_id, total_sold, revenue, cost, profit)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    orderReportId,
                    item.product_id,
                    item.total_sold,
                    item.revenue,
                    item.cost,
                    item.profit
                ]
            );
        }

        await connection.commit();

        return res.status(201).json({
            success: true,
            message: 'Tạo báo cáo đơn hàng thành công!',
            data: {
                id: orderReportId,
                order_id: reportData.orderId,
                total_revenue: reportData.totalRevenue,
                total_cost: reportData.totalCost,
                total_profit: reportData.totalProfit,
                products: reportData.productReports
            }
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

// DELETE /reports/orders/:id
const deleteOrderReport = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.query(
            'DELETE FROM orders_reports WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy báo cáo đơn hàng!'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Xóa báo cáo đơn hàng thành công!'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

module.exports = {
    getAllOrderReports,
    getOrderReportById,
    createOrderReport,
    deleteOrderReport
};
