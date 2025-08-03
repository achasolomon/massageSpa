const { Booking, Payment, Service, Therapist, User, ServiceOption, sequelize } = require("../models");
const { Op } = require("sequelize");
const { format, startOfDay, endOfDay, parseISO } = require("date-fns");
const { fn, col } = require('sequelize');

// Get Revenue Report (Admin only)
exports.getRevenueReport = async (req, res) => {
  const { startDate, endDate, includeStatuses } = req.query;
  const statusFilter = includeStatuses ? includeStatuses.split(',') : ['Succeeded', 'Failed', 'Pending', 'Refunded'];

  if (!startDate || !endDate) {
    return res.status(400).json({ message: "Start date and end date are required." });
  }

  try {
    // Base query conditions
    const baseConditions = {
      createdAt: {
        [Op.between]: [startOfDay(parseISO(startDate)), endOfDay(parseISO(endDate))]
      },
      status: {
        [Op.in]: statusFilter
      }
    };

    // 1. Get total revenue and counts by status
    const summary = await Payment.findAll({
      where: baseConditions,
      attributes: [
        'status',
        [sequelize.fn('SUM', sequelize.col('amount')), 'totalRevenue'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'paymentCount']
      ],
      group: ['status'],
      raw: true
    });

    // 2. Get daily breakdown
    const dailyRevenue = await Payment.findAll({
      where: baseConditions,
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        'status',
        [sequelize.fn('SUM', sequelize.col('amount')), 'totalRevenue'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'paymentCount']
      ],
      group: ['date', 'status'],
      order: [['date', 'ASC']],
      raw: true
    });

    // 3. Get booking count (if needed)
    const bookingCount = await Booking.count({
      where: {
        createdAt: {
          [Op.between]: [startOfDay(parseISO(startDate)), endOfDay(parseISO(endDate))]
        }
      }
    });

    // Calculate totals
    const totalRevenue = summary.reduce((acc, item) => acc + parseFloat(item.totalRevenue || 0), 0);
    const totalBookings = bookingCount;
    const averageBookingValue = totalBookings > 0 ? (totalRevenue / totalBookings) : 0;

    // Format byStatus object for frontend
    const byStatus = summary.reduce((acc, item) => {
      acc[item.status] = {
        totalRevenue: parseFloat(item.totalRevenue || 0),
        paymentCount: parseInt(item.paymentCount || 0)
      };
      return acc;
    }, {});

    const response = {
      totalRevenue: totalRevenue.toFixed(2),
      byStatus,
      dailyRevenue: dailyRevenue.map(item => ({
        date: item.date,
        status: item.status,
        totalRevenue: parseFloat(item.totalRevenue || 0),
        paymentCount: parseInt(item.paymentCount || 0)
      })),
      totalBookings,
      averageBookingValue: averageBookingValue.toFixed(2)
    };

    res.json(response);

  } catch (error) {
    console.error("Error in revenue report:", error);
    res.status(500).json({
      message: "Server error while generating revenue report.",
      error: error.message
    });
  }
};



// Get Booking Statistics Report (Admin only)
exports.getBookingStatsReport = async (req, res) => {
  const { startDate, endDate, therapistId, serviceId } = req.query;

  try {
    // Base where clause for all queries
    const baseWhere = {};
    
    // Date filters
    if (startDate && endDate) {
      baseWhere.createdAt = {
        [Op.between]: [startOfDay(parseISO(startDate)), endOfDay(parseISO(endDate))]
      };
    } else if (startDate) {
      baseWhere.createdAt = { [Op.gte]: startOfDay(parseISO(startDate)) };
    } else if (endDate) {
      baseWhere.createdAt = { [Op.lte]: endOfDay(parseISO(endDate)) };
    }

    // Additional filters
    if (therapistId) baseWhere.therapistId = therapistId;
    if (serviceId) baseWhere.serviceOptionId = serviceId;

    // Where clause specifically for confirmed bookings
    const confirmedWhere = { ...baseWhere, status: 'Confirmed' };

    // 1. Get total confirmed bookings (primary metric)
    const totalConfirmed = await Booking.count({ where: confirmedWhere });

    // 2. Get status breakdown (including confirmed)
    const statusStats = await Booking.findAll({
      where: baseWhere, // All statuses
      attributes: ["status", [fn("COUNT", col("id")), "count"]],
      group: ["status"],
      raw: true,
    });

    // Calculate derived metrics
    const totalNoShow = parseInt(statusStats.find(s => s.status === "No Show")?.count || 0);
    const totalCancelled = statusStats
      .filter(s => ["Cancelled By Client", "Cancelled By Staff"].includes(s.status))
      .reduce((sum, s) => sum + parseInt(s.count), 0);

    const noShowRate = totalConfirmed > 0 ? totalNoShow / totalConfirmed : 0;

    // 3. Get confirmed bookings by service
    const confirmedByService = await Booking.findAll({
      where: confirmedWhere,
      attributes: ["serviceOptionId", [fn("COUNT", col("id")), "count"]],
      group: ["serviceOptionId"],
      raw: true,
    });

    // 4. Get confirmed bookings by therapist
    const confirmedByTherapist = await Booking.findAll({
      where: {
        ...confirmedWhere,
        therapistId: { [Op.not]: null },
      },
      attributes: ["therapistId", [fn("COUNT", col("id")), "count"]],
      group: ["therapistId"],
      raw: true,
    });

    // 5. Peak booking hours for confirmed bookings
    const peakTimes = await Booking.findAll({
      where: confirmedWhere,
      attributes: [
        [fn('HOUR', col('bookingStartTime')), 'hour'],
        [fn("COUNT", col("id")), "count"]
      ],
      group: [fn('HOUR', col('bookingStartTime'))],
      order: [[fn("COUNT", col("id")), "DESC"]],
      limit: 5,
      raw: true,
    });

    // Calculate average per day if date range provided
    let avgBookingsPerDay = 0;
    if (startDate && endDate) {
      const dayDiff = Math.max(1, Math.ceil((parseISO(endDate) - parseISO(startDate)) / (1000 * 60 * 60 * 24)));
      avgBookingsPerDay = totalConfirmed / dayDiff;
    }

    // Prepare response
    res.json({
      // Primary metrics
      totalConfirmed,
      noShowRate,
      avgBookingsPerDay: Math.round(avgBookingsPerDay * 100) / 100,
      
      // Breakdowns
      confirmedByService: confirmedByService.map(item => ({
        serviceOptionId: item.serviceOptionId,
        count: parseInt(item.count),
      })),
      confirmedByTherapist: confirmedByTherapist.map(item => ({
        therapistId: item.therapistId,
        count: parseInt(item.count),
      })),
      statusBreakdown: statusStats.map(s => ({
        status: s.status,
        count: parseInt(s.count),
      })),
      peakBookingTimes: peakTimes.map(item => ({
        hour: `${item.hour}:00`,
        count: parseInt(item.count),
      })),
      
      // Metadata
      reportPeriod: { 
        startDate: startDate || null, 
        endDate: endDate || null 
      },
      filters: { 
        therapistId: therapistId || null, 
        serviceId: serviceId || null 
      },
      generatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Error generating booking stats report:", error);
    res.status(500).json({
      message: "Server error while generating booking stats report.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};



