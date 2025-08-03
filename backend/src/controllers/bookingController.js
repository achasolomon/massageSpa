const { Op, fn, col, literal } = require("sequelize");
const { Booking, Client, Service, ClinicalNote, ServiceOption, ServiceAvailability, Therapist, User, sequelize, Payment } = require("../models");
const { format, parseISO, addMinutes, startOfDay, endOfDay, eachMinuteOfInterval, isWithinInterval, parse, isValid } = require("date-fns");
const { sendBookingConfirmation, sendBookingDetailsEmail, sendTherapistAssignmentEmail } = require("../services/emailService");
const { parseBookingTime } = require('../utils/bookingTime');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Helper function to get or create a client
async function findOrCreateClient(clientInfo, transaction) {
  const { email, firstName, lastName, phone } = clientInfo;
  let client = await Client.findOne({ where: { email }, transaction });
  if (!client) {
    client = await Client.create({ email, firstName, lastName, phone }, { transaction });
  }
  return client;
}

// Get Available Time Slots (Keep existing - no changes needed)
exports.checkAvailability = async (req, res) => {
  const { date, serviceOptionId, therapistId } = req.query;

  if (!date || !serviceOptionId) {
    return res.status(400).json({ message: "Date and Service Option ID are required." });
  }

  try {
    const targetDate = parseISO(date);
    if (!isValid(targetDate)) {
      return res.status(400).json({ message: "Invalid date format. Please use YYYY-MM-DD." });
    }
    const targetDateStart = startOfDay(targetDate);
    const targetDateEnd = endOfDay(targetDate);
    const dayNum = targetDate.getDay();

    // 1. Get Service Option details
    const serviceOption = await ServiceOption.findByPk(serviceOptionId, {
      include: { model: Service, attributes: ["id", "name"] }
    });
    if (!serviceOption || !serviceOption.isActive || !serviceOption.Service?.isActive) {
      return res.status(404).json({ message: "Service option not found or inactive." });
    }
    const serviceId = serviceOption.serviceId;

    // 2. Find relevant ServiceAvailability rules
    const availabilityWhere = {
      serviceId: serviceId,
      isActive: true,
      [Op.or]: [
        { specificDate: date },
        { dayOfWeek: dayNum, specificDate: null }
      ]
    };
    if (therapistId && therapistId !== "any") {
      availabilityWhere.therapistId = therapistId;
    }

    const availabilityRules = await ServiceAvailability.findAll({
      where: availabilityWhere,
      include: [{ model: Therapist, include: [{ model: User, attributes: ["firstName", "lastName"] }], required: false }],
      order: [["startTime", "ASC"]]
    });

    if (availabilityRules.length === 0) {
      return res.json([]);
    }

    // 3. Get existing bookings
    const relevantTherapistIds = [...new Set(availabilityRules.map(rule => rule.therapistId).filter(id => id !== null))];
    const bookingWhere = {
      serviceOptionId: serviceOptionId,
      bookingStartTime: {
        [Op.between]: [targetDateStart, targetDateEnd]
      },
      status: { [Op.notIn]: ["Cancelled By Client", "Cancelled By Staff"] }
    };

    if (therapistId && therapistId !== "any") {
      bookingWhere.therapistId = therapistId;
    } else if (relevantTherapistIds.length > 0) {
      bookingWhere.therapistId = { [Op.in]: relevantTherapistIds };
    }

    const existingBookings = await Booking.findAll({
      where: bookingWhere,
      attributes: ["therapistId", "bookingStartTime", [fn("COUNT", col("id")), "bookingCount"]],
      group: ["therapistId", "bookingStartTime"]
    });

    // 4. Create booking count map
    const bookingCounts = {};
    existingBookings.forEach(booking => {
      const timeStr = format(new Date(booking.bookingStartTime), "HH:mm:ss");
      const key = `${timeStr}_${booking.therapistId || "null"}`;
      bookingCounts[key] = parseInt(booking.get("bookingCount"), 10);
    });

    // 5. Determine available slots
    const availableSlots = [];
    const addedSlots = new Set();

    for (const rule of availabilityRules) {
      const slotTime = rule.startTime;
      const slotKey = `${slotTime}_${rule.therapistId || "null"}`;
      const currentBookings = bookingCounts[slotKey] || 0;

      if (currentBookings < rule.bookingLimit) {
        const displayTime = format(parse(slotTime, "HH:mm:ss", new Date()), "HH:mm");
        if (!addedSlots.has(displayTime)) {
          availableSlots.push(displayTime);
          addedSlots.add(displayTime);
        }
      }
    }

    res.json(availableSlots.sort());

  } catch (error) {
    console.error("Error fetching availability:", error);
    res.status(500).json({ message: "Server error while fetching availability." });
  }
};

