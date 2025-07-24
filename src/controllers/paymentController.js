// controllers/paymentController.js

import paymentService from '../services/paymentService.js';
import AppError from '../utils/error.js';

const paymentController = {
  // Create new order
  async createOrder(req, res, next) {
    try {
      const { songId, paymentMethod, amount, transactionId, metadata } = req.body;
      
      const userId = req.user.id;

      // Validate required fields
      if (!songId) {
        return res.status(400).json({
          success: false,
          message: 'Song ID is required'
        });
      }

      const order = await paymentService.createOrder({
        userId,
        songId,
        paymentMethod,
        amount,
        transactionId,
        metadata
      });

      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        order: {
          id: order.id,
          songId: order.songId,
          amount: order.amount,
          status: order.status,
          createdAt: order.createdAt
        }
      });
    } catch (error) {
      next(error); // Pass error to global error handler
    }
  },

  // Complete order
  async completeOrder(req, res, next) {
    try {
      const { orderId } = req.params;
      const transactionData = req.body;

      // Validate orderId
      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'Order ID is required'
        });
      }

      const completedOrder = await paymentService.completeOrder(orderId, transactionData);

      res.status(200).json({
        success: true,
        message: 'Order completed successfully',
        order: completedOrder
      });
    } catch (error) {
      next(error); // Use consistent error handling
    }
  },

  // Get daily sales analytics
  async getDailySalesAnalytics(req, res, next) {
    try {
      const { date } = req.query;
      let analyticsDate;

      // Validate date if provided
      if (date) {
        analyticsDate = new Date(date);
        if (isNaN(analyticsDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Invalid date format'
          });
        }
      } else {
        analyticsDate = new Date();
      }

      const analytics = await paymentService.getDailySalesAnalytics(analyticsDate);

      res.status(200).json({
        success: true,
        analytics
      });
    } catch (error) {
      next(error);
    }
  },

  // Get weekly revenue analytics
  async getWeeklyRevenueAnalytics(req, res, next) {
    try {
      const { weekStart } = req.query;
      let weekStartDate = null;

      // Validate weekStart if provided
      if (weekStart) {
        weekStartDate = new Date(weekStart);
        if (isNaN(weekStartDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Invalid week start date format'
          });
        }
      }

      const analytics = await paymentService.getWeeklyRevenueAnalytics(weekStartDate);

      res.status(200).json({
        success: true,
        analytics
      });
    } catch (error) {
      next(error);
    }
  },

  // Get user orders
  async getUserOrders(req, res, next) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const userId = req.user.id;

      // Validate pagination parameters
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
        return res.status(400).json({
          success: false,
          message: 'Invalid pagination parameters'
        });
      }

      const result = await paymentService.getUserOrders(userId, pageNum, limitNum);

      res.status(200).json({
        success: true,
        message: 'User orders fetched successfully',
        orders: result.orders,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  },

  // Get all orders (admin)
  async getAllOrders(req, res, next) {
    try {
      const { page = 1, limit = 10, status, userId, songId, startDate, endDate } = req.query;

      // Validate pagination parameters
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
        return res.status(400).json({
          success: false,
          message: 'Invalid pagination parameters'
        });
      }

      // Validate date range if provided
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Invalid date format'
          });
        }

        if (start > end) {
          return res.status(400).json({
            success: false,
            message: 'Start date cannot be after end date'
          });
        }
      }

      const filters = {
        status,
        userId,
        songId,
        startDate,
        endDate
      };

      const result = await paymentService.getAllOrders(pageNum, limitNum, filters);

      res.status(200).json({
        success: true,
        message: 'Orders fetched successfully',
        orders: result.orders,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  },

  // Get comprehensive analytics dashboard
  async getAnalyticsDashboard(req, res, next) {
    try {
      const { date } = req.query;
      let analyticsDate;

      // Validate date if provided
      if (date) {
        analyticsDate = new Date(date);
        if (isNaN(analyticsDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Invalid date format'
          });
        }
      } else {
        analyticsDate = new Date();
      }

      const [dailyAnalytics, weeklyAnalytics] = await Promise.all([
        paymentService.getDailySalesAnalytics(analyticsDate),
        paymentService.getWeeklyRevenueAnalytics()
      ]);

      res.status(200).json({
        success: true,
        dashboard: {
          daily: dailyAnalytics,
          weekly: weeklyAnalytics
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Get order by ID
  async getOrderById(req, res, next) {
    try {
      const { orderId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'Order ID is required'
        });
      }

      const order = await paymentService.getOrderById(orderId, userId, userRole);

      res.status(200).json({
        success: true,
        order
      });
    } catch (error) {
      next(error);
    }
  },

  // Cancel order
  async cancelOrder(req, res, next) {
    try {
      const { orderId } = req.params;
      const userId = req.user.id;

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'Order ID is required'
        });
      }

      const cancelledOrder = await paymentService.cancelOrder(orderId, userId);

      res.status(200).json({
        success: true,
        message: 'Order cancelled successfully',
        order: cancelledOrder
      });
    } catch (error) {
      next(error);
    }
  },
  // Process refund
  async processRefund(req, res, next) {
    try {
      const { orderId } = req.params;
      console.log('Processing refund for order:', req.body );

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'Order ID is required'
        });
      }

      // // Check if user has admin privileges (you might want to add this check)
      // if (req.user.role !== 'admin') {
      //   return res.status(403).json({
      //     success: false,
      //     message: 'Only admins can process refunds'
      //   });
      // }

      const refundedOrder = await paymentService.processRefund(orderId, req.body);

      res.status(200).json({
        success: true,
        message: 'Refund processed successfully',
        order: refundedOrder
      });
    } catch (error) {
      next(error);
    }
  },

  // Check refund eligibility
  async checkRefundEligibility(req, res, next) {
    try {
      const { orderId } = req.params;

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'Order ID is required'
        });
      }

      const eligibility = await paymentService.checkRefundEligibility(orderId);

      res.status(200).json({
        success: true,
        eligibility
      });
    } catch (error) {
      next(error);
    }
  },

  // Get refund analytics
  async getRefundAnalytics(req, res, next) {
    try {
      const { startDate, endDate } = req.query;

      // Validate dates if provided
      if (startDate && isNaN(new Date(startDate).getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid start date format'
        });
      }

      if (endDate && isNaN(new Date(endDate).getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid end date format'
        });
      }

      const analytics = await paymentService.getRefundAnalytics(startDate, endDate);

      res.status(200).json({
        success: true,
        analytics
      });
    } catch (error) {
      next(error);
    }
  },

  // Get all refunds
  async getAllRefunds(req, res, next) {
    try {
      const { page = 1, limit = 10, startDate, endDate, reason, songId, userId } = req.query;

      // Validate pagination parameters
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);

      if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
        return res.status(400).json({
          success: false,
          message: 'Invalid pagination parameters'
        });
      }

      // Validate date range if provided
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Invalid date format'
          });
        }

        if (start > end) {
          return res.status(400).json({
            success: false,
            message: 'Start date cannot be after end date'
          });
        }
      }

      const filters = {
        startDate,
        endDate,
        reason,
        songId,
        userId
      };

      const result = await paymentService.getAllRefunds(pageNum, limitNum, filters);

      res.status(200).json({
        success: true,
        message: 'Refunds fetched successfully',
        refunds: result.refunds,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  },

  async updateOrderStatus(req, res, next) {
    try {
      const { orderId } = req.params;
      const { status } = req.body;

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'Order ID is required'
        });
      }

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status is required'
        });
      }

      const updatedOrder = await paymentService.updateOrderStatus(orderId, status);

      res.status(200).json({
        success: true,
        message: 'Order status updated successfully',
        order: updatedOrder
      });
    } catch (error) {
      next(error);
    }
  }
};

export default paymentController;