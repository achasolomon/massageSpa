// utils/scheduleDataUtils.js
import { format, parseISO} from 'date-fns'; // commented  addDays, 

// Unified schedule type mappings
export const SCHEDULE_TYPES = {
  WORKING_HOURS: 'WorkingHours',
  TIME_OFF: 'TimeOff',
  SPECIFIC_AVAILABILITY: 'SpecificAvailability',
  BLOCKED_SLOT: 'BlockedSlot'
};

export const FRONTEND_TYPES = {
  available: ['WorkingHours', 'SpecificAvailability'],
  blocked: ['TimeOff', 'BlockedSlot']
};

// Map backend types to frontend display types
// In scheduleDataUtils.js - Fix these functions:
export const mapFrontendTypeToBackend = (frontendType, isRecurring = false) => {
  if (frontendType === 'available') {
    return isRecurring ? 'WorkingHours' : 'SpecificAvailability';
  }
  if (frontendType === 'blocked') {
    return isRecurring ? 'TimeOff' : 'BlockedSlot';
  }
  return frontendType; // fallback for direct backend types
};

export const mapBackendTypeToFrontend = (backendType) => {
  switch (backendType) {
    case 'WorkingHours':
    case 'SpecificAvailability':
      return 'available';
    case 'TimeOff':
    case 'BlockedSlot':
      return 'blocked';
    default:
      return backendType;
  }
};

// Normalize time format (ensure HH:mm:ss format)
export const normalizeTimeFormat = (timeString) => {
  if (!timeString) return null;
  
  // Handle Date objects
  if (timeString instanceof Date) {
    return timeString.toTimeString().split(' ')[0]; // HH:mm:ss
  }
  
  // Handle string format
  const timeStr = timeString.toString();
  if (timeStr.includes(':')) {
    const parts = timeStr.split(':');
    if (parts.length === 2) {
      return `${parts[0]}:${parts[1]}:00`;
    }
    return timeStr; // already in HH:mm:ss format
  }
  
  return timeStr;
};

// Create unique event ID for calendar
export const createUniqueEventId = (schedule, date = null) => {
  const baseId = schedule.id || `temp-${Date.now()}`;
  const dateStr = date ? format(date, 'yyyy-MM-dd') : '';
  const timeStr = schedule.startTime ? schedule.startTime.replace(/:/g, '') : '';
  return `${baseId}-${dateStr}-${timeStr}`;
};

// Transform backend schedule to frontend format
export const transformScheduleFromBackend = (backendSchedule) => {
  return {
    id: backendSchedule.id,
    therapistId: backendSchedule.therapistId,
    type: mapBackendTypeToFrontend(backendSchedule.type),
    originalType: backendSchedule.type, // Keep original for reference
    dayOfWeek: backendSchedule.dayOfWeek,
    specificDate: backendSchedule.specificDate,
    startTime: backendSchedule.startTime,
    endTime: backendSchedule.endTime,
    recurrenceStartDate: backendSchedule.recurrenceStartDate,
    recurrenceEndDate: backendSchedule.recurrenceEndDate,
    notes: backendSchedule.notes,
    recurring: backendSchedule.dayOfWeek !== null && backendSchedule.dayOfWeek !== undefined,
    // Add display fields from backend if available
    displayStartTime: backendSchedule.displayStartTime,
    displayEndTime: backendSchedule.displayEndTime,
    displayType: backendSchedule.displayType,
    displayTime: backendSchedule.displayTime,
    displayDate: backendSchedule.displayDate,
    displayRecurrence: backendSchedule.displayRecurrence,
    createdAt: backendSchedule.createdAt,
    updatedAt: backendSchedule.updatedAt
  };
};

// Transform frontend schedule to backend format
export const transformScheduleToBackend = (frontendSchedule) => {
  return {
    therapistId: frontendSchedule.therapistId,
    type: frontendSchedule.type,
    startTime: normalizeTimeFormat(frontendSchedule.startTime),
    endTime: normalizeTimeFormat(frontendSchedule.endTime),
    dayOfWeek: frontendSchedule.dayOfWeek,
    specificDate: frontendSchedule.specificDate,
    recurrenceStartDate: frontendSchedule.recurrenceStartDate,
    recurrenceEndDate: frontendSchedule.recurrenceEndDate,
    notes: frontendSchedule.notes
  };
};

