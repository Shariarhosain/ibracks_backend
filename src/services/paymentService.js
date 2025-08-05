// services/paymentService.js

import { PrismaClient } from "@prisma/client";
import AppError from "../utils/error.js"; // Adjust path if needed

const prisma = new PrismaClient();

const paymentService = {
  // Create a new order/payment
  async createOrder(orderData) {
    const { userId, orderDetails, paymentMethod, transactionId, metadata } = orderData;

    if (!orderDetails || !Array.isArray(orderDetails) || orderDetails.length === 0) {
      throw new AppError('Order details are missing or empty', 400);
    }

    return prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const orderItemsData = [];

      for (const item of orderDetails) {
        const { songId, licenseId } = item;
        const song = await tx.song.findUnique({ where: { id: songId } });
        if (!song) throw new AppError(`Song with ID ${songId} not found`, 404);
        if (song.status !== 'PUBLISHED') throw new AppError(`Song "${song.title}" is not available for purchase`, 400);
        if (song.userId === userId) throw new AppError('You cannot purchase your own song', 400);

        const existingOrderItem = await tx.orderItem.findFirst({
          where: {
            songId,
            order: { userId, status: 'ACCEPTED' }
          }
        });
        if (existingOrderItem) throw new AppError(`You already own the song "${song.title}"`, 400);

        let itemPrice;
        let licenseDetails = {};

        if (licenseId) {
          const licensePack = await tx.licensePack.findUnique({ where: { id: licenseId } });
          if (!licensePack) throw new AppError(`License pack with ID ${licenseId} not found`, 404);
          itemPrice = licensePack.price;
          licenseDetails = { id: licensePack.id, name: licensePack.name, features: licensePack.features };
        } else {
          itemPrice = song.pricing;
          licenseDetails = { name: "Standard License" };
        }

        if (typeof itemPrice !== 'number' || itemPrice < 0) {
          throw new AppError(`Invalid price for song "${song.title}"`, 400);
        }

        totalAmount += itemPrice;
        orderItemsData.push({
          songId,
          licenseId,
          priceAtTimeOfPurchase: itemPrice,
          licenseDetails
        });
      }

      const order = await tx.order.create({
        data: {
          user: { connect: { id: userId } },
          amount: totalAmount,
          paymentMethod: paymentMethod || 'UNKNOWN',
          transactionId,
          metadata: metadata || {},
          status: 'ACCEPTED',
          items: { create: orderItemsData },
        },
        include: {
          items: { include: { song: { select: { id: true, title: true, coverImage: true } } } },
          user: { select: { id: true, name: true, email: true } }
        }
      });
      
      console.log('Order created successfully:', order.id);
      return order;
    });
  },

  // Complete payment/order
  async completeOrder(orderId, transactionData = {}) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });
    
    if (!order) throw new AppError('Order not found', 404);
    if (order.status === 'COMPLETED') throw new AppError('Order already completed', 400);
    if (order.status === 'FAILED' || order.status === 'REFUNDED') {
      throw new AppError('Cannot complete a failed or refunded order', 400);
    }
    
    const completedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'COMPLETED',
        ...transactionData,
        updatedAt: new Date()
      },
      include: {
        items: { include: { song: true } },
        user: { select: { id: true, name: true, email: true } }
      }
    });
    
    console.log('Order completed successfully:', orderId);
    return completedOrder;
  },

  // Get daily sales analytics
  async getDailySalesAnalytics(date = new Date()) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const previousDay = new Date(startOfDay);
    previousDay.setDate(previousDay.getDate() - 1);
    const previousDayEnd = new Date(previousDay);
    previousDayEnd.setHours(23, 59, 59, 999);

    const todayOrderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          status: { in: ['ACCEPTED', 'COMPLETED'] },
          updatedAt: { gte: startOfDay, lte: endOfDay }
        }
      },
      include: { song: true }
    });

    const yesterdayOrderItems = await prisma.orderItem.findMany({
        where: {
            order: {
                status: { in: ['ACCEPTED', 'COMPLETED'] },
                updatedAt: { gte: previousDay, lte: previousDayEnd }
            }
        }
    });

    const todayRevenue = todayOrderItems.reduce((sum, item) => sum + item.priceAtTimeOfPurchase, 0);
    const todaySalesCount = todayOrderItems.length;
    
    const yesterdayRevenue = yesterdayOrderItems.reduce((sum, item) => sum + item.priceAtTimeOfPurchase, 0);
    const yesterdaySalesCount = yesterdayOrderItems.length;

    const revenueChange = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : todayRevenue > 0 ? 100 : 0;
    const salesChange = yesterdaySalesCount > 0 ? ((todaySalesCount - yesterdaySalesCount) / yesterdaySalesCount) * 100 : todaySalesCount > 0 ? 100 : 0;

    const songSales = todayOrderItems.reduce((acc, item) => {
      if (!acc[item.songId]) {
        acc[item.songId] = {
          songId: item.songId,
          songTitle: item.song?.title || 'Unknown',
          count: 0,
          revenue: 0,
          pricing: item.song?.pricing || 0
        };
      }
      acc[item.songId].count++;
      acc[item.songId].revenue += item.priceAtTimeOfPurchase;
      return acc;
    }, {});

    const topSongs = Object.values(songSales).sort((a, b) => b.count - a.count).slice(0, 10);

    return {
      date: date.toISOString().split('T')[0],
      today: {
        totalRevenue: Number(todayRevenue.toFixed(2)),
        totalSales: todaySalesCount
      },
      comparison: {
        revenueChange: Number(revenueChange.toFixed(2)),
        salesChange: Number(salesChange.toFixed(2))
      },
      topSongs,
    };
  },


