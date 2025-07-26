// services/paymentService.js

import { PrismaClient } from "@prisma/client";
import AppError from "../utils/error.js";

const prisma = new PrismaClient();

const paymentService = {
  // Create a new order/payment
  async createOrder(orderData) {
    try {
      const { userId, songId, paymentMethod, amount, transactionId, metadata } = orderData;

      console.log('Creating order for user:', { userId, songId });

      // Verify song exists and get pricing
      const song = await prisma.song.findUnique({
        where: { id: songId },
        select: {
          id: true,
          title: true,
          pricing: true,
          status: true,
          userId: true
        }
      });

      if (!song) {
        throw new AppError('Song not found', 404);
      }

      console.log('Found song:', song);

      if (song.status !== 'PUBLISHED') {
        throw new AppError('Song is not available for purchase', 400);
      }

      // Check if user is trying to buy their own song
      if (song.userId === userId) {
        throw new AppError('You cannot purchase your own song', 400);
      }

      // Check if user already owns this song
      const existingOrder = await prisma.order.findFirst({
        where: {
          userId,
          songId,
          status: 'ACCEPTED'
        }
      });

      if (existingOrder) {
        throw new AppError('You already own this song', 400);
      }

      // Use song pricing if amount is not provided
      const orderAmount = amount || song.pricing;

      if (!orderAmount || orderAmount <= 0) {
        throw new AppError('Invalid order amount', 400);
      }

      // Check for duplicate transaction ID if provided
      if (transactionId) {
        const existingTransaction = await prisma.order.findUnique({
          where: { transactionId }
        });

        if (existingTransaction) {
          throw new AppError('Transaction ID already exists', 400);
        }
      }

      // Create order
      const order = await prisma.order.create({
        data: {
          userId,
          songId,
          amount: orderAmount,
          paymentMethod: paymentMethod || 'UNKNOWN',
          transactionId,
          metadata: metadata || {},
          status: 'ACCEPTED',
        },
        include: {
          song: {
            select: {
              id: true,
              title: true,
              pricing: true,
              coverImage: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      console.log('Order created successfully:', order.id);

      return order;
    } catch (error) {
      console.error('Error creating order:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to create order', 500);
    }
  },

  // Complete payment/order
  async completeOrder(orderId, transactionData = {}) {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          song: {
            select: {
              id: true,
              title: true,
              pricing: true,
              coverImage: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
      
      if (!order) {
        throw new AppError('Order not found', 404);
      }
      
      if (order.status === 'COMPLETED') {
        throw new AppError('Order already completed', 400);
      }

      if (order.status === 'FAILED' || order.status === 'REFUNDED') {
        throw new AppError('Cannot complete a failed or refunded order', 400);
      }
      
      // Update order status
      const completedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'COMPLETED',
          ...transactionData,
          updatedAt: new Date()
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          song: {
            select: {
              id: true,
              title: true,
              pricing: true,
              coverImage: true
            }
          }
        }
      });
      
      console.log('Order completed successfully:', orderId);
      
      return completedOrder;
    } catch (error) {
      console.error('Error completing order:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to complete order', 500);
    }
  },

  // Get daily sales analytics
  async getDailySalesAnalytics(date = new Date()) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      // Previous day for comparison
      const previousDay = new Date(startOfDay);
      previousDay.setDate(previousDay.getDate() - 1);
      const previousDayEnd = new Date(previousDay);
      previousDayEnd.setHours(23, 59, 59, 999);
      
      // Today's data
      const todayOrders = await prisma.order.findMany({
        where: {
          status: 'ACCEPTED',
          updatedAt: { // Use updatedAt since that's when order is completed
            gte: startOfDay,
            lte: endOfDay
          }
        },
        include: {
          song: {
            select: {
              id: true,
              title: true,
              pricing: true
            }
          }
        }
      });
      
      // Yesterday's data for comparison
      const yesterdayOrders = await prisma.order.findMany({
        where: {
          status: 'COMPLETED',
          updatedAt: {
            gte: previousDay,
            lte: previousDayEnd
          }
        }
      });
      
      // Calculate today's metrics
      const todayRevenue = todayOrders.reduce((sum, order) => sum + (order.amount || 0), 0);
      const todaySalesCount = todayOrders.length;
      
      // Calculate yesterday's metrics
      const yesterdayRevenue = yesterdayOrders.reduce((sum, order) => sum + (order.amount || 0), 0);
      const yesterdaySalesCount = yesterdayOrders.length;
      
      // Calculate percentage changes
      const revenueChange = yesterdayRevenue > 0 
        ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 
        : todayRevenue > 0 ? 100 : 0;
        
      const salesChange = yesterdaySalesCount > 0 
        ? ((todaySalesCount - yesterdaySalesCount) / yesterdaySalesCount) * 100 
        : todaySalesCount > 0 ? 100 : 0;
      
      // Group by song
      const songSales = todayOrders.reduce((acc, order) => {
        const songId = order.songId;
        if (!acc[songId]) {
          acc[songId] = {
            songId,
            songTitle: order.song?.title || 'Unknown',
            count: 0,
            revenue: 0,
            pricing: order.song?.pricing || 0
          };
        }
        acc[songId].count++;
        acc[songId].revenue += (order.amount || 0);
        return acc;
      }, {});
      
      const topSongs = Object.values(songSales)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      
      return {
        date: date.toISOString().split('T')[0],
        today: {
          totalRevenue: Number(todayRevenue.toFixed(2)),
          totalSales: todaySalesCount,
          averageOrderValue: todaySalesCount > 0 ? Number((todayRevenue / todaySalesCount).toFixed(2)) : 0
        },
        comparison: {
          revenueChange: Number(revenueChange.toFixed(2)),
          salesChange: Number(salesChange.toFixed(2)),
          yesterdayRevenue: Number(yesterdayRevenue.toFixed(2)),
          yesterdaySales: yesterdaySalesCount
        },
        topSongs,
        totalSongsCount: Object.keys(songSales).length
      };
    } catch (error) {
      console.error('Error fetching daily sales analytics:', error);
      throw new AppError('Failed to fetch daily sales analytics', 500);
    }
  },

  async get24HourSalesAnalytics() {
  try {
    const now = new Date();
    // Define the end of the current 24-hour period
    const currentPeriodEnd = new Date(now);
    // Define the start of the current 24-hour period (24 hours ago)
    const currentPeriodStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Define the start of the previous 24-hour period for comparison (48 hours ago)
    const previousPeriodStart = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    // Fetch orders from the last 24 hours
    const currentPeriodOrders = await prisma.order.findMany({
      where: {
        status: 'ACCEPTED',
        updatedAt: {
          gte: currentPeriodStart,
          lte: currentPeriodEnd,
        },
      },
      include: {
        song: {
          select: {
            id: true,
            title: true,
            pricing: true,
          },
        },
      },
    });

    // Fetch orders from the previous 24 hours for comparison
    const previousPeriodOrders = await prisma.order.findMany({
      where: {
        status: 'ACCEPTED',
        updatedAt: {
          gte: previousPeriodStart,
          lte: currentPeriodStart, // Note the end time is the start of the current period
        },
      },
    });

    // --- METRIC CALCULATIONS ---

    // Calculate current period metrics
    const currentRevenue = currentPeriodOrders.reduce((sum, order) => sum + (order.amount || 0), 0);
    const currentSalesCount = currentPeriodOrders.length;

    // Calculate previous period metrics
    const previousRevenue = previousPeriodOrders.reduce((sum, order) => sum + (order.amount || 0), 0);
    const previousSalesCount = previousPeriodOrders.length;

    // Calculate percentage changes
    const revenueChange = previousRevenue > 0 ?
      ((currentRevenue - previousRevenue) / previousRevenue) * 100 :
      currentRevenue > 0 ? 100 : 0;

    const salesChange = previousSalesCount > 0 ?
      ((currentSalesCount - previousSalesCount) / previousSalesCount) * 100 :
      currentSalesCount > 0 ? 100 : 0;

    // --- HOURLY SALES STATISTICS (for the chart) ---
    
    // Initialize an array for 24 hours, each with revenue and purchase count
    const hourlyStats = Array.from({ length: 24 }, (_, i) => {
        const hour = new Date(currentPeriodStart);
        hour.setHours(hour.getHours() + i);
        return {
            // Label for the hour, e.g., "3am", "12pm"
            timeLabel: hour.toLocaleString('en-US', { hour: 'numeric', hour12: true }).toLowerCase(),
            totalRevenue: 0,
            totalPurchase: 0,
        };
    });

    // Populate the hourly statistics
    currentPeriodOrders.forEach(order => {
        const orderHour = new Date(order.updatedAt).getHours();
        // Find the correct hour slot to update
        for(let i = 0; i < 24; i++) {
            const statHour = new Date(currentPeriodStart);
            statHour.setHours(statHour.getHours() + i);
            if (statHour.getHours() === orderHour) {
                hourlyStats[i].totalRevenue += (order.amount || 0);
                hourlyStats[i].totalPurchase++;
                break;
            }
        }
    });


    // --- TOP SONGS (from the last 24 hours) ---
    const songSales = currentPeriodOrders.reduce((acc, order) => {
      const songId = order.songId;
      if (!acc[songId]) {
        acc[songId] = {
          songId,
          songTitle: order.song?.title || 'Unknown',
          count: 0,
          revenue: 0,
          pricing: order.song?.pricing || 0,
        };
      }
      acc[songId].count++;
      acc[songId].revenue += (order.amount || 0);
      return acc;
    }, {});

    const topSongs = Object.values(songSales)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // --- RETURN FINAL ANALYTICS OBJECT ---
    return {
      summary: {
        totalRevenue: Number(currentRevenue.toFixed(2)),
        totalPurchases: currentSalesCount,
        revenueChange: Number(revenueChange.toFixed(2)),
        purchasesChange: Number(salesChange.toFixed(2)),
      },
      salesStatistic: hourlyStats,
      topSongs,
      totalSongsSold: Object.keys(songSales).length,
    };

  } catch (error) {
    console.error('Error fetching 24-hour sales analytics:', error);
    throw new AppError('Failed to fetch 24-hour sales analytics', 500);
  }
},

async get30DaySalesAnalytics() {
  try {
    const now = new Date();
    // Define the current 30-day period
    const currentPeriodEnd = new Date(now);
    const currentPeriodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Define the previous 30-day period for comparison
    const previousPeriodStart = new Date(currentPeriodStart.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Fetch orders from the last 30 days
    const currentPeriodOrders = await prisma.order.findMany({
      where: {
        status: 'ACCEPTED',
        updatedAt: {
          gte: currentPeriodStart,
          lte: currentPeriodEnd,
        },
      },
    });

    // Fetch orders from the previous 30 days
    const previousPeriodOrders = await prisma.order.findMany({
      where: {
        status: 'ACCEPTED',
        updatedAt: {
          gte: previousPeriodStart,
          lte: currentPeriodStart,
        },
      },
    });

    // --- METRIC CALCULATIONS ---

    // Calculate current period metrics
    const currentRevenue = currentPeriodOrders.reduce((sum, order) => sum + (order.amount || 0), 0);
    const currentSalesCount = currentPeriodOrders.length;

    // Calculate previous period metrics
    const previousRevenue = previousPeriodOrders.reduce((sum, order) => sum + (order.amount || 0), 0);
    const previousSalesCount = previousPeriodOrders.length;

    // Calculate percentage changes
    const revenueChange = previousRevenue > 0 ?
      ((currentRevenue - previousRevenue) / previousRevenue) * 100 :
      currentRevenue > 0 ? 100 : 0;

    const salesChange = previousSalesCount > 0 ?
      ((currentSalesCount - previousSalesCount) / previousSalesCount) * 100 :
      currentSalesCount > 0 ? 100 : 0;

    // --- WEEKLY SALES STATISTICS (for the chart) ---
    const weeklyStats = [
        { week: 'Week 1', totalRevenue: 0, totalPurchase: 0 },
        { week: 'Week 2', totalRevenue: 0, totalPurchase: 0 },
        { week: 'Week 3', totalRevenue: 0, totalPurchase: 0 },
        { week: 'Week 4', totalRevenue: 0, totalPurchase: 0 },
    ];
    
    currentPeriodOrders.forEach(order => {
        const orderDate = new Date(order.updatedAt);
        const daysAgo = (currentPeriodEnd.getTime() - orderDate.getTime()) / (1000 * 3600 * 24);
        
        if (daysAgo <= 7) { // Week 4 (most recent)
            weeklyStats[3].totalRevenue += (order.amount || 0);
            weeklyStats[3].totalPurchase++;
        } else if (daysAgo <= 14) { // Week 3
            weeklyStats[2].totalRevenue += (order.amount || 0);
            weeklyStats[2].totalPurchase++;
        } else if (daysAgo <= 21) { // Week 2
            weeklyStats[1].totalRevenue += (order.amount || 0);
            weeklyStats[1].totalPurchase++;
        } else if (daysAgo <= 30) { // Week 1
            weeklyStats[0].totalRevenue += (order.amount || 0);
            weeklyStats[0].totalPurchase++;
        }
    });

    // --- RETURN FINAL ANALYTICS OBJECT ---
    return {
      summary: {
        totalRevenue: Number(currentRevenue.toFixed(2)),
        totalPurchases: currentSalesCount,
        revenueChange: Number(revenueChange.toFixed(2)),
        purchasesChange: Number(salesChange.toFixed(2)),
      },
      salesStatistic: weeklyStats,
    };

  } catch (error) {
    console.error('Error fetching 30-day sales analytics:', error);
    throw new AppError('Failed to fetch 30-day sales analytics', 500);
  }
},

async getCustomDateRangeSalesAnalytics(startDateISO, endDateISO) {
  try {
    const startDate = new Date(startDateISO);
    

    const endDate = new Date(endDateISO);
    endDate.setHours(23, 59, 59, 999); // Set to the end of the day

    // --- COMPARISON PERIOD CALCULATION ---
    const rangeDuration = endDate.getTime() - startDate.getTime();
    const previousPeriodEndDate = new Date(startDate.getTime() - 1); // Day before the start date
    const previousPeriodStartDate = new Date(previousPeriodEndDate.getTime() - rangeDuration);

    // --- DATABASE QUERIES ---
    // Fetch orders for the selected period
    const currentPeriodOrders = await prisma.order.findMany({
      where: {
        status: 'ACCEPTED',
        updatedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Fetch orders for the previous period for comparison
    const previousPeriodOrders = await prisma.order.findMany({
      where: {
        status: 'ACCEPTED',
        updatedAt: {
          gte: previousPeriodStartDate,
          lte: previousPeriodEndDate,
        },
      },
    });

    // --- METRIC CALCULATIONS ---
    const currentRevenue = currentPeriodOrders.reduce((sum, order) => sum + (order.amount || 0), 0);
    const currentSalesCount = currentPeriodOrders.length;

    const previousRevenue = previousPeriodOrders.reduce((sum, order) => sum + (order.amount || 0), 0);
    const previousSalesCount = previousPeriodOrders.length;

    const revenueChange = previousRevenue > 0 ?
      ((currentRevenue - previousRevenue) / previousRevenue) * 100 :
      currentRevenue > 0 ? 100 : 0;

    const salesChange = previousSalesCount > 0 ?
      ((currentSalesCount - previousSalesCount) / previousSalesCount) * 100 :
      currentSalesCount > 0 ? 100 : 0;

    // --- DAILY SALES STATISTICS (for the chart) ---
    const dailyStats = {};
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateString = d.toISOString().split('T')[0]; // YYYY-MM-DD
      const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); // "Jul 10"
      dailyStats[dateString] = {
        dateLabel,
        totalRevenue: 0,
        totalPurchase: 0
      };
    }

    currentPeriodOrders.forEach(order => {
      const orderDateString = new Date(order.updatedAt).toISOString().split('T')[0];
      if (dailyStats[orderDateString]) {
        dailyStats[orderDateString].totalRevenue += (order.amount || 0);
        dailyStats[orderDateString].totalPurchase++;
      }
    });

    // --- RETURN FINAL ANALYTICS OBJECT ---
    return {
      summary: {
        totalRevenue: Number(currentRevenue.toFixed(2)),
        totalPurchases: currentSalesCount,
        revenueChange: Number(revenueChange.toFixed(2)),
        purchasesChange: Number(salesChange.toFixed(2)),
      },
      salesStatistic: Object.values(dailyStats), // Convert map to array for the chart
    };

  } catch (error) {
    console.error('Error fetching custom range sales analytics:', error);
    throw new AppError('Failed to fetch custom range sales analytics', 500);
  }
},

// Get weekly revenue analytics
async getWeeklyRevenueAnalytics(weekStartDate = null) {
  try {
    const now = new Date();
    // Safely initialize startOfWeek by ensuring the input is a non-empty string before processing it.
    const startOfWeek = (typeof weekStartDate === 'string' && weekStartDate.trim()) 
      ? new Date(weekStartDate.trim() + 'T00:00:00') 
      : new Date(now);

      console.log('Start of week date:', startOfWeek);

    // VALIDATION: Check if the created date is valid.
    if (isNaN(startOfWeek.getTime())) {
      throw new AppError('Invalid date provided. Please use YYYY-MM-DD format.', 400);
    }

    console.log('Fetching weekly revenue analytics starting from:', startOfWeek);
    
    // If no valid date string was provided, calculate the start of the current week (Monday).
    if (!(typeof weekStartDate === 'string' && weekStartDate.trim())) {
      const dayOfWeek = now.getDay(); // Sunday is 0, Monday is 1
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startOfWeek.setDate(now.getDate() + daysToMonday);
    }
    
    console.log('Adjusted start of week date:', startOfWeek);
    
    //7 days from now  startOfWeek

    const endOfWeek = new Date(startOfWeek);
    console.log('End of week date:', endOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    console.log('End of week date:', endOfWeek);
    
    // Previous week for comparison
    const previousWeekStart = new Date(startOfWeek);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);
    const previousWeekEnd = new Date(endOfWeek);
    previousWeekEnd.setDate(previousWeekEnd.getDate() - 7);
    

    // Current week data
    const currentWeekOrders = await prisma.order.findMany({
      where: {
        status: 'ACCEPTED',
        updatedAt: {
          gte: startOfWeek,
          lte: endOfWeek
        }
      },
      include: {
        song: {
          select: {
            id: true,
            title: true,
            pricing: true
          }
        }
      }
    });
    
    // Previous week data
    const previousWeekOrders = await prisma.order.findMany({
      where: {
        status: 'ACCEPTED',
        updatedAt: {
          gte: previousWeekStart,
          lte: previousWeekEnd
        }
      }
    });
    
    // Calculate current week metrics
    const currentWeekRevenue = currentWeekOrders.reduce((sum, order) => sum + (order.amount || 0), 0);
    const currentWeekSales = currentWeekOrders.length;
    
    // Calculate previous week metrics
    const previousWeekRevenue = previousWeekOrders.reduce((sum, order) => sum + (order.amount || 0), 0);
    const previousWeekSales = previousWeekOrders.length;
    
    // Calculate percentage changes
    const revenueChange = previousWeekRevenue > 0 
      ? ((currentWeekRevenue - previousWeekRevenue) / previousWeekRevenue) * 100 
      : currentWeekRevenue > 0 ? 100 : 0;
      
    const salesChange = previousWeekSales > 0 
      ? ((currentWeekSales - previousWeekSales) / previousWeekSales) * 100 
      : currentWeekSales > 0 ? 100 : 0;
    
    // Daily breakdown for current week
    const dailyBreakdown = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      
      const dayStart = new Date(day);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);
      
      const dayOrders = currentWeekOrders.filter(order => {
        const orderDate = new Date(order.updatedAt);
        return orderDate >= dayStart && orderDate <= dayEnd;
      });
      
      const dayRevenue = dayOrders.reduce((sum, order) => sum + (order.amount || 0), 0);
      
      dailyBreakdown.push({
        date: day.toISOString().split('T')[0],
        dayName: day.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }), // Use UTC for day name
        revenue: Number(dayRevenue.toFixed(2)),
        sales: dayOrders.length
      });
    }
    
    return {
      weekPeriod: {
        start: startOfWeek.toISOString().split('T')[0],
        end: endOfWeek.toISOString().split('T')[0]
      },
      currentWeek: {
        totalRevenue: Number(currentWeekRevenue.toFixed(2)),
        totalSales: currentWeekSales,
        averageOrderValue: currentWeekSales > 0 ? Number((currentWeekRevenue / currentWeekSales).toFixed(2)) : 0,
        averageDailyRevenue: Number((currentWeekRevenue / 7).toFixed(2))
      },
      comparison: {
        revenueChange: Number(revenueChange.toFixed(2)),
        salesChange: Number(salesChange.toFixed(2)),
        previousWeekRevenue: Number(previousWeekRevenue.toFixed(2)),
        previousWeekSales: previousWeekSales
      },
      dailyBreakdown
    };
  } catch (error) {
    if (error.isOperational) {
        throw error;
    }
    console.error('Error fetching weekly revenue analytics:', error);
    throw new AppError('Failed to fetch weekly revenue analytics', 500);
  }
},

