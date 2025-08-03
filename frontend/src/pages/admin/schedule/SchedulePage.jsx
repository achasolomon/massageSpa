import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Button, Paper, CircularProgress, Alert, IconButton, TextField,
  Avatar, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Checkbox, FormControl,
  InputLabel, Select, Card, CardContent, Grid, Backdrop, Divider, Tabs, Tab, Stack,
  Badge, Tooltip, LinearProgress
} from '@mui/material';
import {
  Add, Edit, Delete, Today, ArrowBack, ArrowForward, Event, Block, CheckCircle, Schedule,
  DateRange, ViewAgenda, Info, Visibility, Warning, Person, TrendingUp, Assessment,
  AccessTime, BookOnline, Settings, ViewList, CalendarToday
} from '@mui/icons-material';
import { styled, alpha } from '@mui/material/styles';
import { format, parseISO, addDays, subDays, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import enUS from 'date-fns/locale/en-US';

import apiClient from '../../../services/apiClient';
import hybridScheduleApi from '../../../services/hybridScheduleApi';
import {
  formatTimeRangeForDisplay,
  formatDateForDisplay,
  formatTimeForDisplay,
  SCHEDULE_TYPES
} from '../../../utils/scheduleDataUtils';
import { formatSpecialties } from '../../../utils/specialtiesUtils';

// Enhanced calendar with drag and drop
const DnDCalendar = withDragAndDrop(Calendar);
const locales = { 'en-US': enUS };

// Fixed localizer configuration
const localizer = dateFnsLocalizer({
  format,
  parse: parseISO,
  startOfWeek: (date) => {
    const startDate = new Date(date);
    const dayOfWeek = startDate.getDay();
    const diff = startDate.getDate() - dayOfWeek;
    return new Date(startDate.setDate(diff));
  },
  getDay: (date) => {
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.getDay();
  },
  locales,
});

// Styled components
const StyledCard = styled(Card)(({ theme }) => ({
  borderRadius: '12px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  border: '1px solid #e5e7eb',
  transition: 'all 0.2s ease',
}));

const TherapistCard = styled(Card)(({ theme, selected = false }) => ({
  borderRadius: '12px',
  border: selected ? `2px solid ${theme.palette.primary.main}` : '1px solid #e5e7eb',
  backgroundColor: selected ? alpha(theme.palette.primary.main, 0.02) : '#fff',
  transition: 'all 0.2s ease',
  cursor: 'pointer',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
  }
}));