// async get24HourSalesAnalytics() {
//   try {
//     const now = new Date();

//     // Define the time periods for the query
//     const currentPeriodEnd = new Date(now);
//     const currentPeriodStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
//     const previousPeriodStart = new Date(now.getTime() - 48 * 60 * 60 * 1000);

//     // Fetch current period items
//     const currentPeriodItems = await prisma.orderItem.findMany({
//       where: {
//         order: {
//           status: { in: ['ACCEPTED', 'COMPLETED'] },
//           updatedAt: { gte: currentPeriodStart, lte: currentPeriodEnd }
//         }
//       },
//       include: {
//         order: true,
//         song: { select: { id: true, title: true } }
//       }
//     });

//     // Fetch previous period items for comparison
//     const previousPeriodItems = await prisma.orderItem.findMany({
//       where: {
//         order: {
//           status: { in: ['ACCEPTED', 'COMPLETED'] },
//           updatedAt: { gte: previousPeriodStart, lte: currentPeriodStart }
//         }
//       }
//     });

//     // --- Calculate Summary Statistics ---
//     const currentRevenue = currentPeriodItems.reduce((sum, item) => sum + item.priceAtTimeOfPurchase, 0);
//     const currentSalesCount = currentPeriodItems.length;
//     const previousRevenue = previousPeriodItems.reduce((sum, item) => sum + item.priceAtTimeOfPurchase, 0);
//     const previousSalesCount = previousPeriodItems.length;

//     // Calculate percentage change, handling division by zero
//     const revenueChange = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : (currentRevenue > 0 ? 100 : 0);
//     const salesChange = previousSalesCount > 0 ? ((currentSalesCount - previousSalesCount) / previousSalesCount) * 100 : (currentSalesCount > 0 ? 100 : 0);

//     const summary = {
//       totalRevenue: Number(currentRevenue.toFixed(2)),
//       totalPurchases: currentSalesCount,
//       revenueChange: Number(revenueChange.toFixed(2)),
//       purchasesChange: Number(salesChange.toFixed(2)),
//     };

//     // --- Calculate Sales Statistics in 3-Hour Intervals (UTC) ---

//     // 1. Initialize 8 buckets for 3-hour intervals covering a full day
//     const salesStatisticBuckets = Array.from({ length: 8 }, (_, i) => {
//       const startHour = i * 3;
//       const endHour = startHour + 3;

//       // Helper to format hours into a 12-hour format with am/pm
//       const formatLabelHour = (h) => {
//         if (h === 0 || h === 24) return '12 am';
//         if (h === 12) return '12 pm';
//         if (h < 12) return `${h} am`;
//         return `${h - 12} pm`;
//       };
      
//       return {
//         timeLabel: formatLabelHour(endHour), // Label is based on the end hour of the interval
//         totalRevenue: 0,
//         totalPurchase: 0,
//       };
//     });

//     // 2. Aggregate sales from the last 24 hours into the buckets using local hours
//     currentPeriodItems.forEach(item => {
//       // Use getHours() to get the hour in local time
//       const orderHour = new Date(item.order.updatedAt).getHours();
//       // Determines which 3-hour bucket the sale falls into (e.g., 7am local -> bucket 2)
//       const bucketIndex = Math.floor(orderHour / 3); 

//       if (salesStatisticBuckets[bucketIndex]) {
//           salesStatisticBuckets[bucketIndex].totalRevenue += item.priceAtTimeOfPurchase;
//           salesStatisticBuckets[bucketIndex].totalPurchase++;
//       }
//     });

//     // 3. Format the final revenue values to two decimal places
//     salesStatisticBuckets.forEach(bucket => {
//         bucket.totalRevenue = Number(bucket.totalRevenue.toFixed(2));
//     });