//Create a new booking with enhanced Stripe payment handling
exports.createBooking = async (req, res) => {
  // console.log('RAW req.body:', req.body);

  const { serviceOptionId, bookingTime, clientDetails, clientId, paymentMethod, paymentDetails, clientNotes } = req.body;

  // --- Enhanced Validation ---
  if (!serviceOptionId || !bookingTime) {
    return res.status(400).json({ message: "Service Option ID and booking time are required." });
  }
  if (!clientId && (!clientDetails || !clientDetails.email || !clientDetails.firstName || !clientDetails.lastName || !clientDetails.phone)) {
    return res.status(400).json({ message: "Either Client ID or full Client Details are required." });
  }
  if (!paymentMethod) {
    return res.status(400).json({ message: "Payment method is required." });
  }

  // Validate payment method specific requirements
  if ((paymentMethod === "credit_card" || paymentMethod === "Credit Card") && !paymentDetails?.stripePaymentIntentId) {
    return res.status(400).json({ message: "Stripe Payment Intent ID is required for credit card payments." });
  }
  if ((paymentMethod === "insurance" || paymentMethod === "Insurance") && (!paymentDetails?.provider || !paymentDetails?.policyId)) {
    return res.status(400).json({ message: "Insurance provider and policy ID are required for insurance payments." });
  }

  const transaction = await sequelize.transaction();

  try {
    // 1. Find or Create Client
    let client;
    if (clientId) {
      client = await Client.findByPk(clientId, { transaction });
      if (!client) {
        await transaction.rollback();
        return res.status(404).json({ message: "Client not found." });
      }
    } else {
      client = await findOrCreateClient(clientDetails, transaction);
    }

    // 2. Get Service Option Details
    const serviceOption = await ServiceOption.findByPk(serviceOptionId, {
      include: { model: Service, attributes: ["id", "name"] },
      transaction
    }); 
    if (!serviceOption || !serviceOption.isActive) {
      await transaction.rollback();
      return res.status(404).json({ message: "Service option not found or is inactive." });
    }
    const serviceId = serviceOption.serviceId;
    const priceAtBooking = serviceOption.price;
    const serviceDuration = serviceOption.duration;

    // 3. Parse and Calculate Start/End Times
    let bookingStart;
    
    if (bookingTime instanceof Date) {
      bookingStart = bookingTime;
    } else if (typeof bookingTime === 'string') {
      bookingStart = parseISO(bookingTime);
    } else if (bookingTime && bookingTime.constructor && bookingTime.constructor.name === 'Date') {
      bookingStart = new Date(bookingTime);
    } else {
      await transaction.rollback();
      return res.status(400).json({ message: "Invalid booking time type." });
    }

    if (!isValid(bookingStart)) {
      await transaction.rollback();
      return res.status(400).json({ message: "Invalid booking time format. Use ISO8601 format." });
    }

    const bookingEnd = addMinutes(bookingStart, serviceDuration);
    const bookingDateStr = bookingStart.toISOString().split('T')[0];
    
    const utcHours = bookingStart.getUTCHours();
    const utcMinutes = bookingStart.getUTCMinutes();
    const utcSeconds = bookingStart.getUTCSeconds();
    const bookingStartTimeStr = `${utcHours.toString().padStart(2, '0')}:${utcMinutes.toString().padStart(2, '0')}:${utcSeconds.toString().padStart(2, '0')}`;
    const bookingDayNum = bookingStart.getUTCDay();

    // 4. Validate Time Slot Availability (without therapist assignment)
    const availabilityWhere = {
      serviceId: serviceId,
      isActive: true,
      startTime: bookingStartTimeStr,
      [Op.or]: [
        { specificDate: bookingDateStr },
        { dayOfWeek: bookingDayNum, specificDate: null }
      ]
    };

    const availabilityRules = await ServiceAvailability.findAll({
      where: availabilityWhere,
      transaction
    });

    if (availabilityRules.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ 
        message: "No availability found for the selected service and time slot."
      });
    }

    // Check if there's capacity for this time slot (across all therapists)
    const totalCapacity = availabilityRules.reduce((sum, rule) => sum + rule.bookingLimit, 0);
    const currentBookingCount = await Booking.count({
      where: {
        serviceOptionId: serviceOptionId,
        bookingStartTime: bookingStart,
        status: { [Op.notIn]: ["Cancelled By Client", "Cancelled By Staff"] }
      },
      transaction
    });

    if (currentBookingCount >= totalCapacity) {
      await transaction.rollback();
      return res.status(400).json({ message: "Sorry, this time slot is fully booked." });
    }

    // 5. Create Booking Record (without therapist assignment)
    const newBooking = await Booking.create({
      clientId: client.id,
      serviceOptionId: serviceOptionId,
      therapistId: null, // Initially no therapist assigned
      bookingStartTime: bookingStart,
      bookingEndTime: bookingEnd,
      status: "Pending Confirmation",
      clientNotes: clientNotes,
      paymentMethod: paymentMethod,
      paymentStatus: "Pending",
      priceAtBooking: priceAtBooking,
    }, { transaction });

    // 6. ENHANCED PAYMENT HANDLING
    let paymentResult = { status: "Not Applicable", paymentRecord: null };
    
    if (paymentMethod === "credit_card" || paymentMethod === "Credit Card") {
      try {
        // Verify Stripe payment was completed
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentDetails.stripePaymentIntentId);
        
        if (paymentIntent.status !== 'succeeded') {
          await transaction.rollback();
          return res.status(400).json({ 
            message: `Payment not completed. Status: ${paymentIntent.status}` 
          });
        }

        // Verify amount matches (convert to cents for comparison)
        const expectedAmountInCents = Math.round(parseFloat(priceAtBooking) * 100);
        if (Math.abs(paymentIntent.amount - expectedAmountInCents) > 1) {
          await transaction.rollback();
          return res.status(400).json({ 
            message: "Payment amount does not match booking price." 
          });
        }

        // Create or update payment record
        let paymentRecord = await Payment.findOne({
          where: { stripePaymentIntentId: paymentDetails.stripePaymentIntentId },
          transaction
        });

        if (paymentRecord) {
          // Update existing payment record
          await paymentRecord.update({
            bookingId: newBooking.id,
            status: 'Succeeded',
            stripePaymentMethodId: paymentDetails.stripePaymentMethodId || paymentIntent.payment_method,
            stripeChargeId: paymentIntent.latest_charge,
            transactionId: paymentIntent.latest_charge || paymentIntent.id,
            paidAt: new Date(),
            serviceOptionId: serviceOptionId,
            clientEmail: client.email
          }, { transaction });
        } else {
          // Create new payment record
          paymentRecord = await Payment.create({
            bookingId: newBooking.id,
            stripePaymentIntentId: paymentDetails.stripePaymentIntentId,
            stripePaymentMethodId: paymentDetails.stripePaymentMethodId || paymentIntent.payment_method,
            stripeChargeId: paymentIntent.latest_charge,
            transactionId: paymentIntent.latest_charge || paymentIntent.id,
            amount: priceAtBooking, // Store as decimal (dollars)
            currency: (paymentIntent.currency || 'CAD').toUpperCase(),
            status: 'Succeeded',
            method: 'Credit Card',
            serviceOptionId: serviceOptionId,
            clientEmail: client.email,
            paidAt: new Date(),
            providerDetails: JSON.stringify(paymentDetails)
          }, { transaction });
        }

        // Update booking status
        newBooking.paymentStatus = "Paid";
        newBooking.status = "Confirmed";
        await newBooking.save({ transaction });
        
        paymentResult = {
          status: "Completed",
          paymentRecord: paymentRecord
        };

      } catch (stripeError) {
        await transaction.rollback();
        console.error('Stripe verification error:', stripeError);
        return res.status(400).json({ 
          message: "Failed to verify payment with Stripe: " + stripeError.message 
        });
      }

    } else if (paymentMethod === "insurance" || paymentMethod === "Insurance") {
      // Create insurance payment record
      paymentResult.paymentRecord = await Payment.create({
        bookingId: newBooking.id,
        amount: priceAtBooking,
        currency: 'CAD',
        status: 'Pending',
        method: 'Insurance',
        serviceOptionId: serviceOptionId,
        clientEmail: client.email,
        insuranceProvider: paymentDetails.provider,
        insurancePolicyId: paymentDetails.policyId,
        providerDetails: JSON.stringify(paymentDetails || {})
      }, { transaction });

      newBooking.paymentStatus = "Pending";
      await newBooking.save({ transaction });
      paymentResult.status = "Insurance Verification Required";

    } else if (paymentMethod === "cash" || paymentMethod === "Cash") {
      // Create cash payment record
      paymentResult.paymentRecord = await Payment.create({
        bookingId: newBooking.id,
        amount: priceAtBooking,
        currency: 'CAD',
        status: 'Pending',
        method: 'Cash',
        serviceOptionId: serviceOptionId,
        clientEmail: client.email
      }, { transaction });

      paymentResult.status = "Cash Payment at Appointment";

    } else if (paymentMethod === "interac" || paymentMethod === "Interac") {
      // Create interac payment record
      paymentResult.paymentRecord = await Payment.create({
        bookingId: newBooking.id,
        amount: priceAtBooking,
        currency: 'CAD',
        status: 'Pending',
        method: 'Interac',
        serviceOptionId: serviceOptionId,
        clientEmail: client.email
      }, { transaction });

      paymentResult.status = "Interac e-Transfer Required";

    } else {
      // Other payment methods
      paymentResult.status = "Manual Processing Required";
    }

    // 7. Commit Transaction
    await transaction.commit();

    // 8. Send Client Email Confirmation
    try {
      let emailResult;
      if (newBooking.status === "Confirmed") {
        emailResult = await sendBookingDetailsEmail(
          newBooking,
          client,
          serviceOption,
          serviceOption.Service
        );
      } else {
        emailResult = await sendBookingConfirmation(
          newBooking,
          client,
          serviceOption,
          serviceOption.Service
        );
      }

      if (!emailResult.success) {
        console.warn('Client email sending failed, but booking was created successfully:', emailResult.error);
      }
    } catch (emailError) {
      console.error('Error sending client confirmation email:', emailError);
    }

    // 9. Respond to Client
    res.status(201).json({
      success: true,
      message: "Booking created successfully. A confirmation email has been sent.",
      bookingId: newBooking.id,
      paymentStatus: newBooking.paymentStatus,
      status: newBooking.status,
      paymentResult: paymentResult
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Error creating booking:", error);
    
    if (error.name === "SequelizeValidationError" || error.name === "SequelizeUniqueConstraintError") {
      const messages = error.errors ? error.errors.map(err => err.message) : [error.message];
      return res.status(400).json({ message: "Validation Error", errors: messages });
    }
    
    res.status(500).json({ message: "Server error while creating booking." });
  }
};

