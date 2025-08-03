import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Paper, CircularProgress, Alert, IconButton, TextField,
  Avatar, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, 
  FormControl, InputLabel, Select, Stack, Card, CardContent, Grid, Switch, 
  FormControlLabel, Tooltip, Backdrop, Divider, Tabs, Tab, List, ListItem, 
  ListItemText, ListItemIcon, LinearProgress
} from '@mui/material';
import {
  Add, ArrowBack, ArrowForward, Warning, CheckCircle, Error, Info, Schedule, DateRange,
  ViewWeek, ViewDay, ViewAgenda, ViewModule, Visibility, Edit, Delete, Event, Block, Today,
  Person, AccessTime, BookOnline, TrendingUp, CalendarToday, ViewList, Settings
} from '@mui/icons-material';
import { styled, alpha } from '@mui/material/styles';
import { format, parseISO, startOfWeek, addDays, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import enUS from 'date-fns/locale/en-US';

import hybridScheduleApi from '../../../services/hybridScheduleApi';
import {
  formatDateForDisplay,
  formatTimeRangeForDisplay,
  SCHEDULE_TYPES
} from '../../../utils/scheduleDataUtils';

// Enhanced calendar with drag and drop
const DnDCalendar = withDragAndDrop(Calendar);
const locales = { 'en-US': enUS };

const localizer = dateFnsLocalizer({
  format,
  parse: parseISO,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay: date => date.getDay(),
  locales,
});

// Styled components
const StyledCard = styled(Card)(() => ({
  borderRadius: '16px',
  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
  }
}));

const StatusChip = styled(Chip)(({ status }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'Confirmed': return { bg: '#e8f5e8', color: '#2e7d32' };
      case 'Pending Confirmation': return { bg: '#fff3e0', color: '#f57c00' };
      case 'Completed': return { bg: '#e3f2fd', color: '#1976d2' };
      case 'Cancelled By Client':
      case 'Cancelled By Staff': return { bg: '#ffebee', color: '#d32f2f' };
      default: return { bg: '#f5f5f5', color: '#666' };
    }
  };
  
  const colors = getStatusColor(status);
  return {
    backgroundColor: colors.bg,
    color: colors.color,
    fontWeight: 500,
    fontSize: '0.75rem',
    height: 24,
  };
});

const calendarStyles = {
  '& .rbc-calendar': {
    height: '100% !important',
  },
  '& .rbc-time-view': {
    overflow: 'auto !important',
    maxHeight: 'calc(100vh - 200px)', // Adjust based on your header height
  },
  '& .rbc-time-content': {
    overflow: 'auto !important',
  },
  '& .rbc-time-header': {
    position: 'sticky',
    top: 0,
    zIndex: 1,
    backgroundColor: 'white',
  }
};

