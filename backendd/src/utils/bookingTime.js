// utils/dateUtils.js
function parseBookingTime(bookingTime) {
  let parsedTime;
  
  if (bookingTime instanceof Date) {
    parsedTime = bookingTime;
  } else if (typeof bookingTime === 'string') {
    parsedTime = new Date(bookingTime);
    if (isNaN(parsedTime.getTime())) {
      throw new Error("Invalid date string format");
    }
  } else {
    throw new Error("Invalid booking time type");
  }

  const dateStr = parsedTime.toISOString().split('T')[0];
  const hours = parsedTime.getUTCHours().toString().padStart(2, '0');
  const minutes = parsedTime.getUTCMinutes().toString().padStart(2, '0');
  const seconds = parsedTime.getUTCSeconds().toString().padStart(2, '0');
  const timeStr = `${hours}:${minutes}:${seconds}`;
  const dayNum = parsedTime.getUTCDay();

  return { 
    parsedTime, 
    dateStr, 
    timeStr, 
    dayNum 
  };
}

module.exports = { parseBookingTime };