// Generate calendar events from schedules with proper unique keys
export const generateCalendarEvents = (schedules) => {
  return schedules.map((schedule, index) => ({
    id: `schedule-${schedule.id}-${index}`,
    title: `${schedule.displayType || getScheduleTypeDisplay(schedule.originalType || schedule.type)}`,
    start: schedule.displayStartTime ? new Date(schedule.displayStartTime) : parseTimeString(schedule.startTime),
    end: schedule.displayEndTime ? new Date(schedule.displayEndTime) : parseTimeString(schedule.endTime),
    allDay: false,
    resource: {
      scheduleId: schedule.id,
      type: schedule.type,
      originalType: schedule.originalType,
      recurring: schedule.recurring,
      notes: schedule.notes,
      therapistId: schedule.therapistId
    }
  }));
};

// Get display name for schedule types
export const getScheduleTypeDisplay = (type) => {
  const displayNames = {
    [SCHEDULE_TYPES.WORKING_HOURS]: 'Working Hours',
    [SCHEDULE_TYPES.TIME_OFF]: 'Time Off',
    [SCHEDULE_TYPES.SPECIFIC_AVAILABILITY]: 'Available',
    [SCHEDULE_TYPES.BLOCKED_SLOT]: 'Blocked'
  };
  return displayNames[type] || type;
};

// Get color for schedule types
export const getScheduleTypeColor = (type) => {
  switch (type) {
    case SCHEDULE_TYPES.WORKING_HOURS:
      return '#4caf50'; // Green
    case SCHEDULE_TYPES.SPECIFIC_AVAILABILITY:
      return '#2196f3'; // Blue
    case SCHEDULE_TYPES.TIME_OFF:
      return '#ff9800'; // Orange
    case SCHEDULE_TYPES.BLOCKED_SLOT:
      return '#f44336'; // Red
    default:
      return '#9e9e9e'; // Grey
  }
};

// Validate schedule data
export const validateScheduleData = (data) => {
  const errors = [];
  
  // Required fields validation
  if (!data.type) errors.push("Schedule type is required");
  if (!data.startTime) errors.push("Start time is required");
  if (!data.endTime) errors.push("End time is required");
  
  // Type validation
  const validTypes = ["WorkingHours", "TimeOff", "SpecificAvailability", "BlockedSlot"];
  if (data.type && !validTypes.includes(data.type)) {
    errors.push(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
  }
  
  // Time range validation
  if (data.startTime && data.endTime && data.startTime >= data.endTime) {
    errors.push("End time must be after start time");
  }
  
  // Date/recurrence validation
  const hasSpecificDate = data.specificDate;
  const hasDayOfWeek = data.dayOfWeek !== null && data.dayOfWeek !== undefined;
  
  if (hasSpecificDate && hasDayOfWeek) {
    errors.push("Cannot specify both specificDate and dayOfWeek. Use one or the other.");
  }
  
  if (!hasSpecificDate && !hasDayOfWeek) {
    errors.push("Must specify either specificDate (for one-time) or dayOfWeek (for recurring)");
  }
  
  return { isValid: errors.length === 0, errors };
};


// Format time for display
export const formatTimeForDisplay = (timeStr) => {
  if (!timeStr) return '';
  
  try {
    if (timeStr.includes('T')) {
      return format(parseISO(timeStr), 'h:mm a');
    }
    
    // Handle HH:mm:ss or HH:mm format
    const timeParts = timeStr.split(':');
    if (timeParts.length >= 2) {
      const hours = parseInt(timeParts[0]);
      const minutes = parseInt(timeParts[1]);
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return format(date, 'h:mm a');
    }
    
    return timeStr;
  } catch (error) {
    console.error('Error formatting time:', error);
    return timeStr;
  }
};

// Format time range for display
export const formatTimeRangeForDisplay = (startTime, endTime) => {
  if (!startTime || !endTime) return '';
  return `${formatTimeForDisplay(startTime)} - ${formatTimeForDisplay(endTime)}`;
};

// Format date for display
export const formatDateForDisplay = (dateStr) => {
  if (!dateStr) return '';
  
  try {
    return format(parseISO(dateStr), 'MMM dd, yyyy');
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateStr;
  }
};

// Get day name from day number
export const getDayName = (dayNumber) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayNumber] || '';
};

// Get short day name from day number
export const getShortDayName = (dayNumber) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[dayNumber] || '';
};