//     // 4. Reorder buckets to create a rolling 24-hour view based on current local time
//     // Use getHours() for consistency to determine the current time bucket in local time
//     const currentBucketIndex = Math.floor(now.getHours() / 3);
//     const salesStatistic = [];
//     for (let i = 0; i < 8; i++) {
//         // Start from the next bucket and loop around
//         const bucketIndex = (currentBucketIndex + i + 1) % 8;
//         salesStatistic.push(salesStatisticBuckets[bucketIndex]);
//     }

//     // --- Calculate Top Selling Songs ---
//     const songSales = currentPeriodItems.reduce((acc, item) => {
//       if (!item.songId) return acc; // Skip if songId is null

//       if (!acc[item.songId]) {
//         acc[item.songId] = {
//           songId: item.songId,
//           songTitle: item.song?.title || 'Unknown Song',
//           count: 0,
//           revenue: 0,
//         };
//       }
//       acc[item.songId].count++;
//       acc[item.songId].revenue += item.priceAtTimeOfPurchase;
//       return acc;
//     }, {});

//     const topSongs = Object.values(songSales)
//       .sort((a, b) => b.count - a.count)
//       .slice(0, 10);

//     // --- Return Final Analytics Object ---
//     return {
//       summary,
//       salesStatistic,
//       topSongs,
//     };

