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
// Get Booking Statistics Report (Admin only)
// Get Booking Statistics Report (Admin only) - Clean Version
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

    console.log('Base where clause:', baseWhere);

    // 1. Get status breakdown with all bookings
    const statusStats = await Booking.findAll({
      where: baseWhere,
      attributes: ["status", [fn("COUNT", col("id")), "count"]],
      group: ["status"],
      raw: true,
    });

    console.log('Status stats:', statusStats);

    // Calculate metrics from status breakdown
    const getStatusCount = (status) => {
      const found = statusStats.find(s => s.status === status);
      return parseInt(found?.count || 0);
    };

    const totalConfirmed = getStatusCount('Confirmed');
    const totalCompleted = getStatusCount('Completed');
    const totalNoShow = getStatusCount('No Show');
    const totalCancelledByClient = getStatusCount('Cancelled By Client');
    const totalCancelledByStaff = getStatusCount('Cancelled By Staff');
    const totalCancelled = totalCancelledByClient + totalCancelledByStaff;

    // Total bookings (all statuses)
    const totalBookings = statusStats.reduce((sum, s) => sum + parseInt(s.count), 0);
    const noShowRate = totalConfirmed > 0 ? totalNoShow / totalConfirmed : 0;

    // 2. Get bookings by service option ID
    const bookingsByServiceOption = await Booking.findAll({
      where: baseWhere,
      attributes: [
        'serviceOptionId',
        [fn("COUNT", col("id")), "count"]
      ],
      group: ['serviceOptionId'],
      raw: true
    });

    console.log('Bookings by service option:', bookingsByServiceOption);

    // 3. Get bookings by therapist ID
    const bookingsByTherapistId = await Booking.findAll({
      where: {
        ...baseWhere,
        therapistId: { [Op.not]: null },
      },
      attributes: [
        'therapistId',
        [fn("COUNT", col("id")), "count"]
      ],
      group: ['therapistId'],
      raw: true
    });

    console.log('Bookings by therapist ID:', bookingsByTherapistId);

    // 4. Get therapist details using the therapist IDs
    const therapistIds = bookingsByTherapistId.map(b => b.therapistId);
    let therapistDetails = [];
    
    if (therapistIds.length > 0) {
      // Get therapist records with their userId
      const therapists = await Therapist.findAll({
        where: { id: { [Op.in]: therapistIds } },
        attributes: ['id', 'userId'],
        raw: true
      });

      // Get user details for these therapists
      const userIds = therapists.map(t => t.userId);
      const users = await User.findAll({
        where: { id: { [Op.in]: userIds } },
        attributes: ['id', 'firstName', 'lastName'],
        raw: true
      });

      // Map therapist ID to user name
      therapistDetails = therapists.map(therapist => {
        const user = users.find(u => u.id === therapist.userId);
        return {
          therapistId: therapist.id,
          name: user ? `${user.firstName} ${user.lastName}` : 'Unknown Therapist'
        };
      });
    }

    console.log('Therapist details:', therapistDetails);

    // 5. Get service option details using the service option IDs
    const serviceOptionIds = bookingsByServiceOption.map(b => b.serviceOptionId);
    let serviceDetails = [];
    
    if (serviceOptionIds.length > 0) {
      // Get service options with their service details
      const serviceOptions = await ServiceOption.findAll({
        where: { id: { [Op.in]: serviceOptionIds } },
        include: [
          {
            model: Service,
            as: 'service', 
            attributes: ['name']
          }
        ],
        raw: true,
        nest: true
      });

      serviceDetails = serviceOptions.map(option => ({
        serviceOptionId: option.id,
        serviceName: option.service?.name || 'Unknown Service',
        optionName: option.optionName || 'Unknown Option'
      }));
    }

    console.log('Service details:', serviceDetails);

    // 6. Peak booking hours
    const peakTimes = await Booking.findAll({
      where: baseWhere,
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
      avgBookingsPerDay = totalBookings / dayDiff;
    }

    // Format data for frontend
    const formattedBookingsByService = bookingsByServiceOption.map(item => {
      const serviceDetail = serviceDetails.find(s => s.serviceOptionId === item.serviceOptionId);
      return {
        serviceName: serviceDetail?.serviceName || `Service Option ${item.serviceOptionId}`,
        serviceOptionName: serviceDetail?.optionName || '',
        count: parseInt(item.count)
      };
    });

    const formattedBookingsByTherapist = bookingsByTherapistId.map(item => {
      const therapistDetail = therapistDetails.find(t => t.therapistId === item.therapistId);
      return {
        therapistName: therapistDetail?.name || `Therapist ${item.therapistId}`,
        therapistId: item.therapistId,
        count: parseInt(item.count)
      };
    });

    // Prepare response with correct property names expected by frontend
    res.json({
      // Primary metrics
      totalBookings,
      totalConfirmed,
      totalCompleted,
      totalCancelled,
      noShowRate,
      avgBookingsPerDay: Math.round(avgBookingsPerDay * 100) / 100,
      
      // Breakdowns with correct property names
      bookingsByService: formattedBookingsByService,
      bookingsByTherapist: formattedBookingsByTherapist,
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
    console.error("Error stack:", error.stack);
    res.status(500).json({
      message: "Server error while generating booking stats report.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};