// Check if schedule is available type
export const isAvailableSchedule = (schedule) => {
  const type = schedule.originalType || schedule.type;
  return [SCHEDULE_TYPES.WORKING_HOURS, SCHEDULE_TYPES.SPECIFIC_AVAILABILITY].includes(type);
};

// Check if schedule is blocked type
export const isBlockedSchedule = (schedule) => {
  const type = schedule.originalType || schedule.type;
  return [SCHEDULE_TYPES.TIME_OFF, SCHEDULE_TYPES.BLOCKED_SLOT].includes(type);
};

// Get schedule status for display
export const getScheduleStatus = (schedule) => {
  return isAvailableSchedule(schedule) ? 'available' : 'blocked';
};

// Parse time string to Date object

// Parse time string to Date object
export const parseTimeString = (timeString) => {
  if (!timeString) return null;
  
  // If it's already a Date object
  if (timeString instanceof Date) return timeString;
  
  // Parse time string to Date object
  const today = new Date();
  const [hours, minutes, seconds] = timeString.split(':');
  today.setHours(parseInt(hours), parseInt(minutes), parseInt(seconds || 0), 0);
  return today;
};

// Convert Date object to time string
export const dateToTimeString = (date) => {
  if (!date || !(date instanceof Date)) return '';
  
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  
  return `${hours}:${minutes}:${seconds}`;
};

// Convert time to display format for input fields (HH:mm)
export const timeToInputFormat = (timeString) => {
  if (!timeString) return '';
  
  if (timeString instanceof Date) {
    return timeString.toTimeString().slice(0, 5); // HH:mm
  }
  
  // Convert HH:mm:ss to HH:mm
  return timeString.split(':').slice(0, 2).join(':');
};

// Convert input time to normalized format (HH:mm:ss)
export const inputTimeToNormalized = (inputTime) => {
  if (!inputTime) return '';
  return inputTime.includes(':') ? `${inputTime}:00` : inputTime;
};

// Get default form data for schedule
export const getDefaultScheduleFormData = (isRecurring = false) => {
  const now = new Date();
  const endTime = new Date(now.getTime() + 60 * 60 * 1000); // +1 hour
  
  return {
    startTime: now,
    endTime: endTime,
    type: 'available',
    recurring: isRecurring,
    recurrencePattern: 'weekly',
    recurrenceEndDate: null,
    dayOfWeek: now.getDay(),
    specificDate: format(now, 'yyyy-MM-dd'),
    notes: ''
  };
};

// Validate time overlap
export const checkTimeOverlap = (start1, end1, start2, end2) => {
  const startTime1 = start1 instanceof Date ? start1 : parseTimeString(start1);
  const endTime1 = end1 instanceof Date ? end1 : parseTimeString(end1);
  const startTime2 = start2 instanceof Date ? start2 : parseTimeString(start2);
  const endTime2 = end2 instanceof Date ? end2 : parseTimeString(end2);
  
  if (!startTime1 || !endTime1 || !startTime2 || !endTime2) return false;
  
  return startTime1 < endTime2 && startTime2 < endTime1;
};

// Get schedule summary for display
export const getScheduleSummary = (schedule) => {
  const type = getScheduleTypeDisplay(schedule.originalType || schedule.type);
  const time = formatTimeRangeForDisplay(schedule.startTime, schedule.endTime);
  
  if (schedule.recurring) {
    const day = getDayName(schedule.dayOfWeek);
    return `${type} - ${day} ${time}`;
  } else {
    const date = formatDateForDisplay(schedule.specificDate);
    return `${type} - ${date} ${time}`;
  }
};

// Export all utilities as default
export default {
  SCHEDULE_TYPES,
  FRONTEND_TYPES,
  mapBackendTypeToFrontend,
  mapFrontendTypeToBackend,
  normalizeTimeFormat,
  createUniqueEventId,
  transformScheduleFromBackend,
  transformScheduleToBackend,
  generateCalendarEvents,
  getScheduleTypeDisplay,
  getScheduleTypeColor,
  validateScheduleData,
  formatTimeForDisplay,
  formatTimeRangeForDisplay,
  formatDateForDisplay,
  getDayName,
  getShortDayName,
  isAvailableSchedule,
  isBlockedSchedule,
  getScheduleStatus,
  parseTimeString,
  dateToTimeString,
  timeToInputFormat,
  inputTimeToNormalized,
  getDefaultScheduleFormData,
  checkTimeOverlap,
  getScheduleSummary
};