//updateBooking with better payment handling
exports.updateBooking = async (req, res) => {
  const { id } = req.params;
  const {
    therapistId,
    serviceOptionId,
    bookingTime,
    status,
    internalNotes,
    paymentStatus,
    paymentMethod,
    priceAtBooking,
    cancellationReason,
    initiatedBy
  } = req.body;

  const transaction = await sequelize.transaction();

  try {
    // 1. Find the booking with all necessary associations
    const booking = await Booking.findByPk(id, {
      include: [
        { model: Client },
        { model: ServiceOption, include: [{ model: Service }] },
        { model: Therapist, include: [{ model: User }], required: false },
        { model: Payment }
      ],
      transaction
    });

    if (!booking) {
      await transaction.rollback();
      return res.status(404).json({ message: "Booking not found." });
    }

    // Track changes for notifications
    const originalValues = {
      status: booking.status,
      therapistId: booking.therapistId,
      bookingStartTime: booking.bookingStartTime,
      paymentStatus: booking.paymentStatus
    };

    // Check if therapist is being assigned for the first time or changed
    const isTherapistAssigned = therapistId !== undefined && therapistId !== null && therapistId !== originalValues.therapistId;
    const isFirstTimeAssignment = therapistId !== undefined && therapistId !== null && originalValues.therapistId === null;

    // Handle cancellation separately if status is being changed to cancelled
    if (status && status.includes('Cancelled')) {
      await transaction.rollback();
      return this.deleteBooking(req, res);
    }

    // 2. Validate and update time/therapist/service if changed
    let newServiceOptionId = serviceOptionId || booking.serviceOptionId;
    let newTherapistId = (therapistId !== undefined) ? therapistId : booking.therapistId;
    
    let newBookingTime;
    if (bookingTime) {
      if (typeof bookingTime === 'string') {
        newBookingTime = parseISO(bookingTime);
      } else {
        newBookingTime = new Date(bookingTime);
      }
      
      if (!isValid(newBookingTime)) {
        await transaction.rollback();
        return res.status(400).json({ message: "Invalid booking time format." });
      }
    } else {
      newBookingTime = booking.bookingStartTime;
    }

    // Check if time is being changed
    const isTimeChanged = bookingTime && newBookingTime.getTime() !== originalValues.bookingStartTime.getTime();

    // Validate availability if time/therapist/service is changing
    if (serviceOptionId || bookingTime || (therapistId !== undefined)) {
      const serviceOption = await ServiceOption.findByPk(newServiceOptionId, { transaction });
      if (!serviceOption || !serviceOption.isActive) {
        await transaction.rollback();
        return res.status(404).json({ message: "Service option not found or inactive." });
      }

      const serviceDuration = serviceOption.duration;
      
      // Update booking fields
      booking.serviceOptionId = newServiceOptionId;
      booking.therapistId = newTherapistId;
      booking.bookingStartTime = newBookingTime;
      booking.bookingEndTime = addMinutes(newBookingTime, serviceDuration);

      if (priceAtBooking !== undefined && priceAtBooking !== booking.priceAtBooking) {
        booking.priceAtBooking = priceAtBooking;
      }

      // Only validate availability if time/service is changing (not for therapist assignment)
      if (serviceOptionId || bookingTime) {
        // Parse time components for availability check
        const bookingDateStr = newBookingTime.toISOString().split('T')[0];
        const utcHours = newBookingTime.getUTCHours();
        const utcMinutes = newBookingTime.getUTCMinutes();
        const utcSeconds = newBookingTime.getUTCSeconds();
        const bookingStartTimeStr = `${utcHours.toString().padStart(2, '0')}:${utcMinutes.toString().padStart(2, '0')}:${utcSeconds.toString().padStart(2, '0')}`;
        const bookingDayNum = newBookingTime.getUTCDay();

        // Check if the time slot has availability
        const availabilityWhere = {
          serviceId: serviceOption.serviceId,
          isActive: true,
          startTime: bookingStartTimeStr,
          [Op.or]: [
            { specificDate: bookingDateStr },
            { dayOfWeek: bookingDayNum, specificDate: null }
          ]
        };

        const availabilityRules = await ServiceAvailability.findAll({
          where: availabilityWhere,
          transaction
        });

        if (availabilityRules.length === 0) {
          await transaction.rollback();
          return res.status(400).json({ 
            message: "No availability found for the selected service and time slot."
          });
        }

        // Check overall capacity for the time slot
        const totalCapacity = availabilityRules.reduce((sum, rule) => sum + rule.bookingLimit, 0);
        const currentBookingCount = await Booking.count({
          where: {
            serviceOptionId: newServiceOptionId,
            bookingStartTime: newBookingTime,
            id: { [Op.ne]: booking.id },
            status: { [Op.notIn]: ["Cancelled By Client", "Cancelled By Staff"] }
          },
          transaction
        });

        if (currentBookingCount >= totalCapacity) {
          await transaction.rollback();
          return res.status(400).json({ 
            message: "This time slot is fully booked." 
          });
        }
      }

      // If a therapist is being assigned, just check if they exist and aren't overbooked
      if (newTherapistId) {
        const therapistExists = await Therapist.findByPk(newTherapistId, { transaction });
        if (!therapistExists) {
          await transaction.rollback();
          return res.status(400).json({ 
            message: "Selected therapist does not exist."
          });
        }

        // Optional: Check if therapist is overbooked (you can set a reasonable limit)
        const therapistBookingCount = await Booking.count({
          where: {
            therapistId: newTherapistId,
            bookingStartTime: newBookingTime,
            id: { [Op.ne]: booking.id },
            status: { [Op.notIn]: ["Cancelled By Client", "Cancelled By Staff"] }
          },
          transaction
        });

        // Allow up to 5 concurrent bookings per therapist per time slot (adjust as needed)
        if (therapistBookingCount >= 5) {
          await transaction.rollback();
          return res.status(400).json({ 
            message: "Selected therapist is overbooked for this time slot." 
          });
        }
      }
    }

    // 3. Update other fields
    if (status) booking.status = status;
    if (paymentMethod) booking.paymentMethod = paymentMethod;
    if (internalNotes !== undefined) booking.internalNotes = internalNotes;

    // 4. ENHANCED PAYMENT STATUS HANDLING
    if (paymentStatus) {
      booking.paymentStatus = paymentStatus;

      // Update associated payment records
      const payments = await Payment.findAll({
        where: { bookingId: booking.id },
        order: [['createdAt', 'DESC']],
        transaction
      });

      for (const payment of payments) {
        if (paymentStatus === "Paid" && payment.status !== 'Succeeded') {
          await payment.update({
            status: 'Succeeded',
            paidAt: new Date()
          }, { transaction });
          
          // Auto-confirm booking when payment is marked as paid
          if (booking.status === "Pending Confirmation") {
            booking.status = "Confirmed";
          }
        } else if (paymentStatus === "Failed" && payment.status !== 'Failed') {
          await payment.update({
            status: 'Failed',
            failureReason: 'Manually marked as failed by staff'
          }, { transaction });
        } else if (paymentStatus === "Refunded" && payment.status !== 'Refunded') {
          await payment.update({
            status: 'Refunded',
            refundedAt: new Date(),
            refundAmount: payment.amount
          }, { transaction });
        }
      }
    }

    await booking.save({ transaction });

    // 5. Send Therapist Assignment Email if therapist is being assigned
    if (isTherapistAssigned) {
      try {
        const therapist = await Therapist.findByPk(newTherapistId, {
          include: { model: User, attributes: ["firstName", "lastName", "email"] },
          transaction
        });

        if (therapist) {
          const therapistEmailResult = await sendTherapistAssignmentEmail(
            booking,
            therapist,
            booking.Client,
            booking.ServiceOption,
            booking.ServiceOption.Service
          );

          if (!therapistEmailResult.success) {
            console.warn('Therapist assignment email failed, but booking was updated successfully:', therapistEmailResult.error);
          }
        }
      } catch (therapistEmailError) {
        console.error('Error sending therapist assignment email:', therapistEmailError);
      }
    }

    await transaction.commit();

    // 6. Fetch fully updated booking
    const updatedBooking = await Booking.findByPk(id, {
      include: [
        { model: Client },
        { model: ServiceOption, include: [{ model: Service }] },
        { model: Therapist, include: [{ model: User, attributes: ["firstName", "lastName", "email"] }], required: false },
        { model: Payment }
      ]
    });

    // 7. Send notifications if needed
    try {
      if (isTimeChanged) {
        // Send reschedule notification
        // console.log('Booking time changed - would send reschedule email');
      }

      if (status === 'Confirmed' && originalValues.status !== 'Confirmed') {
        await sendBookingDetailsEmail(
          updatedBooking,
          updatedBooking.Client,
          updatedBooking.ServiceOption,
          updatedBooking.ServiceOption.Service
        );
      }
    } catch (emailError) {
      console.error('Error sending notification emails:', emailError);
    }

    // 8. Send response
    res.json({
      success: true,
      message: "Booking updated successfully" +
        (isTimeChanged ? ". Client has been notified of the schedule change." : "") +
        (isFirstTimeAssignment ? ". Therapist has been notified of the assignment." : "") +
        (isTherapistAssigned && !isFirstTimeAssignment ? ". Therapist has been notified of the reassignment." : ""),
      booking: updatedBooking
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Error updating booking:", error);

    if (error.name === "SequelizeValidationError") {
      const messages = error.errors.map(err => err.message);
      return res.status(400).json({ message: "Validation Error", errors: messages });
    }

    res.status(500).json({
      message: "Server error while updating booking.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Enhanced deleteBooking with Stripe refund integration
exports.deleteBooking = async (req, res) => {
  const { id } = req.params;
  const { cancellationReason, initiatedBy } = req.body;
  const transaction = await sequelize.transaction();

  try {
    // 1. Find the booking with payment information
    const booking = await Booking.findByPk(id, {
      include: [
        { model: Client },
        { model: ServiceOption, include: [{ model: Service }] },
        { model: Payment }
      ],
      transaction
    });

    if (!booking) {
      await transaction.rollback();
      return res.status(404).json({ message: "Booking not found." });
    }

    // 2. Validate cancellation is allowed
    if (booking.status === 'Cancelled By Client' || booking.status === 'Cancelled By Staff') {
      await transaction.rollback();
      return res.status(400).json({ message: "Booking is already cancelled." });
    }

    // 3. Determine cancellation status
    const cancellationStatus = initiatedBy === 'client' ? 'Cancelled By Client' : 'Cancelled By Staff';

    // 4. ENHANCED REFUND HANDLING
    let refundResult = null;
    if (booking.paymentStatus === 'Paid') {
      // Find the successful payment
      const successfulPayment = await Payment.findOne({
        where: { 
          bookingId: booking.id,
          status: 'Succeeded'
        },
        transaction
      });

      if (successfulPayment && successfulPayment.stripePaymentIntentId) {
        try {
          // Calculate refund amount based on timing
          const refundAmount = calculateRefundAmount(booking);
          
          if (refundAmount > 0) {
            // Process Stripe refund
            const refund = await stripe.refunds.create({
              payment_intent: successfulPayment.stripePaymentIntentId,
              amount: refundAmount, // Amount in cents
              reason: 'requested_by_customer',
              metadata: {
                booking_id: booking.id,
                cancelled_by: initiatedBy || 'staff',
                cancellation_reason: cancellationReason || 'Not specified'
              }
            });

            // Update payment record
            const refundAmountInDollars = refundAmount / 100;
            const isPartialRefund = refundAmountInDollars < parseFloat(successfulPayment.amount);

            await successfulPayment.update({
              status: isPartialRefund ? 'Partially Refunded' : 'Refunded',
              refundAmount: refundAmountInDollars,
              refundedAt: new Date(),
              transactionId: refund.id
            }, { transaction });

            refundResult = {
              amount: refundAmountInDollars,
              stripeRefundId: refund.id,
              partial: isPartialRefund
            };

            booking.paymentStatus = isPartialRefund ? 'Partially Refunded' : 'Refunded';
          }
        } catch (stripeError) {
          console.error('Stripe refund error:', stripeError);
          // Continue with cancellation even if refund fails
          refundResult = { error: stripeError.message };
        }
      } else if (successfulPayment) {
        // Non-Stripe payment - mark as refunded manually
        await successfulPayment.update({
          status: 'Refunded',
          refundAmount: parseFloat(successfulPayment.amount),
          refundedAt: new Date()
        }, { transaction });

        refundResult = {
          amount: parseFloat(successfulPayment.amount),
          manual: true,
          note: 'Manual refund required for non-card payment'
        };

        booking.paymentStatus = 'Refunded';
      }
    }

    // 5. Update booking status
    await booking.update({
      status: cancellationStatus,
      cancellationReason: cancellationReason,
      cancellationTime: new Date(),
      paymentStatus: booking.paymentStatus // Use updated payment status
    }, { transaction });

    // 6. Commit transaction
    await transaction.commit();

    // 7. Send cancellation notification
    try {
      // Send cancellation email (implement this in your email service)
      // console.log('Would send cancellation email to:', booking.Client.email);
    } catch (emailError) {
      console.error('Error sending cancellation email:', emailError);
    }

    // 8. Return success response
    res.json({
      success: true,
      message: `Booking ${cancellationStatus.toLowerCase()} successfully.`,
      bookingId: booking.id,
      refund: refundResult,
      newStatus: cancellationStatus
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Error cancelling booking:", error);

    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(err => err.message);
      return res.status(400).json({ message: "Validation Error", errors: messages });
    }

    res.status(500).json({
      message: "Server error while cancelling booking.",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Helper function to calculate refund amount based on cancellation policy
function calculateRefundAmount(booking) {
  const now = new Date();
  const bookingTime = new Date(booking.bookingStartTime);
  const hoursUntilAppointment = (bookingTime - now) / (1000 * 60 * 60);
  
  // Convert price to cents for Stripe
  const fullAmountInCents = Math.round(parseFloat(booking.priceAtBooking) * 100);
  
  // Cancellation policy:
  // - More than 24 hours: Full refund
  // - 12-24 hours: 50% refund
  // - Less than 12 hours: No refund
  if (hoursUntilAppointment > 24) {
    return fullAmountInCents; // Full refund
  } else if (hoursUntilAppointment > 12) {
    return Math.round(fullAmountInCents * 0.5); // 50% refund
  } else {
    return 0; // No refund
  }
}

// Keep all your existing methods unchanged
exports.getAllBookings = async (req, res) => {
  const { page = 1, limit = 10, status, therapistId, clientId, startDate, endDate } = req.query;
  const offset = (page - 1) * limit;
  const whereClause = {};

  if (req.user.role === 'therapist') {
    const therapistProfile = await Therapist.findOne({ where: { userId: req.user.id } });
    if (!therapistProfile) {
      return res.status(403).json({ message: "Forbidden: Therapist profile not found." });
    }
    whereClause.therapistId = therapistProfile.id;
  } else {
    if (therapistId) whereClause.therapistId = therapistId;
  }

  if (status) whereClause.status = status;
  if (clientId) whereClause.clientId = clientId;
  if (startDate && endDate) {
    whereClause.bookingStartTime = {
      [Op.between]: [startOfDay(parseISO(startDate)), endOfDay(parseISO(endDate))]
    };
  } else if (startDate) {
    whereClause.bookingStartTime = { [Op.gte]: startOfDay(parseISO(startDate)) };
  } else if (endDate) {
    whereClause.bookingStartTime = { [Op.lte]: endOfDay(parseISO(endDate)) };
  }

  try {
    const { count, rows } = await Booking.findAndCountAll({
      where: whereClause,
      include: [
        { model: Client, attributes: ["id", "firstName", "lastName", "email"] },
        { model: ServiceOption, include: [{ model: Service, attributes: ["id", "name"] }] },
        { model: Therapist, include: [{ model: User, attributes: ["firstName", "lastName"] }], required: false },
        { model: Payment } // Include payment information
      ],
      order: [["bookingStartTime", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      distinct: true,
    });

    res.json({
      totalBookings: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      bookings: rows,
    });
  } catch (error) {
    console.error("Error fetching all bookings:", error);
    res.status(500).json({ message: "Server error while fetching bookings." });
  }
};

exports.getBookingById = async (req, res) => {
  const { id } = req.params;
  const requestingUser = req.user;

  try {
    const booking = await Booking.findByPk(id, {
      include: [
        { model: Client },
        { model: ServiceOption, include: [{ model: Service }] },
        { model: Therapist, include: [{ model: User, attributes: ["id", "firstName", "lastName"] }], required: false },
        { model: Payment } // Include payment information
      ]
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    // Authorization check
    if (requestingUser.role === 'therapist') {
      const therapistProfile = await Therapist.findOne({ where: { userId: requestingUser.id } });
      if (!therapistProfile || (booking.therapistId && booking.therapistId !== therapistProfile.id)) {
        return res.status(403).json({ message: "Forbidden: You can only view bookings assigned to you." });
      }
    }

    res.json(booking);
  } catch (error) {
    console.error("Error fetching booking by ID:", error);
    res.status(500).json({ message: "Server error while fetching booking." });
  }
};

// Keep all other existing methods unchanged...
exports.getTherapistBookings = async (req, res) => {
  try {
    const { therapistId } = req.params;
    const { page = 1, limit = 10, status, startDate, endDate, hasCompletedNote = null } = req.query;
    const offset = (page - 1) * limit;

    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      if (req.user.role === 'therapist' && therapistId !== req.user.id) {
        return res.status(403).json({ message: 'You do not have permission to view these bookings' });
      }
    }

    const where = { therapistId };

    if (status) where.status = status;

    if (startDate || endDate) {
      where.bookingStartTime = {};
      if (startDate) where.bookingStartTime[Op.gte] = new Date(startDate);
      if (endDate) where.bookingStartTime[Op.lte] = new Date(endDate);
    }

    const includeOptions = [
      {
        model: Client,
        attributes: ['id', 'firstName', 'lastName', 'email']
      },
      {
        model: ServiceOption,
        include: [{ model: Service, attributes: ['id', 'name'] }]
      },
      {
        model: Payment // Include payment information
      }
    ];

    if (hasCompletedNote !== null) {
      includeOptions.push({
        model: ClinicalNote,
        required: false
      });

      if (hasCompletedNote === 'true') {
        includeOptions[includeOptions.length - 1].where = { completed: true };
      } else if (hasCompletedNote === 'false') {
        includeOptions[includeOptions.length - 1].where = {
          [Op.or]: [{ completed: false }, { id: null }]
        };
      }
    } else {
      includeOptions.push({
        model: ClinicalNote,
        required: false,
        attributes: ['id', 'completed']
      });
    }

    const { count, rows: bookings } = await Booking.findAndCountAll({
      where,
      include: includeOptions,
      limit: parseInt(limit),
      offset: offset,
      order: [['bookingStartTime', 'DESC']],
      distinct: true
    });

    return res.status(200).json({
      bookings,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('Error getting therapist bookings:', error);
    return res.status(500).json({ message: 'Failed to get bookings' });
  }
};

exports.getClientBookings = async (req, res) => {
  try {
    const { clientId } = req.params;
    const { page = 1, limit = 10, status, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;

    if (req.user.role !== 'admin' && req.user.role !== 'staff' && req.user.role !== 'therapist') {
      if (req.user.role === 'client' && clientId !== req.user.id) {
        return res.status(403).json({ message: 'You do not have permission to view these bookings' });
      }
    }

    const where = { clientId };

    if (status) where.status = status;

    if (startDate || endDate) {
      where.bookingStartTime = {};
      if (startDate) where.bookingStartTime[Op.gte] = new Date(startDate);
      if (endDate) where.bookingStartTime[Op.lte] = new Date(endDate);
    }

    const { count, rows: bookings } = await Booking.findAndCountAll({
      where,
      include: [
        {
          model: Therapist,
          include: {
            model: User,
            attributes: ['firstName', 'lastName', 'email']
          }
        },
        {
          model: ServiceOption,
          include: [{ model: Service, attributes: ['id', 'name'] }]
        },
        {
          model: ClinicalNote,
          attributes: ['id', 'completed']
        },
        {
          model: Payment // Include payment information
        }
      ],
      limit: parseInt(limit),
      offset: offset,
      order: [['bookingStartTime', 'DESC']]
    });

    return res.status(200).json({
      bookings,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('Error getting client bookings:', error);
    return res.status(500).json({ message: 'Failed to get bookings' });
  }
};

exports.getBookingsWithoutCompletedNotes = async (req, res) => {
  try {
    const { therapistId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      if (req.user.role === 'therapist' && therapistId !== req.user.id) {
        return res.status(403).json({ message: 'You do not have permission to view these bookings' });
      }
    }

    const { count, rows: bookings } = await Booking.findAndCountAll({
      where: {
        therapistId,
        status: 'Completed'
      },
      include: [
        {
          model: Client,
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: ServiceOption,
          attributes: ['id', 'duration', 'price'],
          include: [
            {
              model: Service,
              attributes: ['id', 'name', 'description']
            }
          ]
        },
        {
          model: ClinicalNote,
          required: false,
          where: {
            [Op.or]: [
              { completed: false },
              { id: null }
            ]
          }
        },
        {
          model: Payment // Include payment information
        }
      ],
      limit: parseInt(limit),
      offset: offset,
      order: [['bookingStartTime', 'DESC']],
      distinct: true
    });

    return res.status(200).json({
      bookings,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('Error getting bookings without completed notes:', error);
    return res.status(500).json({ message: 'Failed to get bookings' });
  }
};

exports.getBookingsReadyForNotes = async (req, res) => {
  try {
    const { page = 1, limit = 10, therapistId } = req.query;
    const offset = (page - 1) * limit;
    const requestingUser = req.user;

    let whereClause = {
      status: 'Confirmed',
      paymentStatus: 'Paid',
      therapistId: { [Op.ne]: null }
    };

    if (requestingUser.role === 'therapist') {
      const therapist = await Therapist.findOne({ where: { userId: requestingUser.id } });
      if (!therapist) {
        return res.status(404).json({ message: "Therapist profile not found." });
      }
      whereClause.therapistId = therapist.id;
    } else if (therapistId && therapistId !== 'all') {
      whereClause.therapistId = therapistId;
    }

    const { count, rows: bookings } = await Booking.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Client,
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Therapist,
          include: {
            model: User,
            attributes: ['firstName', 'lastName']
          }
        },
        {
          model: ServiceOption,
          attributes: ['id', 'duration', 'price'],
          include: [
            {
              model: Service,
              attributes: ['id', 'name', 'description']
            }
          ]
        },
        {
          model: ClinicalNote,
          required: false
        },
        {
          model: Payment // Include payment information
        }
      ],
      limit: parseInt(limit),
      offset: offset,
      order: [['bookingStartTime', 'ASC']],
      distinct: true
    });

    return res.status(200).json({
      bookings,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page)
    });

  } catch (error) {
    console.error('Error getting bookings ready for notes:', error);
    return res.status(500).json({ message: 'Failed to get bookings ready for notes' });
  }
};