async getMonthlySalesAnalytics(year, month) {
  try {
    // --- DATE CALCULATIONS ---
    // Note: In JavaScript, months are 0-indexed (0=Jan, 11=Dec).
    const monthIndex = month - 1;

    // Calculate start and end dates for the selected month
    const startDate = new Date(year, monthIndex, 1);
    const endDate = new Date(year, monthIndex + 1, 0); // The '0' day of the next month gives the last day of the current month
    endDate.setHours(23, 59, 59, 999);

    // Calculate start and end dates for the previous month for comparison
    const previousMonthEndDate = new Date(startDate.getTime() - 1); // The day before the start of the selected month
    const previousMonthStartDate = new Date(previousMonthEndDate.getFullYear(), previousMonthEndDate.getMonth(), 1);

    // --- DATABASE QUERIES ---
    const currentMonthOrders = await prisma.order.findMany({
      where: {
        status: 'ACCEPTED',
        updatedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const previousMonthOrders = await prisma.order.findMany({
      where: {
        status: 'ACCEPTED',
        updatedAt: {
          gte: previousMonthStartDate,
          lte: previousMonthEndDate,
        },
      },
    });

    // --- METRIC CALCULATIONS ---
    const currentRevenue = currentMonthOrders.reduce((sum, order) => sum + (order.amount || 0), 0);
    const currentSalesCount = currentMonthOrders.length;

    const previousRevenue = previousMonthOrders.reduce((sum, order) => sum + (order.amount || 0), 0);
    const previousSalesCount = previousMonthOrders.length;

    const revenueChange = previousRevenue > 0 ?
      ((currentRevenue - previousRevenue) / previousRevenue) * 100 :
      currentRevenue > 0 ? 100 : 0;

    const salesChange = previousSalesCount > 0 ?
      ((currentSalesCount - previousSalesCount) / previousSalesCount) * 100 :
      currentSalesCount > 0 ? 100 : 0;

    // --- WEEKLY SALES STATISTICS (for the chart) ---
    const weeklyStats = [
        { week: 'Week 1', totalRevenue: 0, totalPurchase: 0 },
        { week: 'Week 2', totalRevenue: 0, totalPurchase: 0 },
        { week: 'Week 3', totalRevenue: 0, totalPurchase: 0 },
        { week: 'Week 4', totalRevenue: 0, totalPurchase: 0 },
    ];

    currentMonthOrders.forEach(order => {
        const dayOfMonth = new Date(order.updatedAt).getDate();
        if (dayOfMonth <= 7) {
            weeklyStats[0].totalRevenue += (order.amount || 0);
            weeklyStats[0].totalPurchase++;
        } else if (dayOfMonth <= 14) {
            weeklyStats[1].totalRevenue += (order.amount || 0);
            weeklyStats[1].totalPurchase++;
        } else if (dayOfMonth <= 21) {
            weeklyStats[2].totalRevenue += (order.amount || 0);
            weeklyStats[2].totalPurchase++;
        } else { // Days 22 to end of month
            weeklyStats[3].totalRevenue += (order.amount || 0);
            weeklyStats[3].totalPurchase++;
        }
    });

    // --- RETURN FINAL ANALYTICS OBJECT ---
    return {
      summary: {
        totalRevenue: Number(currentRevenue.toFixed(2)),
        totalPurchases: currentSalesCount,
        revenueChange: Number(revenueChange.toFixed(2)),
        purchasesChange: Number(salesChange.toFixed(2)),
      },
      salesStatistic: weeklyStats,
    };

  } catch (error) {
    console.error('Error fetching monthly sales analytics:', error);
    throw new AppError('Failed to fetch monthly sales analytics', 500);
  }
},


  // Get user's orders
  async getUserOrders(userId, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const [orders, totalOrders] = await Promise.all([
        prisma.order.findMany({
          where: { userId },
          include: {
            song: {
              select: {
                id: true,
                title: true,
                coverImage: true,
                audioFile: true,
                pricing: true
              }
            }
          },
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' }
        }),
        prisma.order.count({ where: { userId } })
      ]);
      
      return {
        orders,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalOrders / limit),
          totalOrders,
          hasNext: skip + orders.length < totalOrders,
          hasPrev: page > 1,
          limit: parseInt(limit)
        }
      };
    } catch (error) {
      console.error('Error fetching user orders:', error);
      throw new AppError('Failed to fetch user orders', 500);
    }
  },

  // Get all orders (admin)
  async getAllOrders(page = 1, limit = 10, filters = {}) {
    try {
      const skip = (page - 1) * limit;
      const { status, userId, songId, startDate, endDate } = filters;
      
      let whereClause = {};
      
      if (status) {
        whereClause.status = status;
      }
      
      if (userId) {
        whereClause.userId = userId;
      }
      
      if (songId) {
        whereClause.songId = songId;
      }
      
      if (startDate && endDate) {
        whereClause.createdAt = {
          gte: new Date(startDate),
          lte: new Date(endDate)
        };
      } else if (startDate) {
        whereClause.createdAt = {
          gte: new Date(startDate)
        };
      } else if (endDate) {
        whereClause.createdAt = {
          lte: new Date(endDate)
        };
      }
      
      const [orders, totalOrders] = await Promise.all([
        prisma.order.findMany({
          where: whereClause,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            song: {
              select: {
                id: true,
                title: true,
                pricing: true,
                coverImage: true
              }
            }
          },
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' }
        }),
        prisma.order.count({ where: whereClause })
      ]);
      
      return {
        orders,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalOrders / limit),
          totalOrders,
          hasNext: skip + orders.length < totalOrders,
          hasPrev: page > 1,
          limit: parseInt(limit)
        }
      };
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw new AppError('Failed to fetch orders', 500);
    }
  },

  // Get order by ID
  async getOrderById(orderId, userId, userRole = 'user') {
    try {
      let whereClause = { id: orderId };
      
      // If not admin, user can only see their own orders
      if (userRole !== 'admin') {
        whereClause.userId = userId;
      }

      const order = await prisma.order.findUnique({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          song: {
            select: {
              id: true,
              title: true,
              pricing: true,
              coverImage: true,
              audioFile: true
            }
          }
        }
      });

      if (!order) {
        throw new AppError('Order not found', 404);
      }

      return order;
    } catch (error) {
      console.error('Error fetching order by ID:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to fetch order', 500);
    }
  },

  // Cancel order
  async cancelOrder(orderId, userId) {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId }
      });

      if (!order) {
        throw new AppError('Order not found', 404);
      }

      if (order.userId !== userId) {
        throw new AppError('Unauthorized to cancel this order', 403);
      }

      if (order.status === 'COMPLETED') {
        throw new AppError('Cannot cancel a completed order', 400);
      }

      if (order.status === 'FAILED' || order.status === 'REFUNDED') {
        throw new AppError('Order is already cancelled/refunded', 400);
      }

      const cancelledOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'FAILED',
          updatedAt: new Date()
        },
        include: {
          song: {
            select: {
              id: true,
              title: true,
              pricing: true,
              coverImage: true
            }
          }
        }
      });

      return cancelledOrder;
    } catch (error) {
      console.error('Error cancelling order:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to cancel order', 500);
    }
  },



   // Process refund for an order
  async processRefund(orderId, refundData = {}) {
    try {
      const { reason, refundAmount, adminUserId, notes } = refundData;

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          song: {
            select: {
              id: true,
              title: true,
              pricing: true,
              coverImage: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      if (!order) {
        throw new AppError('Order not found', 404);
      }

      if (order.status !== 'ACCEPTED' && order.status !== 'COMPLETED') {
        throw new AppError('Only accepted or completed orders can be refunded', 400);
      }

      // Check if already refunded
      if (order.status === 'REFUNDED') {
        throw new AppError('Order is already refunded', 400);
      }

      // Validate refund amount
      const maxRefundAmount = order.amount;
      const actualRefundAmount = refundAmount || maxRefundAmount;

      if (actualRefundAmount <= 0 || actualRefundAmount > maxRefundAmount) {
        throw new AppError(`Refund amount must be between 0 and ${maxRefundAmount}`, 400);
      }

      // Check refund eligibility (e.g., within refund period)
      const orderDate = new Date(order.createdAt);
      const currentDate = new Date();
      const daysSinceOrder = Math.floor((currentDate - orderDate) / (1000 * 60 * 60 * 24));
      const maxRefundDays = 30; // Configurable refund policy

      if (daysSinceOrder > maxRefundDays) {
        throw new AppError(`Refund period of ${maxRefundDays} days has expired`, 400);
      }

      // Generate refund transaction ID
      const refundTransactionId = `refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Update order with refund information
    const refundedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'REFUNDED',
        updatedAt: new Date(),
        metadata: {
          ...order.metadata,
          refundReason: reason || 'No reason provided',
          refundAmount: actualRefundAmount,
          refundProcessedAt: new Date(),
          refundTransactionId,
          adminUserId, // ID of the admin processing the refund
          notes: notes || ''
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        song: {
          select: {
            id: true,
            title: true,
            pricing: true,
            coverImage: true
          }
        }
      }
    });

      console.log('Refund processed successfully:', orderId);

      return refundedOrder;
    } catch (error) {
      console.error('Error processing refund:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to process refund', 500);
    }
  },

  // Get refund analytics
  async getRefundAnalytics(startDate, endDate) {
    try {
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
      const end = endDate ? new Date(endDate) : new Date();

      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      // Get refunded orders in the period
      const refundedOrders = await prisma.order.findMany({
        where: {
          status: 'REFUNDED',
          refundProcessedAt: {
            gte: start,
            lte: end
          }
        },
        include: {
          song: {
            select: {
              id: true,
              title: true,
              pricing: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          refundProcessedAt: 'desc'
        }
      });

      // Get total completed orders in the same period for comparison
      const completedOrders = await prisma.order.findMany({
        where: {
          status: 'COMPLETED',
          updatedAt: {
            gte: start,
            lte: end
          }
        }
      });

      // Calculate metrics
      const totalRefunds = refundedOrders.length;
      const totalRefundAmount = refundedOrders.reduce((sum, order) => sum + (order.refundAmount || 0), 0);
      const totalCompletedOrders = completedOrders.length;
      const totalCompletedRevenue = completedOrders.reduce((sum, order) => sum + (order.amount || 0), 0);

      const refundRate = totalCompletedOrders > 0 ? (totalRefunds / totalCompletedOrders) * 100 : 0;
      const averageRefundAmount = totalRefunds > 0 ? totalRefundAmount / totalRefunds : 0;

      // Group refunds by reason
      const refundsByReason = refundedOrders.reduce((acc, order) => {
        const reason = order.refundReason || 'Unknown';
        if (!acc[reason]) {
          acc[reason] = { count: 0, totalAmount: 0 };
        }
        acc[reason].count++;
        acc[reason].totalAmount += (order.refundAmount || 0);
        return acc;
      }, {});

      // Group by song
      const refundsBySong = refundedOrders.reduce((acc, order) => {
        const songId = order.songId;
        if (!acc[songId]) {
          acc[songId] = {
            songId,
            songTitle: order.song?.title || 'Unknown',
            count: 0,
            totalRefundAmount: 0
          };
        }
        acc[songId].count++;
        acc[songId].totalRefundAmount += (order.refundAmount || 0);
        return acc;
      }, {});

      const topRefundedSongs = Object.values(refundsBySong)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        period: {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0]
        },
        summary: {
          totalRefunds,
          totalRefundAmount: Number(totalRefundAmount.toFixed(2)),
          averageRefundAmount: Number(averageRefundAmount.toFixed(2)),
          refundRate: Number(refundRate.toFixed(2)),
          totalCompletedOrders,
          totalCompletedRevenue: Number(totalCompletedRevenue.toFixed(2))
        },
        refundsByReason: Object.entries(refundsByReason).map(([reason, data]) => ({
          reason,
          count: data.count,
          totalAmount: Number(data.totalAmount.toFixed(2)),
          percentage: Number(((data.count / totalRefunds) * 100).toFixed(2))
        })),
        topRefundedSongs,
        recentRefunds: refundedOrders.slice(0, 20).map(order => ({
          id: order.id,
          songTitle: order.song?.title,
          userName: order.user?.name,
          refundAmount: order.refundAmount,
          reason: order.refundReason,
          processedAt: order.refundProcessedAt,
          originalAmount: order.amount
        }))
      };
    } catch (error) {
      console.error('Error fetching refund analytics:', error);
      throw new AppError('Failed to fetch refund analytics', 500);
    }
  },

  // Check refund eligibility
  async checkRefundEligibility(orderId) {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          song: {
            select: {
              id: true,
              title: true,
              pricing: true
            }
          }
        }
      });

      if (!order) {
        throw new AppError('Order not found', 404);
      }

      const eligibility = {
        eligible: false,
        reason: '',
        maxRefundAmount: 0,
        daysRemaining: 0
      };

      if (order.status !== 'ACCEPTED' && order.status !== 'COMPLETED') {
        eligibility.reason = 'Only accepted or completed orders are eligible for refund';
        return eligibility;
      }

      if (order.status === 'REFUNDED') {
        eligibility.reason = 'Order has already been refunded';
        return eligibility;
      }

      // Check refund period
      const orderDate = new Date(order.createdAt);
      const currentDate = new Date();
      const daysSinceOrder = Math.floor((currentDate - orderDate) / (1000 * 60 * 60 * 24));
      const maxRefundDays = 30;

      if (daysSinceOrder > maxRefundDays) {
        eligibility.reason = `Refund period of ${maxRefundDays} days has expired`;
        return eligibility;
      }

      eligibility.eligible = true;
      eligibility.maxRefundAmount = order.amount;
      eligibility.daysRemaining = maxRefundDays - daysSinceOrder;
      eligibility.reason = 'Order is eligible for refund';

      return eligibility;
    } catch (error) {
      console.error('Error checking refund eligibility:', error);
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to check refund eligibility', 500);
    }
  },

  // Get all refunds with filters
  async getAllRefunds(page = 1, limit = 10, filters = {}) {
    try {
      const skip = (page - 1) * limit;
      const { startDate, endDate, reason, songId, userId } = filters;

      let whereClause = {
        status: 'REFUNDED'
      };

      if (startDate && endDate) {
        whereClause.refundProcessedAt = {
          gte: new Date(startDate),
          lte: new Date(endDate)
        };
      } else if (startDate) {
        whereClause.refundProcessedAt = {
          gte: new Date(startDate)
        };
      } else if (endDate) {
        whereClause.refundProcessedAt = {
          lte: new Date(endDate)
        };
      }

      if (reason) {
        whereClause.refundReason = {
          contains: reason,
          mode: 'insensitive'
        };
      }

      if (songId) {
        whereClause.songId = songId;
      }

      if (userId) {
        whereClause.userId = userId;
      }

      const [refunds, totalRefunds] = await Promise.all([
        prisma.order.findMany({
          where: whereClause,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            song: {
              select: {
                id: true,
                title: true,
                pricing: true,
                coverImage: true
              }
            }
          },
          skip,
          take: parseInt(limit),
          orderBy: { updatedAt: 'desc' }
        }),
        prisma.order.count({ where: whereClause })
      ]);

      return {
        refunds,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalRefunds / limit),
          totalRefunds,
          hasNext: skip + refunds.length < totalRefunds,
          hasPrev: page > 1,
          limit: parseInt(limit)
        }
      };
    } catch (error) {
      console.error('Error fetching refunds:', error);
      throw new AppError('Failed to fetch refunds', 500);
    }
  },


  async updateOrderStatus(orderId, status) {
    try {
      const validStatuses = ['ACCEPTED', 'COMPLETED', 'FAILED', 'REFUNDED'];
      if (!validStatuses.includes(status)) {
        throw new AppError('Invalid order status', 400);
      }

      const order = await prisma.order.findUnique({
        where: { id: orderId }
      });

      if (!order) {
        throw new AppError('Order not found', 404);
      }

    

      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          status,
          updatedAt: new Date()
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          song: {
            select: {
              id: true,
              title: true,
              pricing: true,
              coverImage: true
            }
          }
        }
      });

      return updatedOrder;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw new AppError('Failed to update order status', 500);
    }
  }
};

export default paymentService;