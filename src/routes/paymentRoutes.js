// routes/paymentRoutes.js

import express from 'express';
import paymentController from '../controllers/paymentController.js';
import verifyToken from '../middlewares/verifytoken.js';

const router = express.Router();

// Order management routes
router.post('/orders', verifyToken, paymentController.createOrder);
router.put('/orders/:orderId/complete', verifyToken, paymentController.completeOrder);
router.get('/orders/my-orders', verifyToken, paymentController.getUserOrders);
router.get('/orders/:orderId', verifyToken, paymentController.getOrderById);
router.put('/orders/:orderId/cancel', verifyToken, paymentController.cancelOrder);
router.get('/orders', verifyToken, paymentController.getAllOrders); // Keep this last to avoid conflicts

// Analytics routes
router.get('/analytics/daily', verifyToken, paymentController.getDailySalesAnalytics);
router.get('/analytics/weekly', verifyToken, paymentController.getWeeklyRevenueAnalytics);
router.get('/analytics/dashboard', verifyToken, paymentController.getAnalyticsDashboard);

router.post('/orders/:orderId/refund', verifyToken, paymentController.processRefund);
router.get('/orders/:orderId/refund-eligiiblity', verifyToken, paymentController.checkRefundEligibility);
router.get('/refunds', verifyToken, paymentController.getAllRefunds);
router.get('/analytics/refunds', verifyToken, paymentController.getRefundAnalytics);

router.put('/update/:orderId', verifyToken, paymentController.updateOrderStatus);
export default router;