const StatusChip = styled(Chip)(({ theme, status }) => {
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

export default function ScheduleManagement() {
  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [viewMode, setViewMode] = useState('calendar');
  const [therapistsOverview, setTherapistsOverview] = useState([]);
  const [weeklySchedules, setWeeklySchedules] = useState({});
  const [selectedTherapist, setSelectedTherapist] = useState(null);
  const [availabilityModalOpen, setAvailabilityModalOpen] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [availabilitySettings, setAvailabilitySettings] = useState({ workingHours: [], timeOff: [] });
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

  // Use ref to track current request and prevent multiple simultaneous requests
  const fetchingRef = useRef(false);
  const abortControllerRef = useRef(null);

  // Get week start and end dates - memoize to prevent recalculation
  const weekStart = startOfWeek(selectedWeek);
  const weekEnd = endOfWeek(selectedWeek);
  const weekKey = format(weekStart, 'yyyy-MM-dd'); // Use this as cache key

  // Simple fetch function - removed all complexity
  const fetchWeeklySchedules = useCallback(async () => {
    // Prevent multiple simultaneous requests
    if (fetchingRef.current) {
      return;
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    fetchingRef.current = true;

    setLoading(true);
    setError(null);

    try {
      // Get therapists overview first
      const overviewResponse = await hybridScheduleApi.getAllTherapistsOverview(weekKey);

      if (!overviewResponse.success || !overviewResponse.data?.therapists) {
        throw new Error('Failed to fetch therapists overview');
      }

      const therapists = overviewResponse.data.therapists;
      setTherapistsOverview(therapists);

      if (therapists.length === 0) {
        setWeeklySchedules({});
        return;
      }

      // Fetch schedules for each therapist for the entire week
      const schedules = {};
      const weekDates = Array.from({ length: 7 }, (_, i) => {
        const date = addDays(weekStart, i);
        return format(date, 'yyyy-MM-dd');
      });

      // Process therapists sequentially to avoid overwhelming the API
      for (const therapistData of therapists) {
        const therapistId = therapistData.therapist.id;
        schedules[therapistId] = {};

        // Fetch all days for this therapist
        for (const dateStr of weekDates) {
          try {
            const dayResponse = await hybridScheduleApi.getTherapistDailySchedule(therapistId, dateStr);

            schedules[therapistId][dateStr] = dayResponse?.success ? dayResponse.data : {
              bookings: [],
              availableSlots: [],
              timeOffBlocks: [],
              summary: { totalWorkingHours: 0, totalBookedHours: 0, bookingCount: 0 }
            };
          } catch (err) {
            console.error(`Error fetching schedule for therapist ${therapistId} on ${dateStr}:`, err);
            schedules[therapistId][dateStr] = {
              bookings: [],
              availableSlots: [],
              timeOffBlocks: [],
              summary: { totalWorkingHours: 0, totalBookedHours: 0, bookingCount: 0 }
            };
          }

          // Small delay to prevent rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      setWeeklySchedules(schedules);

    } catch (err) {
      if (err.name === 'AbortError') {
        // console.log('Request was aborted');
        return;
      }

      console.error('Error fetching weekly schedules:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load weekly schedules');
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [weekKey]); // Only depend on weekKey, not weekStart

  // Effect for fetching schedules - only when week changes
  useEffect(() => {
    fetchWeeklySchedules();

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      fetchingRef.current = false;
    };
  }, [weekKey]); // Only depend on weekKey

  // Fetch therapist availability settings
  const fetchAvailabilitySettings = useCallback(async (therapistId) => {
    try {
      const response = await hybridScheduleApi.getTherapistAvailabilitySettings(therapistId);
      if (response.success) {
        setAvailabilitySettings(response.data);
      }
    } catch (err) {
      console.error('Error fetching availability settings:', err);
    }
  }, []);

  // Handle therapist selection
  const handleTherapistSelect = useCallback((therapist) => {
    setSelectedTherapist(therapist);
    fetchAvailabilitySettings(therapist.therapist.id);
  }, [fetchAvailabilitySettings]);

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

  // Handle availability management
  const handleCreateAvailability = useCallback(async () => {
    if (!selectedTherapist || !newAvailability.startTime || !newAvailability.endTime) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      const basePayload = {
        therapistId: selectedTherapist.therapist.id,
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
          // Single day - existing logic
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
          // Multiple specific dates
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
          // Date range - create for each day in range
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
          // Multiple days of week (recurring)
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
        response = await hybridScheduleApi.createAvailabilitySetting(payloads[0]);
      } else {
        response = await hybridScheduleApi.createBulkAvailabilitySettings(payloads);
      }

      if (response.success) {
        // Success - refresh data and reset form
        await fetchAvailabilitySettings(selectedTherapist.therapist.id);
        await fetchWeeklySchedules();

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
      if (err.response?.data?.errors) {
        const errorMessages = err.response.data.errors.map(error => error.msg).join(', ');
        setError(`Validation error: ${errorMessages}`);
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to create availability settings');
      }
    }
  }, [newAvailability, selectedTherapist, fetchAvailabilitySettings, fetchWeeklySchedules]);
  // Generate calendar events from weekly schedules
  const generateCalendarEvents = useCallback(() => {
    const events = [];

    Object.entries(weeklySchedules).forEach(([therapistId, therapistSchedules]) => {
      const therapist = therapistsOverview.find(t => t.therapist.id.toString() === therapistId);
      if (!therapist) return;

      Object.entries(therapistSchedules).forEach(([dateStr, daySchedule]) => {
        // Add bookings
        daySchedule.bookings.forEach((booking) => {
          const startDateTime = new Date(`${dateStr}T${booking.startTime}`);
          const endDateTime = new Date(`${dateStr}T${booking.endTime}`);

          if (startDateTime instanceof Date && !isNaN(startDateTime) &&
            endDateTime instanceof Date && !isNaN(endDateTime)) {
            events.push({
              id: `booking-${booking.id}`,
              title: `${therapist.therapist.name}: ${booking.client.name} - ${booking.service.name}`,
              start: startDateTime,
              end: endDateTime,
              resource: {
                type: 'booking',
                therapistId: therapist.therapist.id,
                therapistName: therapist.therapist.name,
                data: booking
              }
            });
          }
        });

        // Add available slots
        daySchedule.availableSlots.forEach((slot, index) => {
          const startDateTime = new Date(`${dateStr}T${slot.startTime}`);
          const endDateTime = new Date(`${dateStr}T${slot.endTime}`);

          if (startDateTime instanceof Date && !isNaN(startDateTime) &&
            endDateTime instanceof Date && !isNaN(endDateTime)) {
            events.push({
              id: `available-${therapistId}-${dateStr}-${index}`,
              title: `${therapist.therapist.name}: Available`,
              start: startDateTime,
              end: endDateTime,
              resource: {
                type: 'available',
                therapistId: therapist.therapist.id,
                therapistName: therapist.therapist.name,
                data: slot
              }
            });
          }
        });

        // Add time off blocks
        daySchedule.timeOffBlocks.forEach((block) => {
          const startDateTime = new Date(`${dateStr}T${block.startTime}`);
          const endDateTime = new Date(`${dateStr}T${block.endTime}`);

          if (startDateTime instanceof Date && !isNaN(startDateTime) &&
            endDateTime instanceof Date && !isNaN(endDateTime)) {
            events.push({
              id: `timeoff-${block.id}`,
              title: `${therapist.therapist.name}: ${block.notes || 'Time Off'}`,
              start: startDateTime,
              end: endDateTime,
              resource: {
                type: 'timeoff',
                therapistId: therapist.therapist.id,
                therapistName: therapist.therapist.name,
                data: block
              }
            });
          }
        });
      });
    });

    return events;
  }, [weeklySchedules, therapistsOverview]);

  const calendarEvents = generateCalendarEvents();

  // Get therapist's weekly summary
  const getTherapistWeeklySummary = (therapistId) => {
    const therapistSchedules = weeklySchedules[therapistId] || {};
    let totalBookings = 0;
    let totalWorkingHours = 0;
    let totalBookedHours = 0;

    Object.values(therapistSchedules).forEach(daySchedule => {
      totalBookings += daySchedule.bookings.length;
      totalWorkingHours += daySchedule.summary?.totalWorkingHours || 0;
      totalBookedHours += daySchedule.summary?.totalBookedHours || 0;
    });

    return {
      totalBookings,
      totalWorkingHours,
      totalBookedHours,
      utilizationRate: totalWorkingHours > 0 ? (totalBookedHours / totalWorkingHours) * 100 : 0
    };
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#f8fafc' }}>
        {/* Header */}
        <Box sx={{ p: 3, bgcolor: 'white', borderBottom: '1px solid #e5e7eb' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#1f2937', mb: 1 }}>
                Schedule Management
              </Typography>
              <Typography variant="body1" sx={{ color: '#6b7280' }}>
                Manage therapist schedules, bookings, and availability
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
            <Button
              variant="outlined"
              onClick={() => setSelectedWeek(new Date())}
              startIcon={<Today />}
              disabled={loading}
            >
              This Week
            </Button>
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

        {/* Main Content */}
        <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {viewMode === 'calendar' ? (
            /* Calendar View - Full Width */
            <Box sx={{ flex: 1, p: 3 }}>
              <StyledCard sx={{ height: '100%' }}>
                <CardContent sx={{ height: '100%', p: 3 }}>
                  {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <CircularProgress size={48} />
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                          Loading schedule data...
                        </Typography>
                      </Box>
                    </Box>
                  ) : error ? (
                    <Alert
                      severity="error"
                      action={
                        <Button color="inherit" size="small" onClick={fetchWeeklySchedules}>
                          Retry
                        </Button>
                      }
                    >
                      {error}
                    </Alert>
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
                    <DnDCalendar
                      localizer={localizer}
                      events={calendarEvents}
                      startAccessor="start"
                      endAccessor="end"
                      style={{ height: '100%' }}
                      view={Views.WEEK}
                      date={selectedWeek}
                      onNavigate={(date) => setSelectedWeek(date)}
                      onSelectEvent={(event) => {
                        if (event.resource.type === 'booking') {
                          handleBookingClick(event.resource.data);
                        }
                      }}
                      eventPropGetter={(event) => {
                        let style = {};
                        switch (event.resource.type) {
                          case 'booking':
                            style = {
                              backgroundColor: '#1976d2',
                              borderColor: '#1976d2',
                              color: '#fff'
                            };
                            break;
                          case 'available':
                            style = {
                              backgroundColor: '#4caf50',
                              borderColor: '#4caf50',
                              color: '#fff',
                              opacity: 0.7
                            };
                            break;
                          case 'timeoff':
                            style = {
                              backgroundColor: '#f44336',
                              borderColor: '#f44336',
                              color: '#fff'
                            };
                            break;
                        }
                        return { style };
                      }}
                    />
                  )}
                </CardContent>
              </StyledCard>
            </Box>
          ) : (
            /* List View */
            <>
              {/* Therapists List */}
              <Box sx={{ width: 400, p: 3, borderRight: '1px solid #e5e7eb', bgcolor: 'white' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                  Therapists ({therapistsOverview.length})
                </Typography>

                {loading ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 4 }}>
                    <CircularProgress />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      Loading...
                    </Typography>
                  </Box>
                ) : error ? (
                  <Alert
                    severity="error"
                    action={
                      <Button color="inherit" size="small" onClick={fetchWeeklySchedules}>
                        Retry
                      </Button>
                    }
                  >
                    {error}
                  </Alert>
                ) : therapistsOverview.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Person sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No Therapists Available
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      No therapists are scheduled for this week.
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={2} sx={{ maxHeight: 'calc(100vh - 200px)', overflow: 'auto' }}>
                    {therapistsOverview.map((therapistData) => {
                      const { therapist } = therapistData;
                      const isSelected = selectedTherapist?.therapist.id === therapist.id;
                      const weeklySummary = getTherapistWeeklySummary(therapist.id);

                      return (
                        <TherapistCard
                          key={therapist.id}
                          selected={isSelected}
                          onClick={() => handleTherapistSelect(therapistData)}
                        >
                          <CardContent sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                              <Avatar sx={{ width: 48, height: 48, bgcolor: 'primary.main' }}>
                                {therapist.name.split(' ').map(n => n[0]).join('')}
                              </Avatar>
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                  {therapist.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {formatSpecialties(therapist.specialties)}
                                </Typography>
                              </Box>
                              <Badge
                                badgeContent={weeklySummary.totalBookings}
                                color="primary"
                                max={99}
                              >
                                <Event fontSize="small" />
                              </Badge>
                            </Box>

                            <Grid container spacing={2} sx={{ textAlign: 'center' }}>
                              <Grid item xs={4}>
                                <Typography variant="caption" color="text.secondary">
                                  Working
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {Math.round(weeklySummary.totalWorkingHours)}h
                                </Typography>
                              </Grid>
                              <Grid item xs={4}>
                                <Typography variant="caption" color="text.secondary">
                                  Booked
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {Math.round(weeklySummary.totalBookedHours)}h
                                </Typography>
                              </Grid>
                              <Grid item xs={4}>
                                <Typography variant="caption" color="text.secondary">
                                  Utilization
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 600,
                                    color: weeklySummary.utilizationRate > 80 ? 'error.main' :
                                      weeklySummary.utilizationRate > 60 ? 'warning.main' : 'success.main'
                                  }}
                                >
                                  {Math.round(weeklySummary.utilizationRate)}%
                                </Typography>
                              </Grid>
                            </Grid>

                            {isSelected && (
                              <Button
                                fullWidth
                                variant="outlined"
                                startIcon={<Settings />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAvailabilityModalOpen(true);
                                }}
                                sx={{ mt: 2 }}
                              >
                                Manage Availability
                              </Button>
                            )}
                          </CardContent>
                        </TherapistCard>
                      );
                    })}
                  </Stack>
                )}
              </Box>

              {/* Selected Therapist Detail */}
              <Box sx={{ flex: 1, p: 3 }}>
                {selectedTherapist ? (
                  <StyledCard sx={{ height: '100%' }}>
                    <CardContent sx={{ height: '100%', p: 3, display: 'flex', flexDirection: 'column' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {selectedTherapist.therapist.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Weekly Schedule: {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ flex: 1, overflow: 'auto' }}>
                        <Grid container spacing={2}>
                          {Array.from({ length: 7 }, (_, i) => {
                            const currentDate = addDays(weekStart, i);
                            const dateStr = format(currentDate, 'yyyy-MM-dd');
                            const daySchedule = weeklySchedules[selectedTherapist.therapist.id]?.[dateStr];
                            const dayName = format(currentDate, 'EEE');
                            const dayDate = format(currentDate, 'MMM d');

                            return (
                              <Grid item xs={12} key={dateStr}>
                                <Paper sx={{ p: 2, border: '1px solid #e5e7eb' }}>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                                    {dayName}, {dayDate}
                                  </Typography>

                                  {daySchedule ? (
                                    <Stack spacing={1}>
                                      {/* Bookings */}
                                      {daySchedule.bookings.map((booking) => (
                                        <Paper
                                          key={booking.id}
                                          sx={{
                                            p: 2,
                                            bgcolor: '#e3f2fd',
                                            cursor: 'pointer',
                                            '&:hover': { bgcolor: '#bbdefb' }
                                          }}
                                          onClick={() => handleBookingClick(booking)}
                                        >
                                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Box>
                                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                {formatTimeRangeForDisplay(booking.startTime, booking.endTime)}
                                              </Typography>
                                              <Typography variant="caption">
                                                {booking.client.name} - {booking.service.name}
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
                                      {daySchedule.availableSlots.map((slot, index) => (
                                        <Paper
                                          key={`available-${index}`}
                                          sx={{ p: 2, bgcolor: '#e8f5e8' }}
                                        >
                                          <Typography variant="body2">
                                            {formatTimeRangeForDisplay(slot.startTime, slot.endTime)} - Available
                                          </Typography>
                                        </Paper>
                                      ))}

                                      {/* Time Off */}
                                      {daySchedule.timeOffBlocks.map((block) => (
                                        <Paper
                                          key={block.id}
                                          sx={{ p: 2, bgcolor: '#ffebee' }}
                                        >
                                          <Typography variant="body2">
                                            {formatTimeRangeForDisplay(block.startTime, block.endTime)} - {block.notes || 'Time Off'}
                                          </Typography>
                                        </Paper>
                                      ))}

                                      {daySchedule.bookings.length === 0 &&
                                        daySchedule.availableSlots.length === 0 &&
                                        daySchedule.timeOffBlocks.length === 0 && (
                                          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                            No schedule for this day
                                          </Typography>
                                        )}
                                    </Stack>
                                  ) : (
                                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                      {loading ? 'Loading...' : 'No data available'}
                                    </Typography>
                                  )}
                                </Paper>
                              </Grid>
                            );
                          })}
                        </Grid>
                      </Box>
                    </CardContent>
                  </StyledCard>
                ) : (
                  <StyledCard sx={{ height: '100%' }}>
                    <CardContent sx={{
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center'
                    }}>
                      <Box>
                        <Person sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary">
                          Select a Therapist
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Choose a therapist to view their weekly schedule
                        </Typography>
                      </Box>
                    </CardContent>
                  </StyledCard>
                )}
              </Box>
            </>
          )}
        </Box>

        {/* Availability Management Modal */}
        <Dialog
          open={availabilityModalOpen}
          onClose={() => setAvailabilityModalOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Manage Availability - {selectedTherapist?.therapist.name}
          </DialogTitle>
          <DialogContent>
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
                    Select Multiple Dates (Hold Ctrl/Cmd to select multiple)
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

        {/* Booking Detail Modal */}
        <Dialog
          open={bookingModalOpen}
          onClose={() => setBookingModalOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Booking Details</DialogTitle>
          <DialogContent>
            {selectedBooking && (
              <Stack spacing={3} sx={{ mt: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                    <Event />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">
                      {selectedBooking.service.name}
                    </Typography>
                    <StatusChip
                      label={selectedBooking.status}
                      status={selectedBooking.status}
                    />
                  </Box>
                </Box>

                <Divider />

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">Client</Typography>
                    <Typography variant="body1">{selectedBooking.client.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedBooking.client.email}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">Time</Typography>
                    <Typography variant="body1">
                      {formatTimeRangeForDisplay(selectedBooking.startTime, selectedBooking.endTime)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedBooking.duration} minutes
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">Service</Typography>
                    <Typography variant="body1">{selectedBooking.service.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      ${selectedBooking.service.price}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">Payment</Typography>
                    <Typography variant="body1">{selectedBooking.paymentStatus}</Typography>
                  </Grid>
                  {selectedBooking.notes && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary">Notes</Typography>
                      <Typography variant="body1">{selectedBooking.notes}</Typography>
                    </Grid>
                  )}
                </Grid>
              </Stack>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setBookingModalOpen(false)}>
              Close
            </Button>
            <Button variant="outlined" startIcon={<Edit />}>
              Edit Booking
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
}