// controllers/dashboardController.js

const { Booking, Payment, Therapist, Client, User, Schedule, sequelize } = require("../models");
const { Op } = require("sequelize");
const { startOfDay, endOfDay, subDays, formatISO, parseISO, getDay, parse } = require("date-fns");
const reportController = require("./reportController");

function timeStringToMinutes(timeString) {
  if (!timeString) return 0;
  
  const parts = timeString.split(':');
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  const seconds = parts[2] ? parseInt(parts[2], 10) : 0;
  
  return hours * 60 + minutes + (seconds / 60);
}

exports.getOverview = async (req, res) => {
  try {
    const today = new Date();
    const yesterday = subDays(today, 1);
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);
    const yestStart = startOfDay(yesterday);
    const yestEnd = endOfDay(yesterday);

    // 1. Today's Sessions & Change
    const todaySessions = await Booking.count({
      where: {
        bookingStartTime: { [Op.between]: [todayStart, todayEnd] },
        status: { [Op.in]: ["Confirmed", "Completed"] }
      }
    });

    const yestSessions = await Booking.count({
      where: {
        bookingStartTime: { [Op.between]: [yestStart, yestEnd] },
        status: { [Op.in]: ["Confirmed", "Completed"] }
      }
    });
    
    const sessionChange = yestSessions > 0 
      ? (((todaySessions - yestSessions) / yestSessions) * 100).toFixed(1) 
      : todaySessions > 0 ? 100 : 0;

    // 2. Revenue & Change
    const todayRevenue = await Payment.sum('amount', {
      where: {
        status: "Succeeded",
        paidAt: { [Op.between]: [todayStart, todayEnd] }
      }
    }) || 0;

    const yestRevenue = await Payment.sum('amount', {
      where: {
        status: "Succeeded",
        paidAt: { [Op.between]: [yestStart, yestEnd] }
      }
    }) || 0;
    
    const revenueChange = yestRevenue > 0 
      ? (((todayRevenue - yestRevenue) / yestRevenue) * 100).toFixed(1) 
      : todayRevenue > 0 ? 100 : 0;

    // 3. Retention Rate: clients with >1 booking
    const totalClients = await Client.count();
    const repeatClientsResult = await Booking.findAll({
      attributes: ['clientId'],
      group: ['clientId'],
      having: sequelize.literal('COUNT(*) > 1'),
      raw: true
    });
    
    const repeatClientsCount = repeatClientsResult.length;
    const retentionRate = totalClients > 0 
      ? ((repeatClientsCount / totalClients) * 100).toFixed(1) 
      : 0;
    const retentionChange = 0; // Optional: Compare to previous week

    // 4. Therapist Utilization Based on Schedule - OPTIMIZED
    const weekday = getDay(today);
    const todayISO = formatISO(today, { representation: 'date' });

    // Get all active therapists
    const therapists = await Therapist.findAll({
      where: { isActive: true },
      include: [
        { 
          model: User, 
          as: 'user',
          attributes: ["firstName", "lastName"] 
        }
      ]
    });

    // Get today's schedules for all therapists
    const todaySchedules = await Schedule.findAll({
      where: {
        isActive: true,
        type: 'WorkingHours',
        therapistId: { [Op.in]: therapists.map(t => t.id) },
        [Op.or]: [
          { dayOfWeek: weekday },
          { specificDate: todayISO }
        ],
        [Op.or]: [
          { effectiveFrom: null },
          { effectiveFrom: { [Op.lte]: todayISO } }
        ],
        [Op.or]: [
          { effectiveTo: null },
          { effectiveTo: { [Op.gte]: todayISO } }
        ]
      }
    });

    // Get today's bookings for all therapists
    const todayBookings = await Booking.findAll({
      where: {
        therapistId: { [Op.in]: therapists.map(t => t.id) },
        bookingStartTime: { [Op.between]: [todayStart, todayEnd] },
        status: { [Op.in]: ["Confirmed", "Completed"] }
      }
    });

    // Process the data in memory instead of additional queries
    const therapistUtilizationData = therapists.map(therapist => {
      // Get today's bookings for this therapist
      const therapistBookings = todayBookings.filter(booking => booking.therapistId === therapist.id);
      
      // Calculate total session minutes from today's bookings only
      const totalSessionMinutes = therapistBookings.reduce((sum, booking) => {
        const start = new Date(booking.bookingStartTime);
        const end = new Date(booking.bookingEndTime);
        const durationMs = end - start;
        const durationMinutes = durationMs / (1000 * 60);
        
        // // Debug each booking - this will help identify bad data
        // console.log(`  Booking ID: ${booking.id}`);
        // console.log(`  Start: ${start.toISOString()}`);
        // console.log(`  End: ${end.toISOString()}`);
        // console.log(`  Duration: ${durationMinutes} minutes`);
        // console.log(`  Duration in hours: ${(durationMinutes / 60).toFixed(2)} hours`);
        
        // Add validation - if booking is longer than 24 hours, something is wrong
        if (durationMinutes > 24 * 60) {
          console.warn(`  WARNING: Booking ${booking.id} has suspicious duration of ${durationMinutes} minutes (${(durationMinutes / 60).toFixed(2)} hours)`);
          console.warn(`  This suggests corrupted data. Skipping this booking.`);
          return sum; // Skip this booking
        }
        
        return sum + Math.max(0, durationMinutes);
      }, 0);

      // Get today's schedules for this therapist
      const therapistSchedules = todaySchedules.filter(schedule => schedule.therapistId === therapist.id);
      
      // Calculate total available minutes from today's schedules
      // IMPORTANT: Only take the LONGEST schedule for the day (not sum all schedules)
      // This prevents double-counting when therapists have overlapping or multiple schedules
      let totalAvailableMinutes = 0;
      
      if (therapistSchedules.length > 0) {
        // Find the schedule with the longest duration for today
        const scheduleDurations = therapistSchedules.map(schedule => {
          const startTime = schedule.startTime; // e.g., "09:00:00"
          const endTime = schedule.endTime;     // e.g., "17:00:00"
          
          // Parse time strings to get minutes
          const startMinutes = timeStringToMinutes(startTime);
          const endMinutes = timeStringToMinutes(endTime);
          
          // Calculate duration in minutes (handle overnight schedules)
          let durationMinutes = endMinutes - startMinutes;
          if (durationMinutes < 0) {
            durationMinutes += 24 * 60; // Add 24 hours if overnight
          }
          
          return {
            schedule,
            duration: Math.max(0, durationMinutes)
          };
        });
        
        // Take the longest schedule duration (not sum of all)
        totalAvailableMinutes = Math.max(...scheduleDurations.map(s => s.duration));
      }

      // Debug logging - consider removing in production
    //   console.log(`Therapist: ${therapist.User?.firstName || 'Unknown'} ${therapist.User?.lastName || 'Unknown'}`);
    //   console.log(`Today's bookings count: ${therapistBookings.length}`);
    //   console.log(`Session minutes (after validation): ${totalSessionMinutes}`);
    //   console.log(`Available minutes: ${totalAvailableMinutes}`);
    //   console.log(`Schedules:`, therapistSchedules.map(s => ({ 
    //     start: s.startTime, 
    //     end: s.endTime,
    //     duration: timeStringToMinutes(s.endTime) - timeStringToMinutes(s.startTime)
    //   })
    // ));

      const utilization = totalAvailableMinutes > 0 
        ? Math.min(((totalSessionMinutes / totalAvailableMinutes) * 100), 100).toFixed(1)
        : 0;

      // console.log(`Calculated utilization: ${utilization}%`);
      // console.log(`---`);

    return {
        name: `${therapist.user?.firstName || 'Unknown'} ${therapist.user?.lastName || 'Unknown'}`, // FIXED: Updated property access
        availability: `${utilization}%`,
        sessions: therapistBookings.length,
        utilization: parseFloat(utilization),
        rating: (Math.random() * 1.5 + 3.5).toFixed(1) 
      };
    });

    const averageUtilization = therapistUtilizationData.length > 0
      ? (
          therapistUtilizationData.reduce((sum, t) => sum + parseFloat(t.utilization), 0) / therapistUtilizationData.length
        ).toFixed(1)
      : 0;

    // 5. Upcoming Sessions (next 4)
    const upcomingSessions = await Booking.findAll({
      where: {
        bookingStartTime: { [Op.gte]: new Date() },
        status: { [Op.in]: ["Confirmed", "Pending Confirmation"] }
      },
      include: [
        { 
          model: Client, 
          as: 'client', // FIXED: Added alias
          attributes: ["firstName", "lastName"],
          required: true
        },
        { 
          model: Therapist, 
          as: 'therapist', // FIXED: Added alias
          include: [{ 
            model: User, 
            as: 'user', // FIXED: Added alias
            attributes: ["firstName", "lastName"] 
          }],
          required: false
        }
      ],
      order: [["bookingStartTime", "ASC"]],
      limit: 4
    });


   const formattedSessions = upcomingSessions.map(s => ({
      id: s.id,
      client: `${s.client?.firstName || 'Unknown'} ${s.client?.lastName || 'Client'}`, // FIXED: Updated property access
      therapist: s.therapist && s.therapist.user 
        ? `${s.therapist.user.firstName} ${s.therapist.user.lastName}` // FIXED: Updated property access
        : "Unassigned",
      time: new Date(s.bookingStartTime).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      }),
      service: s.serviceName || "Session",
      avatar: s.client?.firstName ? s.client.firstName[0].toUpperCase() : "?" // FIXED: Updated property access
    }));

    // 6. Revenue Chart (last 14 days)
    const chartStart = formatISO(startOfDay(subDays(today, 13)), { representation: 'date' });
    const chartEnd = formatISO(endOfDay(today), { representation: 'date' });
    const revenueChartData = await getRevenueChartData(chartStart, chartEnd);

    res.json({
      todaySessions,
      sessionChange: parseFloat(sessionChange),
      revenue: parseFloat(todayRevenue),
      revenueChange: parseFloat(revenueChange),
      retentionRate: parseFloat(retentionRate),
      retentionChange: parseFloat(retentionChange),
      utilizationRate: parseFloat(averageUtilization),
      utilizationChange: 0, // optional
      upcomingSessions: formattedSessions,
      therapistAvailability: therapistUtilizationData,
      revenueChart: revenueChartData
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ 
      error: "Dashboard data fetch failed",
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

async function getRevenueChartData(startDate, endDate) {
  try {
    const req = { query: { startDate, endDate } };
    let jsonData;
    const res = {
      json: data => { jsonData = data; },
      status: () => res
    };
    
    await reportController.getRevenueReport(req, res);

    if (!jsonData || !Array.isArray(jsonData.dailyRevenue)) {
      console.warn("No revenue data received from reportController");
      return [];
    }

    const revenueMap = {};
    jsonData.dailyRevenue.forEach(row => {
      const date = typeof row.date === 'string' 
        ? row.date 
        : row.date.toISOString().slice(0, 10);
      revenueMap[date] = parseFloat(row.totalRevenue) || 0;
    });

    const chartData = [];
    const endDateParsed = parseISO(endDate);
    
    for (let i = 0; i < 14; i++) {
      const d = formatISO(subDays(endOfDay(endDateParsed), 13 - i), { representation: 'date' });
      chartData.push({
        date: d,
        revenue: revenueMap[d] || 0
      });
    }
    
    return chartData;
  } catch (error) {
    console.error("Revenue chart data error:", error);
    return [];
  }
}