//   } catch (error) {
//     console.error('Error fetching 24-hour sales analytics:', error);
//     // Assuming AppError is a custom error class you have defined elsewhere
//     throw new AppError('Failed to fetch 24-hour sales analytics', 500);
//   }
// },

 async get24HourSalesAnalytics() {
    try {
      const now = new Date();
      const currentPeriodEnd = new Date(now);
      const currentPeriodStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const previousPeriodStart = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  
      const currentPeriodItems = await prisma.orderItem.findMany({
        where: {
          order: {
            status: { in: ['ACCEPTED', 'COMPLETED'] },
            updatedAt: { gte: currentPeriodStart, lte: currentPeriodEnd },
          },
        },
        include: { song: true, order: true },
      });
  
      const previousPeriodItems = await prisma.orderItem.findMany({
        where: {
          order: {
            status: { in: ['ACCEPTED', 'COMPLETED'] },
            updatedAt: { gte: previousPeriodStart, lte: currentPeriodStart },
          },
        },
      });
  
      const currentRevenue = currentPeriodItems.reduce((sum, item) => sum + item.priceAtTimeOfPurchase, 0);
      const currentSalesCount = currentPeriodItems.length;
      const previousRevenue = previousPeriodItems.reduce((sum, item) => sum + item.priceAtTimeOfPurchase, 0);
      const previousSalesCount = previousPeriodItems.length;
  
      const revenueChange = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : currentRevenue > 0 ? 100 : 0;
      const salesChange = previousSalesCount > 0 ? ((currentSalesCount - previousSalesCount) / previousSalesCount) * 100 : currentSalesCount > 0 ? 100 : 0;
  
      const hourlyStats = Array.from({ length: 24 }, (_, i) => {
        const hour = new Date(currentPeriodStart);
        hour.setHours(hour.getHours() + i);
        return {
          timeLabel: hour.toLocaleString('en-US', { hour: 'numeric', hour12: true }).toLowerCase(),
          totalRevenue: 0,
          totalPurchase: 0,
        };
      });
  
      currentPeriodItems.forEach(item => {
        const orderHour = new Date(item.order.updatedAt).getHours();
        const statIndex = (orderHour - currentPeriodStart.getHours() + 24) % 24;
        hourlyStats[statIndex].totalRevenue += item.priceAtTimeOfPurchase;
        hourlyStats[statIndex].totalPurchase++;
      });
  
      const songSales = currentPeriodItems.reduce((acc, item) => {
        if (!acc[item.songId]) {
          acc[item.songId] = {
            songId: item.songId,
            songTitle: item.song?.title || 'Unknown',
            count: 0,
            revenue: 0,
          };
        }
        acc[item.songId].count++;
        acc[item.songId].revenue += item.priceAtTimeOfPurchase;
        return acc;
      }, {});
  
      const topSongs = Object.values(songSales).sort((a, b) => b.count - a.count).slice(0, 10);
  
      return {
        summary: {
          totalRevenue: Number(currentRevenue.toFixed(2)),
          totalPurchases: currentSalesCount,
          revenueChange: Number(revenueChange.toFixed(2)),
          purchasesChange: Number(salesChange.toFixed(2)),
        },
        salesStatistic: hourlyStats,
        topSongs,
      };
    } catch (error) {
      console.error('Error fetching 24-hour sales analytics:', error);
      throw new AppError('Failed to fetch 24-hour sales analytics', 500);
    }
  },


    async get30DaySalesAnalytics() {
      try {
        const now = new Date();
        const currentPeriodEnd = new Date(now);
        const currentPeriodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const previousPeriodStart = new Date(currentPeriodStart.getTime() - 30 * 24 * 60 * 60 * 1000);

        const currentPeriodOrders = await prisma.order.findMany({
          where: {
            status: { in: ['ACCEPTED', 'COMPLETED'] },
            updatedAt: { gte: currentPeriodStart, lte: currentPeriodEnd },
          },
        });

        const previousPeriodOrders = await prisma.order.findMany({
          where: {
            status: { in: ['ACCEPTED', 'COMPLETED'] },
            updatedAt: { gte: previousPeriodStart, lte: currentPeriodStart },
          },
        });

        const currentRevenue = currentPeriodOrders.reduce((sum, order) => sum + (order.amount || 0), 0);
        const currentSalesCount = currentPeriodOrders.length;
        const previousRevenue = previousPeriodOrders.reduce((sum, order) => sum + (order.amount || 0), 0);
        const previousSalesCount = previousPeriodOrders.length;

        const revenueChange = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : currentRevenue > 0 ? 100 : 0;
        const salesChange = previousSalesCount > 0 ? ((currentSalesCount - previousSalesCount) / previousSalesCount) * 100 : currentSalesCount > 0 ? 100 : 0;

        // Calculate number of weeks in the 30-day period
        const totalDays = Math.ceil((currentPeriodEnd - currentPeriodStart) / (1000 * 60 * 60 * 24));
        const numberOfWeeks = Math.ceil(totalDays / 7);

        // Create weekly buckets
        const weeklyStats = [];
        
        for (let i = 0; i < numberOfWeeks; i++) {
          const weekStart = new Date(currentPeriodStart.getTime() + (i * 7 * 24 * 60 * 60 * 1000));
          const weekEnd = new Date(Math.min(
            weekStart.getTime() + (6 * 24 * 60 * 60 * 1000),
            currentPeriodEnd.getTime()
          ));

          weeklyStats.push({
            week: `Week ${i + 1}`,
            dateRange: `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
            totalRevenue: 0,
            totalPurchase: 0,
          });
        }

        // Assign orders to appropriate weeks
        currentPeriodOrders.forEach(order => {
          const orderDate = new Date(order.updatedAt);
          const daysFromStart = Math.floor((orderDate - currentPeriodStart) / (1000 * 60 * 60 * 24));
          const weekIndex = Math.floor(daysFromStart / 7);
          
          if (weekIndex >= 0 && weekIndex < weeklyStats.length) {
            weeklyStats[weekIndex].totalRevenue += order.amount || 0;
            weeklyStats[weekIndex].totalPurchase++;
          }
        });

        // Round revenue values
        weeklyStats.forEach(week => {
          week.totalRevenue = Number(week.totalRevenue.toFixed(2));
        });
        
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
      endDate.setHours(23, 59, 59, 999);

      // --- COMPARISON PERIOD CALCULATION ---
      const rangeDuration = endDate.getTime() - startDate.getTime();
      const previousPeriodEndDate = new Date(startDate.getTime() - 1); // The day before the start date
      const previousPeriodStartDate = new Date(previousPeriodEndDate.getTime() - rangeDuration);

      // --- DATABASE QUERIES ---
      // Fetch items for the selected period
      const currentPeriodItems = await prisma.orderItem.findMany({
        where: {
          order: {
            status: { in: ['ACCEPTED', 'COMPLETED'] },
            updatedAt: { gte: startDate, lte: endDate },
          },
        },
        include: { order: true },
      });

      // Fetch items for the previous period for comparison
      const previousPeriodItems = await prisma.orderItem.findMany({
        where: {
          order: {
            status: { in: ['ACCEPTED', 'COMPLETED'] },
            updatedAt: { gte: previousPeriodStartDate, lte: previousPeriodEndDate },
          },
        },
      });
      
      // --- METRIC CALCULATIONS ---
      const currentRevenue = currentPeriodItems.reduce((sum, item) => sum + item.priceAtTimeOfPurchase, 0);
      const currentSalesCount = currentPeriodItems.length;
      const previousRevenue = previousPeriodItems.reduce((sum, item) => sum + item.priceAtTimeOfPurchase, 0);
      const previousSalesCount = previousPeriodItems.length;

      const revenueChange = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : currentRevenue > 0 ? 100 : 0;
      const purchasesChange = previousSalesCount > 0 ? ((currentSalesCount - previousSalesCount) / previousSalesCount) * 100 : currentSalesCount > 0 ? 100 : 0;

      // --- DAILY SALES STATISTICS (for the chart) ---
      const dailyStats = {};
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateString = d.toISOString().split('T')[0];
        dailyStats[dateString] = {
          dateLabel: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          totalRevenue: 0,
          totalPurchase: 0
        };
      }

      currentPeriodItems.forEach(item => {
        const orderDateString = new Date(item.order.updatedAt).toISOString().split('T')[0];
        if (dailyStats[orderDateString]) {
          dailyStats[orderDateString].totalRevenue += item.priceAtTimeOfPurchase;
          dailyStats[orderDateString].totalPurchase++;
        }
      });

      return {
        summary: {
          totalRevenue: Number(currentRevenue.toFixed(2)),
          totalPurchases: currentSalesCount,
          revenueChange: Number(revenueChange.toFixed(2)),
          purchasesChange: Number(purchasesChange.toFixed(2)),
        },
        salesStatistic: Object.values(dailyStats),
      };
    } catch (error) {
      console.error('Error fetching custom range sales analytics:', error);
      throw new AppError('Failed to fetch custom range sales analytics', 500);
    }
  },

  async getWeeklyRevenueAnalytics(weekStartDate = null) {
    try {
      const startOfWeek = weekStartDate ? new Date(weekStartDate) : new Date();
      if (!weekStartDate) {
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
        startOfWeek.setDate(diff);
      }
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      // Previous week calculation
      const prevWeekStart = new Date(startOfWeek);
      prevWeekStart.setDate(startOfWeek.getDate() - 7);
      prevWeekStart.setHours(0, 0, 0, 0);
      const prevWeekEnd = new Date(prevWeekStart);
      prevWeekEnd.setDate(prevWeekStart.getDate() + 6);
      prevWeekEnd.setHours(23, 59, 59, 999);

      // Current week items
      const currentWeekItems = await prisma.orderItem.findMany({
        where: {
          order: {
            status: { in: ['ACCEPTED', 'COMPLETED'] },
            updatedAt: { gte: startOfWeek, lte: endOfWeek }
          }
        },
        include: { order: true }
      });

      // Previous week items
      const previousWeekItems = await prisma.orderItem.findMany({
        where: {
          order: {
            status: { in: ['ACCEPTED', 'COMPLETED'] },
            updatedAt: { gte: prevWeekStart, lte: prevWeekEnd }
          }
        }
      });

      const currentWeekRevenue = currentWeekItems.reduce((sum, item) => sum + item.priceAtTimeOfPurchase, 0);
      const currentWeekSales = currentWeekItems.length;
      const previousWeekRevenue = previousWeekItems.reduce((sum, item) => sum + item.priceAtTimeOfPurchase, 0);
      const previousWeekSales = previousWeekItems.length;

      const revenueChange = previousWeekRevenue > 0
        ? ((currentWeekRevenue - previousWeekRevenue) / previousWeekRevenue) * 100
        : currentWeekRevenue > 0 ? 100 : 0;
      const purchasesChange = previousWeekSales > 0
        ? ((currentWeekSales - previousWeekSales) / previousWeekSales) * 100
        : currentWeekSales > 0 ? 100 : 0;

      const dailyBreakdown = Array.from({ length: 7 }, (_, i) => {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + i);
        return {
          date: day.toISOString().split('T')[0],
          dayName: day.toLocaleDateString('en-US', { weekday: 'long' }),
          revenue: 0,
          sales: 0
        };
      });

      currentWeekItems.forEach(item => {
        const orderDate = new Date(item.order.updatedAt);
        const dayIndex = (orderDate.getDay() + 6) % 7; // Monday is 0
        dailyBreakdown[dayIndex].revenue += item.priceAtTimeOfPurchase;
        dailyBreakdown[dayIndex].sales++;
      });

      return {
        weekPeriod: {
          start: startOfWeek.toISOString().split('T')[0],
          end: endOfWeek.toISOString().split('T')[0]
        },
        summary: {
          totalRevenue: Number(currentWeekRevenue.toFixed(2)),
          totalPurchases: currentWeekSales,
          revenueChange: Number(revenueChange.toFixed(2)),
          purchasesChange: Number(purchasesChange.toFixed(2))
        },
        dailyBreakdown,
        previousWeek: {
          totalRevenue: Number(previousWeekRevenue.toFixed(2)),
          totalPurchases: previousWeekSales
        }
      };
    } catch (error) {
      console.error('Error fetching weekly revenue analytics:', error);
      throw new AppError('Failed to fetch weekly revenue analytics', 500);
    }
  },

// Get 12-monthly sales analytics like January
async get12MonthlySalesAnalytics() {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIndex = now.getMonth(); // 0 for Jan, 1 for Feb, etc.
    
    const monthlyStats = [];
    let yearlyTotalRevenue = 0;
    let yearlyTotalPurchases = 0;

    for (let month = 0; month < 12; month++) {
      const startDate = new Date(currentYear, month, 1);
      // Skip future months for which there is no data yet
      if (month > currentMonthIndex) {
        monthlyStats.push({
          month: startDate.toLocaleString('default', { month: 'long' }),
          totalRevenue: 0,
          totalPurchases: 0
        });
        continue; // Go to the next iteration
      }

      const endDate = new Date(currentYear, month + 1, 0);
      endDate.setHours(23, 59, 59, 999);

      const orders = await prisma.order.findMany({
        where: {
          status: { in: ['ACCEPTED', 'COMPLETED'] },
          updatedAt: { gte: startDate, lte: endDate }
        }
      });

      const totalRevenue = orders.reduce((sum, order) => sum + (order.amount || 0), 0);
      const totalPurchases = orders.length;

      // Add to yearly totals
      yearlyTotalRevenue += totalRevenue;
      yearlyTotalPurchases += totalPurchases;

      monthlyStats.push({
        month: startDate.toLocaleString('default', { month: 'long' }),
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalPurchases
      });
    }

    // --- Calculate Summary Statistics After the Loop ---

    let revenueChange = 0;
    let purchasesChange = 0;

    // Ensure there is a previous month to compare against
    if (currentMonthIndex > 0) {
      const currentMonthData = monthlyStats[currentMonthIndex];
      const previousMonthData = monthlyStats[currentMonthIndex - 1];

      // Calculate Revenue Change Percentage
      if (previousMonthData.totalRevenue > 0) {
        revenueChange = ((currentMonthData.totalRevenue - previousMonthData.totalRevenue) / previousMonthData.totalRevenue) * 100;
      } else if (currentMonthData.totalRevenue > 0) {
        revenueChange = 100; // From 0 to a positive number is a 100% increase
      }

      // Calculate Purchases Change Percentage
      if (previousMonthData.totalPurchases > 0) {
        purchasesChange = ((currentMonthData.totalPurchases - previousMonthData.totalPurchases) / previousMonthData.totalPurchases) * 100;
      } else if (currentMonthData.totalPurchases > 0) {
        purchasesChange = 100;
      }
    }

    const summary = {
      totalRevenue: Number(yearlyTotalRevenue.toFixed(2)),
      totalPurchases: yearlyTotalPurchases,
      revenueChange: Number(revenueChange.toFixed(2)),
      purchasesChange: Number(purchasesChange.toFixed(2))
    };

    return { summary, monthlyStats };

  } catch (error) {
    console.error('Error fetching 12-monthly sales analytics:', error);
    throw new AppError('Failed to fetch 12-monthly sales analytics', 500);
  }
},


async  getMonthlySalesAnalytics(year, month) {
  try {
    // 1. Determine the date range for the requested month
    const monthIndex = month - 1;
    const startDate = new Date(year, monthIndex, 1);
    const endDate = new Date(year, monthIndex + 1, 0);
    endDate.setHours(23, 59, 59, 999);

    // 2. Determine the previous month range for comparison
    const prevMonthStart =
      monthIndex === 0
        ? new Date(year - 1, 11, 1)
        : new Date(year, monthIndex - 1, 1);
    const prevMonthEnd = new Date(
      prevMonthStart.getFullYear(),
      prevMonthStart.getMonth() + 1,
      0
    );
    prevMonthEnd.setHours(23, 59, 59, 999);

    // 3. Fetch orders for current and previous months
    const currentMonthOrders = await prisma.order.findMany({
      where: {
        status: { in: ['ACCEPTED', 'COMPLETED'] },
        updatedAt: { gte: startDate, lte: endDate },
      },
    });
    const previousMonthOrders = await prisma.order.findMany({
      where: {
        status: { in: ['ACCEPTED', 'COMPLETED'] },
        updatedAt: { gte: prevMonthStart, lte: prevMonthEnd },
      },
    });

    // 4. Compute totals and percentage changes
    const currentRevenue = currentMonthOrders.reduce(
      (sum, order) => sum + (order.amount || 0),
      0
    );
    const currentSalesCount = currentMonthOrders.length;
    const previousRevenue = previousMonthOrders.reduce(
      (sum, order) => sum + (order.amount || 0),
      0
    );
    const previousSalesCount = previousMonthOrders.length;

    const revenueChange =
      previousRevenue > 0
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
        : currentRevenue > 0
        ? 100
        : 0;
    const purchasesChange =
      previousSalesCount > 0
        ? ((currentSalesCount - previousSalesCount) / previousSalesCount) * 100
        : currentSalesCount > 0
        ? 100
        : 0;

    // 5. Split the month into fixed 7-day “weeks”
    const daysInMonth = endDate.getDate();             // e.g. 31
    const numberOfWeeks = Math.ceil(daysInMonth / 7);  // e.g. 5

    /** @type {WeekStat[]} */
    const weeklyStats = [];
    const weekBoundaries = [];

    for (let i = 0; i < numberOfWeeks; i++) {
      const weekNum = i + 1;
      const startDay = i * 7 + 1;
      const endDay = Math.min((i + 1) * 7, daysInMonth);

      const weekStart = new Date(year, monthIndex, startDay);
      const weekEnd = new Date(year, monthIndex, endDay);
      weekEnd.setHours(23, 59, 59, 999);

      weeklyStats.push({
        week: `Week ${weekNum}`,
        dateRange:
          `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` +
          ` - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        totalRevenue: 0,
        totalPurchase: 0,
      });
      weekBoundaries.push({ start: weekStart, end: weekEnd });
    }

    // 6. Assign each order to its week‐bucket
    currentMonthOrders.forEach((order) => {
      const orderDate = new Date(order.updatedAt);
      for (let i = 0; i < weekBoundaries.length; i++) {
        const { start, end } = weekBoundaries[i];
        if (orderDate >= start && orderDate <= end) {
          weeklyStats[i].totalRevenue += order.amount || 0;
          weeklyStats[i].totalPurchase++;
          break;
        }
      }
    });

    // 7. Round revenue values
    weeklyStats.forEach((w) => {
      w.totalRevenue = Number(w.totalRevenue.toFixed(2));
    });

    // 8. Return summary and weekly breakdown
    return {
      summary: {
        totalRevenue: Number(currentRevenue.toFixed(2)),
        totalPurchases: currentSalesCount,
        revenueChange: Number(revenueChange.toFixed(2)),
        purchasesChange: Number(purchasesChange.toFixed(2)),
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
    const skip = (page - 1) * limit;
    
    const [orders, totalOrders] = await Promise.all([
      prisma.order.findMany({
        where: { userId },
        include: {
          items: {
            include: {
              song: {
                select: {
                  id: true, title: true, coverImage: true, audioFile: true, pricing: true
                }
              }
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
  },

  // Get all orders (admin)
  async getAllOrders(page = 1, limit = 10, filters = {}) {
    const skip = (page - 1) * limit;
    const { status, userId, songId, startDate, endDate } = filters;
    
    let whereClause = {};
    if (status) whereClause.status = status;
    if (userId) whereClause.userId = userId;
    if (songId) whereClause.items = { some: { songId: songId } };
    
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = new Date(startDate);
      if (endDate) whereClause.createdAt.lte = new Date(endDate);
    }
    
    const [orders, totalOrders] = await Promise.all([
      prisma.order.findMany({
        where: whereClause,
        include: {
          user: { select: { id: true, name: true, email: true } },
          items: { include: { song: true } }
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
  },

  // Get order by ID
  async getOrderById(orderId, userId, userRole = 'user') {
    let whereClause = { id: orderId };
    if (userRole !== 'admin') {
      whereClause.userId = userId;
    }

    const order = await prisma.order.findUnique({
      where: whereClause,
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            song: {
              select: {
                id: true, title: true, pricing: true, coverImage: true, audioFile: true
              }
            }
          }
        }
      }
    });

    if (!order) {
      throw new AppError('Order not found or you do not have permission to view it', 404);
    }

    return order;
  },

  // Cancel order
  async cancelOrder(orderId, userId) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: userId }
    });

    if (!order) {
      throw new AppError('Order not found or you are not authorized to cancel it', 404);
    }
    if (order.status === 'COMPLETED') throw new AppError('Cannot cancel a completed order', 400);
    if (order.status === 'FAILED' || order.status === 'REFUNDED') throw new AppError('Order is already cancelled/refunded', 400);

    const cancelledOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: 'FAILED', updatedAt: new Date() },
      include: { items: { include: { song: true } } }
    });

    return cancelledOrder;
  },

  // Process refund for an order
  async processRefund(orderId, refundData = {}) {
    const { reason, refundAmount, adminUserId, notes } = refundData;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) throw new AppError('Order not found', 404);
    if (order.status !== 'ACCEPTED' && order.status !== 'COMPLETED') throw new AppError('Only accepted or completed orders can be refunded', 400);
    if (order.status === 'REFUNDED') throw new AppError('Order is already refunded', 400);
    
    const maxRefundAmount = order.amount;
    const actualRefundAmount = refundAmount !== undefined ? refundAmount : maxRefundAmount;

    if (actualRefundAmount < 0 || actualRefundAmount > maxRefundAmount) {
      throw new AppError(`Refund amount must be between 0 and ${maxRefundAmount}`, 400);
    }

    const refundTransactionId = `refund_${Date.now()}`;
    const newMetadata = {
      ...order.metadata,
      refundReason: reason || 'No reason provided',
      refundAmount: actualRefundAmount,
      refundProcessedAt: new Date().toISOString(),
      refundTransactionId,
      refundAdminUserId: adminUserId,
      refundNotes: notes || ''
    };

    const refundedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'REFUNDED',
        updatedAt: new Date(),
        metadata: newMetadata
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: { include: { song: true } }
      }
    });

    console.log('Refund processed successfully:', orderId);
    return refundedOrder;
  },

  // Get refund analytics
  async getRefundAnalytics(startDate, endDate) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const refundedOrders = await prisma.order.findMany({
      where: {
        status: 'REFUNDED',
        updatedAt: { gte: start, lte: end }
      },
      include: {
        items: { include: { song: true } },
        user: { select: { id: true, name: true, email: true } }
      }
    });

    const completedOrders = await prisma.order.findMany({
      where: {
        status: 'COMPLETED',
        updatedAt: { gte: start, lte: end }
      }
    });

    let totalRefundAmount = 0;
    const refundsByReason = {};
    const refundsBySong = {};

    refundedOrders.forEach(order => {
      const metadata = order.metadata || {};
      const refundAmount = metadata.refundAmount || order.amount || 0;
      const reason = metadata.refundReason || 'Unknown';

      totalRefundAmount += refundAmount;

      if (!refundsByReason[reason]) {
        refundsByReason[reason] = { count: 0, totalAmount: 0 };
      }
      refundsByReason[reason].count++;
      refundsByReason[reason].totalAmount += refundAmount;

      order.items.forEach(item => {
        if (!refundsBySong[item.songId]) {
          refundsBySong[item.songId] = {
            songId: item.songId,
            songTitle: item.song?.title || 'Unknown',
            count: 0,
            totalRefundAmount: 0
          };
        }
        refundsBySong[item.songId].count++;
        refundsBySong[item.songId].totalRefundAmount += item.priceAtTimeOfPurchase;
      });
    });

    const totalRefunds = refundedOrders.length;
    const totalCompletedOrders = completedOrders.length;
    const refundRate = totalCompletedOrders > 0 ? (totalRefunds / totalCompletedOrders) * 100 : 0;
    const averageRefundAmount = totalRefunds > 0 ? totalRefundAmount / totalRefunds : 0;

    return {
      summary: {
        totalRefunds,
        totalRefundAmount: Number(totalRefundAmount.toFixed(2)),
        averageRefundAmount: Number(averageRefundAmount.toFixed(2)),
        refundRate: Number(refundRate.toFixed(2)),
      },
      refundsByReason: Object.entries(refundsByReason).map(([reason, data]) => ({
        reason,
        count: data.count,
        totalAmount: Number(data.totalAmount.toFixed(2)),
      })),
      topRefundedSongs: Object.values(refundsBySong).sort((a, b) => b.count - a.count).slice(0, 10),
    };
  },

  // Check refund eligibility
  async checkRefundEligibility(orderId) {
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) throw new AppError('Order not found', 404);

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
  },

  // Get all refunds with filters
  async getAllRefunds(page = 1, limit = 10, filters = {}) {
    const skip = (page - 1) * limit;
    const { startDate, endDate, reason, songId, userId } = filters;

    let whereClause = { status: 'REFUNDED' };

    if (startDate || endDate) {
      whereClause.updatedAt = {};
      if (startDate) whereClause.updatedAt.gte = new Date(startDate);
      if (endDate) whereClause.updatedAt.lte = new Date(endDate);
    }
    if (reason) {
      whereClause.metadata = { path: ['refundReason'], string_contains: reason };
    }
    if (songId) whereClause.items = { some: { songId: songId } };
    if (userId) whereClause.userId = userId;

    const [refunds, totalRefunds] = await Promise.all([
      prisma.order.findMany({
        where: whereClause,
        include: {
          user: { select: { id: true, name: true, email: true } },
          items: { include: { song: true } }
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
  },

  // Update order status (for admin)
  async updateOrderStatus(orderId, status) {
    const validStatuses = ['PENDING', 'ACCEPTED', 'COMPLETED', 'FAILED', 'REFUNDED'];
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
        user: { select: { id: true, name: true, email: true } },
        items: { include: { song: true } }
      }
    });

    return updatedOrder;
  }
};

export default paymentService;
