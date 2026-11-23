
const express = require('express');
const router = express.Router();

const orderReportController = require('../controllers/orderReportController');
const productReportController = require('../controllers/productReportController');

// Báo cáo sản phẩm
router.get('/products', productReportController.getAllProductReports);
router.get('/products/:id', productReportController.getProductReportById);
router.post('/products', productReportController.createProductReport);
router.delete('/products/:id', productReportController.deleteProductReport);

// Báo cáo đơn hàng
router.get('/orders', orderReportController.getAllOrderReports);
router.get('/orders/:id', orderReportController.getOrderReportById);
router.post('/orders', orderReportController.createOrderReport);
router.delete('/orders/:id', orderReportController.deleteOrderReport);

module.exports = router;
