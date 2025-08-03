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
  Chip
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
        if (therapistId) params.therapistId = therapistId;

        const response = await apiClient.get(`/services/${serviceId}/availability/slots`, {
          params
        });

        if (response.data.length === 0) {
          setFullyBooked(true);
        }

        setAvailableSlots(response.data);
        if (!response.data.some(slot => slot.time === selectedSlot)) {
          setSelectedSlot(null);
          onDateTimeSelect({ date: selectedDate, time: null });
        }
      } catch (err) {
        setError('Failed to load available slots.');
        setAvailableSlots([]);
        setSelectedSlot(null);
        onDateTimeSelect({ date: selectedDate, time: null });
      } finally {
        setLoadingSlots(false);
      }
    }
    fetchSlots();
  }, [selectedDate, serviceId, serviceOptionId, therapistId]);

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
    <Paper elevation={0} sx={{ p: 3, border: '1px solid #e0e0e0' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
          <CalendarToday />
        </Avatar>
        <Typography variant="h6">Select Date</Typography>
      </Box>
      <input
        type="date"
        value={format(selectedDate, 'yyyy-MM-dd')}
        onChange={handleDateChange}
        min={format(today, 'yyyy-MM-dd')}
        style={{ padding: '8px', fontSize: '1rem', marginBottom: '16px' }}
      />
      <Divider sx={{ mb: 3 }} />
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
          <AccessTime />
        </Avatar>
        <Typography variant="h6">
          Available Slots for {format(selectedDate, 'EEEE, MMMM do')}
        </Typography>
      </Box>

      {loadingSlots ? (
        <CircularProgress />
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : fullyBooked ? (
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            Please contact our support team for further enquiries.
          </Alert>
          <Button
            variant="outlined"
            onClick={handleNextDay}
          >
            Check Next Day
          </Button>
        </Box>
      ) : availableSlots.length > 0 ? (
        <Grid container spacing={1}>
          {availableSlots.map((slot) => (
            <Grid
              item
              key={slot.time}
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
                      '&:disabled': {
                        color: 'text.disabled',
                        borderColor: 'text.disabled',
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
                          backgroundColor: 'success.light',
                          color: 'white'
                        }}
                      />
                    )}
                    {slot.remaining === 0 && (
                      <Info color="disabled" sx={{ ml: 0.5, fontSize: {xs: '0.875rem', sm: '1rem'} }} />
                    )}
                  </Button>
                </span>
              </Tooltip>
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Typography>No available slots for this date.</Typography>
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