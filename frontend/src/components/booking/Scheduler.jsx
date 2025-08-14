import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Avatar,
  Divider,
  Button,
  CircularProgress,
  Tooltip,
  Alert,
  Chip,
  useTheme
} from '@mui/material';
import { CalendarToday, AccessTime, Info } from '@mui/icons-material';
import { format, startOfDay, addDays, isSameDay } from 'date-fns';
import apiClient from '../../services/apiClient';

export default function Scheduler({
  serviceId,
  serviceOptionId,
  selectedDateTime,
  onDateTimeSelect,
  therapistId
}) {
  const theme = useTheme();
  const today = startOfDay(new Date());
  const [selectedDate, setSelectedDate] = useState(selectedDateTime?.date || today);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(selectedDateTime?.time || null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState(null);
  const [fullyBooked, setFullyBooked] = useState(false);

  useEffect(() => {
    async function fetchSlots() {
      if (!serviceId || !serviceOptionId) {
        setAvailableSlots([]);
        setSelectedSlot(null);
        onDateTimeSelect({ date: format(selectedDate, 'yyyy-MM-dd'), time: null });
        return;
      }
      try {
        setLoadingSlots(true);
        setError(null);
        setFullyBooked(false);

        const params = {
          date: format(selectedDate, 'yyyy-MM-dd'),
          serviceId,
          serviceOptionId
        };
        if (therapistId) params.therapistId = therapistId;

        const response = await apiClient.get(`/services/${serviceId}/availability/slots`, {
          params
        });

        if (response.data.length === 0) {
          setFullyBooked(true);
        }

        // Deduplicate slots by time, keeping the one with higher remaining count
        const deduplicatedSlots = response.data.reduce((acc, slot) => {
          const existingSlot = acc.find(s => s.time === slot.time);
          if (!existingSlot) {
            acc.push(slot);
          } else if (slot.remaining > existingSlot.remaining) {
            // Replace with slot that has more remaining spots
            const index = acc.indexOf(existingSlot);
            acc[index] = slot;
          }
          return acc;
        }, []);

        setAvailableSlots(deduplicatedSlots);
        if (!deduplicatedSlots.some(slot => slot.time === selectedSlot)) {
          setSelectedSlot(null);
          onDateTimeSelect({ date: format(selectedDate, 'yyyy-MM-dd'), time: null });
        }
      } catch (err) {
        setError('Failed to load available slots.');
        setAvailableSlots([]);
        setSelectedSlot(null);
        onDateTimeSelect({ date: format(selectedDate, 'yyyy-MM-dd'), time: null });
      } finally {
        setLoadingSlots(false);
      }
    }
    fetchSlots();
  }, [selectedDate, serviceId, serviceOptionId, therapistId, selectedSlot, onDateTimeSelect]);

  const handleDateChange = (e) => {
    const newDate = new Date(e.target.value);
    if (newDate < today) return;
    setSelectedDate(newDate);
    setSelectedSlot(null);
    onDateTimeSelect({ date: format(newDate, 'yyyy-MM-dd'), time: null });
  };

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot.time);
    onDateTimeSelect({ date: format(selectedDate, 'yyyy-MM-dd'), time: slot.time });
  };

  const handleNextDay = () => {
    const nextDay = addDays(selectedDate, 1);
    setSelectedDate(nextDay);
    setSelectedSlot(null);
    onDateTimeSelect({ date: format(nextDay, 'yyyy-MM-dd'), time: null });
  };

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 3, 
        border: '1px solid', 
        borderColor: theme.palette.divider,
        backgroundColor: theme.palette.background.paper,
        borderRadius: 2
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
          <CalendarToday />
        </Avatar>
        <Typography variant="h6" color="text.primary">
          Select Date
        </Typography>
      </Box>
      
      <input
        type="date"
        value={format(selectedDate, 'yyyy-MM-dd')}
        onChange={handleDateChange}
        min={format(today, 'yyyy-MM-dd')}
        style={{ 
          padding: '12px', 
          fontSize: '1rem', 
          marginBottom: '16px',
          borderRadius: '8px',
          border: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          fontFamily: theme.typography.fontFamily,
          width: '100%',
          maxWidth: '200px'
        }}
      />
      
      <Divider sx={{ mb: 3, borderColor: theme.palette.divider }} />
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
          <AccessTime />
        </Avatar>
        <Typography variant="h6" color="text.primary">
          Available Slots for {format(selectedDate, 'EEEE, MMMM do')}
        </Typography>
      </Box>

      {loadingSlots ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : fullyBooked ? (
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            No available slots for this date. Please contact our support team for further enquiries.
          </Alert>
          <Button
            variant="outlined"
            onClick={handleNextDay}
            sx={{
              borderColor: theme.palette.primary.main,
              color: theme.palette.primary.main,
              '&:hover': {
                borderColor: theme.palette.primary.dark,
                backgroundColor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText
              }
            }}
          >
            Check Next Day
          </Button>
        </Box>
      ) : availableSlots.length > 0 ? (
        <Grid container spacing={1}>
          {availableSlots.map((slot, index) => (
            <Grid
              item
              key={`${slot.time}-${index}`}
              xs={6}    // Takes half width (2 columns) on extra small screens
              sm={4}     // Takes 1/3 width on small screens (tablets)
              md={3}     // Takes 1/4 width on medium screens
              lg={2}  // Auto width on large screens (displays horizontally)
            >
              <Tooltip
                title={slot.remaining === 0 ? 'This time is completely booked' : ''}
                placement="top"
              >
                <span>
                  <Button
                    variant={selectedSlot === slot.time ? 'contained' : 'outlined'}
                    onClick={() => handleSlotSelect(slot)}
                    disabled={slot.remaining === 0}
                    fullWidth
                    size='small'
                    sx={{
                      position: 'relative',
                      opacity: slot.remaining === 0 ? 0.6 : 1,
                      backgroundColor: selectedSlot === slot.time 
                        ? theme.palette.primary.main 
                        : 'transparent',
                      color: selectedSlot === slot.time 
                        ? theme.palette.primary.contrastText 
                        : theme.palette.text.primary,
                      borderColor: selectedSlot === slot.time 
                        ? theme.palette.primary.main 
                        : theme.palette.divider,
                      '&:hover': {
                        backgroundColor: selectedSlot === slot.time 
                          ? theme.palette.primary.dark 
                          : theme.palette.action.hover,
                        borderColor: theme.palette.primary.main,
                      },
                      '&:disabled': {
                        color: theme.palette.text.disabled,
                        borderColor: theme.palette.text.disabled,
                        backgroundColor: 'transparent'
                      },
                      width: {
                        xs: '100%',  // Full width of the grid item on mobile
                        lg: 'auto',  // Auto width on large screens
                      }
                    }}
                  >
                    {slot.time}
                    {slot.remaining > 0 && (
                      <Chip
                        label={`${slot.remaining} left`}
                        size="small"
                        sx={{
                          ml: {xs: 0.5, sm: 1},
                          fontSize: '0.6rem',
                          height: '16px',
                          backgroundColor: theme.palette.success.light,
                          color: theme.palette.success.contrastText
                        }}
                      />
                    )}
                    {slot.remaining === 0 && (
                      <Info 
                        sx={{ 
                          ml: 0.5, 
                          fontSize: {xs: '0.875rem', sm: '1rem'},
                          color: theme.palette.text.disabled
                        }} 
                      />
                    )}
                  </Button>
                </span>
              </Tooltip>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            No available slots for this date.
          </Alert>
          <Button
            variant="outlined"
            sx={{ mt: 2 }}
            onClick={handleNextDay}
          >
            Check Next Day
          </Button>
        </Box>
      )}
    </Paper>
  );
}