export default function MySchedule() {
  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' or 'list'
  const [calendarView, setCalendarView] = useState(Views.WEEK);
  const [dailySchedule, setDailySchedule] = useState(null);
  const [weeklySchedule, setWeeklySchedule] = useState(null);
  const [availabilitySettings, setAvailabilitySettings] = useState({ workingHours: [], timeOff: [] });
  const [availabilityModalOpen, setAvailabilityModalOpen] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [backdrop, setBackdrop] = useState(false);
  const [newAvailability, setNewAvailability] = useState({
    type: 'WorkingHours',
    scheduleType: 'single',
    dayOfWeek: null,
    specificDate: null,
    selectedDates: [],
    startDate: new Date(),
    endDate: new Date(),
    selectedDaysOfWeek: [],
    startTime: new Date(),
    endTime: new Date(),
    notes: ''
  });

  // Get week dates
  const weekStart = startOfWeek(selectedWeek);
  const weekEnd = endOfWeek(selectedWeek);
  const selectedDate = selectedWeek; // For compatibility

  // Fetch my weekly schedule
  const fetchMyWeeklySchedule = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const startDate = format(weekStart, 'yyyy-MM-dd');
      const response = await hybridScheduleApi.getMyWeeklySchedule(startDate);
      
      if (response.success) {
        setWeeklySchedule(response.data);
        
        // Also set daily schedule for the selected day if viewing day view
        const selectedDateStr = format(selectedWeek, 'yyyy-MM-dd');
        const selectedDayData = response.data.days?.find(day => day.date === selectedDateStr);
        if (selectedDayData) {
          setDailySchedule(selectedDayData);
        }
      } else {
        setError(response.message || 'Failed to load weekly schedule');
      }
    } catch (err) {
      console.error('Error fetching weekly schedule:', err);
      setError(err.response?.data?.message || 'Failed to load weekly schedule');
    } finally {
      setLoading(false);
    }
  }, [weekStart, selectedWeek]);

  // Fetch my daily schedule for a specific date
  const fetchMyDailySchedule = useCallback(async (date = selectedWeek) => {
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const response = await hybridScheduleApi.getMyDailySchedule(dateStr);
      
      if (response.success) {
        setDailySchedule(response.data);
      }
    } catch (err) {
      console.error('Error fetching daily schedule:', err);
    }
  }, [selectedWeek]);

  // Fetch my availability settings
  const fetchMyAvailabilitySettings = useCallback(async () => {
    try {
      const response = await hybridScheduleApi.getMyAvailabilitySettings();
      
      if (response.success) {
        setAvailabilitySettings(response.data);
      }
    } catch (err) {
      console.error('Error fetching availability settings:', err);
    }
  }, []);

  useEffect(() => {
  fetchMyWeeklySchedule();
  fetchMyAvailabilitySettings();
}, [selectedWeek]);

  // Handle week navigation
  const handleWeekChange = useCallback((direction) => {
    const newWeek = direction > 0 ? addWeeks(selectedWeek, 1) : subWeeks(selectedWeek, 1);
    setSelectedWeek(newWeek);
  }, [selectedWeek]);

  // Handle booking click
  const handleBookingClick = useCallback((booking) => {
    setSelectedBooking(booking);
    setBookingModalOpen(true);
  }, []);

  // Handle availability creation - enhanced version
  const handleCreateAvailability = useCallback(async () => {
    if (!newAvailability.startTime || !newAvailability.endTime) {
      setError('Please fill in all required fields');
      return;
    }

    setBackdrop(true);
    try {
      const basePayload = {
        type: newAvailability.type,
        startTime: format(newAvailability.startTime, 'HH:mm:ss'),
        endTime: format(newAvailability.endTime, 'HH:mm:ss')
      };

      // Add notes if provided
      if (newAvailability.notes && newAvailability.notes.trim() !== '') {
        basePayload.notes = newAvailability.notes.trim();
      }

      let payloads = [];

      switch (newAvailability.scheduleType) {
        case 'single':
          if (newAvailability.specificDate) {
            payloads.push({
              ...basePayload,
              specificDate: format(newAvailability.specificDate, 'yyyy-MM-dd')
            });
          } else if (newAvailability.dayOfWeek !== null) {
            payloads.push({
              ...basePayload,
              dayOfWeek: newAvailability.dayOfWeek
            });
          } else {
            setError('Please select either a specific date or day of week');
            return;
          }
          break;

        case 'multiple':
          if (newAvailability.selectedDates.length === 0) {
            setError('Please select at least one date');
            return;
          }
          payloads = newAvailability.selectedDates.map(date => ({
            ...basePayload,
            specificDate: format(date, 'yyyy-MM-dd')
          }));
          break;

        case 'range': {
          if (!newAvailability.startDate || !newAvailability.endDate) {
            setError('Please select start and end dates');
            return;
          }
          const rangeDates = [];
          let currentDate = new Date(newAvailability.startDate);
          const endDate = new Date(newAvailability.endDate);
          
          while (currentDate <= endDate) {
            rangeDates.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
          }
          
          payloads = rangeDates.map(date => ({
            ...basePayload,
            specificDate: format(date, 'yyyy-MM-dd')
          }));
          break;
        }

        case 'weekly':
          if (newAvailability.selectedDaysOfWeek.length === 0) {
            setError('Please select at least one day of the week');
            return;
          }
          payloads = newAvailability.selectedDaysOfWeek.map(dayOfWeek => ({
            ...basePayload,
            dayOfWeek: dayOfWeek
          }));
          break;

        default:
          setError('Invalid schedule type');
          return;
      }

      // console.log('Creating availability settings:', payloads);

      // Use bulk creation for multiple settings, single creation for one setting
      let response;
      if (payloads.length === 1) {
        response = await hybridScheduleApi.createMyAvailabilitySetting(payloads[0]);
      } else {
        // For multiple settings, create them individually for therapist users
        const responses = await Promise.all(
          payloads.map(payload => hybridScheduleApi.createMyAvailabilitySetting(payload))
        );
        const failed = responses.filter(r => !r.success);
        if (failed.length > 0) {
          setError(`Failed to create ${failed.length} of ${responses.length} availability settings`);
          return;
        }
        response = { success: true };
      }
      
      if (response.success) {
        await fetchMyAvailabilitySettings();
        await fetchMyWeeklySchedule();
        
        setAvailabilityModalOpen(false);
        setNewAvailability({
          type: 'WorkingHours',
          scheduleType: 'single',
          dayOfWeek: null,
          specificDate: null,
          selectedDates: [],
          startDate: new Date(),
          endDate: new Date(),
          selectedDaysOfWeek: [],
          startTime: new Date(),
          endTime: new Date(),
          notes: ''
        });
        setError(null);
      } else {
        setError(response.message || 'Failed to create availability settings');
      }
    } catch (err) {
      console.error('Error creating availability:', err);
      setError(err.response?.data?.message || err.message || 'Failed to create availability setting');
    } finally {
      setBackdrop(false);
    }
  }, [newAvailability, fetchMyAvailabilitySettings, fetchMyWeeklySchedule]);

  // Generate calendar events from weekly schedule
  const generateCalendarEvents = useCallback(() => {
    if (!weeklySchedule?.days) return [];

    const events = [];

    weeklySchedule.days.forEach((day) => {
      const dateStr = day.date;

      // Add bookings as events
      day.bookings.forEach((booking) => {
        const startDateTime = new Date(`${dateStr}T${booking.startTime}`);
        const endDateTime = new Date(`${dateStr}T${booking.endTime}`);

        if (startDateTime instanceof Date && !isNaN(startDateTime) &&
            endDateTime instanceof Date && !isNaN(endDateTime)) {
          events.push({
            id: `booking-${booking.id}`,
            title: `${booking.client.name} - ${booking.service.name}`,
            start: startDateTime,
            end: endDateTime,
            resource: {
              type: 'booking',
              data: booking
            }
          });
        }
      });

      // Add available slots as background events
      day.availableSlots.forEach((slot, index) => {
        const startDateTime = new Date(`${dateStr}T${slot.startTime}`);
        const endDateTime = new Date(`${dateStr}T${slot.endTime}`);

        if (startDateTime instanceof Date && !isNaN(startDateTime) &&
            endDateTime instanceof Date && !isNaN(endDateTime)) {
          events.push({
            id: `available-${dateStr}-${index}`,
            title: 'Available',
            start: startDateTime,
            end: endDateTime,
            resource: {
              type: 'available',
              data: slot
            }
          });
        }
      });

      // Add time off blocks
      day.timeOffBlocks.forEach((block) => {
        const startDateTime = new Date(`${dateStr}T${block.startTime}`);
        const endDateTime = new Date(`${dateStr}T${block.endTime}`);

        if (startDateTime instanceof Date && !isNaN(startDateTime) &&
            endDateTime instanceof Date && !isNaN(endDateTime)) {
          events.push({
            id: `timeoff-${block.id}`,
            title: block.notes || 'Time Off',
            start: startDateTime,
            end: endDateTime,
            resource: {
              type: 'timeoff',
              data: block
            }
          });
        }
      });
    });

    return events;
  }, [weeklySchedule]);

  const calendarEvents = generateCalendarEvents();

  // Calculate weekly statistics
  const weeklyStats = weeklySchedule ? {
    totalBookings: weeklySchedule.weeklySummary.totalBookings,
    totalWorkingHours: weeklySchedule.weeklySummary.totalWorkingHours,
    totalBookedHours: weeklySchedule.weeklySummary.totalBookedHours,
    totalAvailableHours: weeklySchedule.weeklySummary.totalAvailableHours,
    utilizationRate: weeklySchedule.weeklySummary.utilizationRate,
    totalRevenue: weeklySchedule.weeklySummary.totalRevenue || 0
  } : {
    totalBookings: 0,
    totalWorkingHours: 0,
    totalBookedHours: 0,
    totalAvailableHours: 0,
    utilizationRate: 0,
    totalRevenue: 0
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#f8fafc' }}>
        {/* Header */}
        <Box sx={{ p: 3, bgcolor: 'white', borderBottom: '1px solid #e5e7eb' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#1f2937', mb: 1 }}>
                My Schedule
              </Typography>
              <Typography variant="body1" sx={{ color: '#6b7280' }}>
                View your bookings and manage your availability
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant={viewMode === 'calendar' ? 'contained' : 'outlined'}
                startIcon={<CalendarToday />}
                onClick={() => setViewMode('calendar')}
                disabled={loading}
              >
                Calendar View
              </Button>
              <Button
                variant={viewMode === 'list' ? 'contained' : 'outlined'}
                startIcon={<ViewList />}
                onClick={() => setViewMode('list')}
                disabled={loading}
              >
                List View
              </Button>
            </Box>
          </Box>

          {/* Week Navigation */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton onClick={() => handleWeekChange(-1)} disabled={loading}>
                <ArrowBack />
              </IconButton>
              <Typography variant="h6" sx={{ fontWeight: 600, minWidth: 300 }}>
                {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
              </Typography>
              <IconButton onClick={() => handleWeekChange(1)} disabled={loading}>
                <ArrowForward />
              </IconButton>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                onClick={() => setSelectedWeek(new Date())}
                startIcon={<Today />}
                disabled={loading}
              >
                This Week
              </Button>
              {/* <Button
                variant="contained"
                onClick={() => setAvailabilityModalOpen(true)}
                startIcon={<Settings />}
              >
                Manage Availability
              </Button> */}
            </Box>
          </Box>

          {/* Loading indicator */}
          {loading && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Loading schedule data...
              </Typography>
              <LinearProgress />
            </Box>
          )}
        </Box>

        {/* Statistics Cards */}
        <Box sx={{ p: 3, pb: 0 }}>
          <Grid container spacing={3}>
            {[
              { 
                label: 'Total Bookings', 
                value: weeklyStats.totalBookings, 
                icon: BookOnline, 
                color: 'primary.main',
                subtitle: 'This week'
              },
              { 
                label: 'Working Hours', 
                value: `${Math.round(weeklyStats.totalWorkingHours)}h`, 
                icon: AccessTime, 
                color: 'success.main',
                subtitle: 'Scheduled'
              },
              // { 
              //   label: 'Booked Hours', 
              //   value: `${Math.round(weeklyStats.totalBookedHours)}h`, 
              //   icon: Event, 
              //   color: 'warning.main',
              //   subtitle: 'Confirmed'
              // },
              // { 
              //   label: 'Utilization', 
              //   value: `${Math.round(weeklyStats.utilizationRate)}%`, 
              //   icon: TrendingUp, 
              //   color: weeklyStats.utilizationRate > 80 ? 'error.main' : 
              //          weeklyStats.utilizationRate > 60 ? 'warning.main' : 'success.main',
              //   subtitle: 'Rate'
              // }
            ].map((stat, index) => (
              <Grid item xs={12} sm={6} md={3} key={`stat-${index}`}>
                <StyledCard>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: stat.color, width: 48, height: 48 }}>
                        <stat.icon />
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>
                          {stat.value}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {stat.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {stat.subtitle}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </StyledCard>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Main Content */}
        <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {viewMode === 'calendar' ? (
            /* Calendar View - Full Width */
            <Box sx={{ flex: 1, p: 3 }}>
              <StyledCard sx={{ height: '100%' }}>
                <CardContent sx={{ height: '100%', p: 3, display: 'flex', flexDirection: 'column' }}>
                  {/* Calendar Controls */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconButton
                        onClick={() => setCalendarView(Views.DAY)}
                        color={calendarView === Views.DAY ? 'primary' : 'default'}
                      >
                        <ViewDay />
                      </IconButton>
                      <IconButton
                        onClick={() => setCalendarView(Views.WEEK)}
                        color={calendarView === Views.WEEK ? 'primary' : 'default'}
                      >
                        <ViewWeek />
                      </IconButton>
                    </Box>
                    {error && (
                      <Alert severity="error" sx={{ mr: 2 }}>
                        {error}
                      </Alert>
                    )}
                  </Box>

                  {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <CircularProgress size={48} />
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                          Loading schedule data...
                        </Typography>
                      </Box>
                    </Box>
                  ) : calendarEvents.length === 0 ? (
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                      <Event sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No Schedule Data
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        No appointments or availability found for this week.
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ flex: 1, ...calendarStyles }}>
                      <DnDCalendar
                        localizer={localizer}
                        events={calendarEvents}
                        startAccessor="start"
                        endAccessor="end"
                        style={{ height: '100%' }}
                        view={calendarView}
                        date={selectedWeek}
                        onNavigate={setSelectedWeek}
                        onView={setCalendarView}
                        toolbar={false}
                        onSelectEvent={(event) => {
                          if (event.resource.type === 'booking') {
                            handleBookingClick(event.resource.data);
                          }
                        }}
                        eventPropGetter={(event) => {
                          let style = {};
                          switch (event.resource.type) {
                            case 'booking':
                              style = { backgroundColor: '#1976d2', borderColor: '#1976d2', color: '#fff' };
                              break;
                            case 'available':
                              style = { backgroundColor: '#4caf50', borderColor: '#4caf50', color: '#fff', opacity: 0.6 };
                              break;
                            case 'timeoff':
                              style = { backgroundColor: '#f44336', borderColor: '#f44336', color: '#fff' };
                              break;
                          }
                          return { style };
                        }}
                      />
                    </Box>
                  )}
                </CardContent>
              </StyledCard>
            </Box>
          ) : (
            /* List View */
            <Box sx={{ flex: 1, p: 3 }}>
              <StyledCard sx={{ height: '100%' }}>
                <CardContent sx={{ height: '100%', p: 3, display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="h6" sx={{ mb: 3 }}>
                    Weekly Schedule: {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
                  </Typography>

                  {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                      <CircularProgress />
                    </Box>
                  ) : error ? (
                    <Alert severity="error">{error}</Alert>
                  ) : !weeklySchedule?.days ? (
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                      <Event sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No Schedule Data
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        No schedule data found for this week.
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ flex: 1, overflow: 'auto' }}>
                      <Grid container spacing={2}>
                        {weeklySchedule.days.map((day) => {
                          const dayName = format(parseISO(day.date), 'EEE');
                          const dayDate = format(parseISO(day.date), 'MMM d');

                          return (
                            <Grid item xs={12} key={day.date}>
                              <Paper sx={{ p: 2, border: '1px solid #e5e7eb', borderRadius: 2 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                                  {dayName}, {dayDate}
                                </Typography>
                                
                                <Stack spacing={1}>
                                  {/* Bookings */}
                                  {day.bookings.map((booking) => (
                                    <Paper
                                      key={booking.id}
                                      sx={{ 
                                        p: 2, 
                                        bgcolor: '#e3f2fd', 
                                        cursor: 'pointer',
                                        '&:hover': { bgcolor: '#bbdefb' },
                                        borderRadius: 1
                                      }}
                                      onClick={() => handleBookingClick(booking)}
                                    >
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Box sx={{ flex: 1 }}>
                                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            {formatTimeRangeForDisplay(booking.startTime, booking.endTime)}
                                          </Typography>
                                          <Typography variant="body2">
                                            {booking.client.name} - {booking.service.name}
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary">
                                            {booking.duration} minutes • ${booking.service.price}
                                          </Typography>
                                        </Box>
                                        <StatusChip
                                          label={booking.status}
                                          status={booking.status}
                                          size="small"
                                        />
                                      </Box>
                                    </Paper>
                                  ))}
                                  
                                  {/* Available Slots */}
                                  {day.availableSlots.map((slot, index) => (
                                    <Paper
                                      key={`available-${index}`}
                                      sx={{ p: 2, bgcolor: '#e8f5e8', borderRadius: 1 }}
                                    >
                                      <Typography variant="body2">
                                        {formatTimeRangeForDisplay(slot.startTime, slot.endTime)} - Available for booking
                                      </Typography>
                                    </Paper>
                                  ))}
                                  
                                  {/* Time Off */}
                                  {day.timeOffBlocks.map((block) => (
                                    <Paper
                                      key={block.id}
                                      sx={{ p: 2, bgcolor: '#ffebee', borderRadius: 1 }}
                                    >
                                      <Typography variant="body2">
                                        {formatTimeRangeForDisplay(block.startTime, block.endTime)} - {block.notes || 'Time Off'}
                                      </Typography>
                                    </Paper>
                                  ))}
                                  
                                  {day.bookings.length === 0 && 
                                   day.availableSlots.length === 0 && 
                                   day.timeOffBlocks.length === 0 && (
                                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center', py: 2 }}>
                                      No schedule for this day
                                    </Typography>
                                  )}
                                </Stack>
                              </Paper>
                            </Grid>
                          );
                        })}
                      </Grid>
                    </Box>
                  )}
                </CardContent>
              </StyledCard>
            </Box>
          )}
        </Box>

        {/* Enhanced Availability Management Modal */}
        <Dialog 
          open={availabilityModalOpen} 
          onClose={() => setAvailabilityModalOpen(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>
            Manage My Availability
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Set your working hours and time off to control when clients can book appointments with you.
            </Typography>

            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={newAvailability.type}
                    onChange={e => setNewAvailability({ ...newAvailability, type: e.target.value })}
                  >
                    <MenuItem value="WorkingHours">Working Hours</MenuItem>
                    <MenuItem value="TimeOff">Time Off</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Schedule Type</InputLabel>
                  <Select
                    value={newAvailability.scheduleType}
                    onChange={e => {
                      setNewAvailability({
                        ...newAvailability,
                        scheduleType: e.target.value,
                        // Reset related fields when changing schedule type
                        dayOfWeek: null,
                        specificDate: null,
                        selectedDates: [],
                        selectedDaysOfWeek: []
                      });
                    }}
                  >
                    <MenuItem value="single">Single Day</MenuItem>
                    <MenuItem value="multiple">Multiple Dates</MenuItem>
                    <MenuItem value="range">Date Range</MenuItem>
                    <MenuItem value="weekly">Weekly Recurring</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Single Day Options */}
              {newAvailability.scheduleType === 'single' && (
                <>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Day of Week (Recurring)</InputLabel>
                      <Select
                        value={newAvailability.dayOfWeek || ''}
                        onChange={e => setNewAvailability({
                          ...newAvailability,
                          dayOfWeek: e.target.value === '' ? null : parseInt(e.target.value),
                          specificDate: e.target.value !== '' ? null : newAvailability.specificDate
                        })}
                      >
                        <MenuItem value="">None</MenuItem>
                        <MenuItem value={0}>Sunday</MenuItem>
                        <MenuItem value={1}>Monday</MenuItem>
                        <MenuItem value={2}>Tuesday</MenuItem>
                        <MenuItem value={3}>Wednesday</MenuItem>
                        <MenuItem value={4}>Thursday</MenuItem>
                        <MenuItem value={5}>Friday</MenuItem>
                        <MenuItem value={6}>Saturday</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <DatePicker
                      label="OR Specific Date"
                      value={newAvailability.specificDate}
                      onChange={(date) => setNewAvailability({
                        ...newAvailability,
                        specificDate: date,
                        dayOfWeek: date ? null : newAvailability.dayOfWeek
                      })}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          margin: 'normal'
                        }
                      }}
                    />
                  </Grid>
                </>
              )}

              {/* Multiple Dates Options */}
              {newAvailability.scheduleType === 'multiple' && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Select Multiple Dates
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {newAvailability.selectedDates.map((date, index) => (
                      <Chip
                        key={index}
                        label={format(date, 'MMM d, yyyy')}
                        onDelete={() => {
                          const newDates = newAvailability.selectedDates.filter((_, i) => i !== index);
                          setNewAvailability({ ...newAvailability, selectedDates: newDates });
                        }}
                        variant="outlined"
                      />
                    ))}
                  </Box>
                  <DatePicker
                    label="Add Date"
                    value={null}
                    onChange={(date) => {
                      if (date && !newAvailability.selectedDates.some(d =>
                        format(d, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                      )) {
                        setNewAvailability({
                          ...newAvailability,
                          selectedDates: [...newAvailability.selectedDates, date]
                        });
                      }
                    }}
                    slotProps={{
                      textField: {
                        fullWidth: true
                      }
                    }}
                  />
                </Grid>
              )}

              {/* Date Range Options */}
              {newAvailability.scheduleType === 'range' && (
                <>
                  <Grid item xs={12} sm={6}>
                    <DatePicker
                      label="Start Date"
                      value={newAvailability.startDate}
                      onChange={(date) => setNewAvailability({ ...newAvailability, startDate: date })}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          margin: 'normal'
                        }
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <DatePicker
                      label="End Date"
                      value={newAvailability.endDate}
                      onChange={(date) => setNewAvailability({ ...newAvailability, endDate: date })}
                      minDate={newAvailability.startDate}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          margin: 'normal'
                        }
                      }}
                    />
                  </Grid>
                </>
              )}

              {/* Weekly Recurring Options */}
              {newAvailability.scheduleType === 'weekly' && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Select Days of Week
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {[
                      { value: 0, label: 'Sun' },
                      { value: 1, label: 'Mon' },
                      { value: 2, label: 'Tue' },
                      { value: 3, label: 'Wed' },
                      { value: 4, label: 'Thu' },
                      { value: 5, label: 'Fri' },
                      { value: 6, label: 'Sat' }
                    ].map((day) => (
                      <Chip
                        key={day.value}
                        label={day.label}
                        variant={newAvailability.selectedDaysOfWeek.includes(day.value) ? 'filled' : 'outlined'}
                        onClick={() => {
                          const currentDays = newAvailability.selectedDaysOfWeek;
                          const newDays = currentDays.includes(day.value)
                            ? currentDays.filter(d => d !== day.value)
                            : [...currentDays, day.value];
                          setNewAvailability({ ...newAvailability, selectedDaysOfWeek: newDays });
                        }}
                        color={newAvailability.selectedDaysOfWeek.includes(day.value) ? 'primary' : 'default'}
                      />
                    ))}
                  </Box>
                </Grid>
              )}

              {/* Time Selection */}
              <Grid item xs={12} sm={6}>
                <TimePicker
                  label="Start Time"
                  value={newAvailability.startTime}
                  onChange={(time) => setNewAvailability({ ...newAvailability, startTime: time })}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      margin: 'normal'
                    }
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TimePicker
                  label="End Time"
                  value={newAvailability.endTime}
                  onChange={(time) => setNewAvailability({ ...newAvailability, endTime: time })}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      margin: 'normal'
                    }
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  multiline
                  rows={3}
                  value={newAvailability.notes}
                  onChange={e => setNewAvailability({ ...newAvailability, notes: e.target.value })}
                  margin="normal"
                  placeholder="Add any notes about this availability setting..."
                />
              </Grid>

              {/* Preview Section */}
              {newAvailability.scheduleType !== 'single' && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Preview
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: '#f8fafc' }}>
                    <Typography variant="body2">
                      {newAvailability.scheduleType === 'multiple' &&
                        `Will create ${newAvailability.selectedDates.length} availability settings`}
                      {newAvailability.scheduleType === 'range' && newAvailability.startDate && newAvailability.endDate &&
                        `Will create availability for ${Math.ceil((newAvailability.endDate - newAvailability.startDate) / (1000 * 60 * 60 * 24)) + 1} days`}
                      {newAvailability.scheduleType === 'weekly' &&
                        `Will create ${newAvailability.selectedDaysOfWeek.length} recurring weekly settings`}
                    </Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Current Availability Settings */}
            <Typography variant="h6" sx={{ mb: 2 }}>Current Settings</Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ mb: 1, color: 'success.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircle fontSize="small" />
                  Working Hours
                </Typography>
                {availabilitySettings.workingHours?.length > 0 ? (
                  <Stack spacing={1}>
                    {availabilitySettings.workingHours.map((setting) => (
                      <Paper key={setting.id} sx={{ p: 2, bgcolor: '#f8f9fa', border: '1px solid #e5e7eb' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {setting.dayOfWeek !== null 
                                ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][setting.dayOfWeek]
                                : formatDateForDisplay(setting.specificDate)
                              }
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {formatTimeRangeForDisplay(setting.startTime, setting.endTime)}
                            </Typography>
                            {setting.notes && (
                              <Typography variant="caption" color="text.secondary">
                                {setting.notes}
                              </Typography>
                            )}
                          </Box>
                          <IconButton
                            size="small"
                            onClick={async () => {
                              try {
                                await hybridScheduleApi.deleteMyAvailabilitySetting(setting.id);
                                fetchMyAvailabilitySettings();
                                fetchMyWeeklySchedule();
                              } catch (err) {
                                console.error('Error deleting setting:', err);
                              }
                            }}
                          >
                            <Delete />
                          </IconButton>
                        </Box>
                      </Paper>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    No working hours defined. Add your regular working schedule to allow client bookings.
                  </Typography>
                )}
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ mb: 1, color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Block fontSize="small" />
                  Time Off
                </Typography>
                {availabilitySettings.timeOff?.length > 0 ? (
                  <Stack spacing={1}>
                    {availabilitySettings.timeOff.map((setting) => (
                      <Paper key={setting.id} sx={{ p: 2, bgcolor: '#ffebee', border: '1px solid #e5e7eb' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {setting.dayOfWeek !== null 
                                ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][setting.dayOfWeek]
                                : formatDateForDisplay(setting.specificDate)
                              }
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {formatTimeRangeForDisplay(setting.startTime, setting.endTime)}
                            </Typography>
                            {setting.notes && (
                              <Typography variant="caption" color="text.secondary">
                                {setting.notes}
                              </Typography>
                            )}
                          </Box>
                          <IconButton
                            size="small"
                            onClick={async () => {
                              try {
                                await hybridScheduleApi.deleteMyAvailabilitySetting(setting.id);
                                fetchMyAvailabilitySettings();
                                fetchMyWeeklySchedule();
                              } catch (err) {
                                console.error('Error deleting setting:', err);
                              }
                            }}
                          >
                            <Delete />
                          </IconButton>
                        </Box>
                      </Paper>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    No time off blocks defined. Add time off to prevent bookings during unavailable periods.
                  </Typography>
                )}
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAvailabilityModalOpen(false)}>
              Close
            </Button>
            <Button 
              variant="contained" 
              onClick={handleCreateAvailability}
              disabled={!newAvailability.startTime || !newAvailability.endTime}
            >
              Add Setting
            </Button>
          </DialogActions>
        </Dialog>

        {/* Enhanced Booking Detail Modal */}
        <Dialog 
          open={bookingModalOpen} 
          onClose={() => setBookingModalOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Booking Details</Typography>
              {selectedBooking && (
                <StatusChip
                  label={selectedBooking.status}
                  status={selectedBooking.status}
                />
              )}
            </Box>
          </DialogTitle>
          <DialogContent>
            {selectedBooking && (
              <Stack spacing={3} sx={{ mt: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                    {selectedBooking.client.name.split(' ').map(n => n[0]).join('')}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6">
                      {selectedBooking.client.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Booking ID: #{selectedBooking.id}
                    </Typography>
                  </Box>
                </Box>

                <Divider />

                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Client Information
                    </Typography>
                    <Box sx={{ bgcolor: '#f8fafc', p: 2, borderRadius: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {selectedBooking.client.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedBooking.client.email}
                      </Typography>
                      {selectedBooking.client.phone && (
                        <Typography variant="body2" color="text.secondary">
                          {selectedBooking.client.phone}
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Appointment Details
                    </Typography>
                    <Box sx={{ bgcolor: '#f8fafc', p: 2, borderRadius: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {formatTimeRangeForDisplay(selectedBooking.startTime, selectedBooking.endTime)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Duration: {selectedBooking.duration} minutes
                      </Typography>
                      {/* <Typography variant="body2" color="text.secondary">
                        Date: {format(selectedWeek, 'MMMM d, yyyy')}
                      </Typography> */}
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Service & Payment
                    </Typography>
                    <Box sx={{ bgcolor: '#f8fafc', p: 2, borderRadius: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {selectedBooking.service.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Price: ${selectedBooking.service.price}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Payment: {selectedBooking.paymentStatus}
                      </Typography>
                    </Box>
                  </Grid>
                  
                  {/* <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Additional Information
                    </Typography>
                    <Box sx={{ bgcolor: '#f8fafc', p: 2, borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Booking Created: {selectedBooking.createdAt ? format(parseISO(selectedBooking.createdAt), 'MMM d, yyyy') : 'N/A'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Last Updated: {selectedBooking.updatedAt ? format(parseISO(selectedBooking.updatedAt), 'MMM d, yyyy') : 'N/A'}
                      </Typography>
                    </Box>
                  </Grid> */}
                </Grid>

                {selectedBooking.notes && (
                  <>
                    <Divider />
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Client Notes
                      </Typography>
                      <Paper sx={{ p: 2, bgcolor: '#f8fafc' }}>
                        <Typography variant="body2">{selectedBooking.notes}</Typography>
                      </Paper>
                    </Box>
                  </>
                )}

                {error && (
                  <Alert severity="error" onClose={() => setError(null)}>
                    {error}
                  </Alert>
                )}
              </Stack>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setBookingModalOpen(false)}>
              Close
            </Button>
            {/* <Button 
              variant="outlined" 
              startIcon={<Visibility />}
              onClick={() => {
                // Navigate to full booking details or client profile
                console.log('View full details for booking:', selectedBooking?.id);
              }}
            >
              View Full Details
            </Button> */}
          </DialogActions>
        </Dialog>

        {/* Loading Backdrop */}
        <Backdrop open={backdrop} sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}>
          <CircularProgress color="inherit" />
        </Backdrop>
      </Box>
    </LocalizationProvider>
  );
}