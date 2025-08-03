import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, Typography, Button, Card, CardContent, FormControl, FormControlLabel, Checkbox,
  InputLabel, Select, MenuItem, Grid, Alert, CircularProgress, Divider, List, ListItem,
  ListItemText, Chip, Tooltip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle
} from '@mui/material';
import { format, isValid } from 'date-fns';
import apiClient from '../../../services/apiClient';

const BookingChips = ({ hasEmail, hasPhone }) => (
  <Box>
    {hasEmail && (
      <Tooltip title="Client has an email address">
        <Chip label="Email" color="primary" size="small" sx={{ mr: 1 }} />
      </Tooltip>
    )}
    {hasPhone && (
      <Tooltip title="Client has a phone number">
        <Chip label="Phone" color="secondary" size="small" />
      </Tooltip>
    )}
  </Box>
);

const RemindersPanel = () => {
  const [loading, setLoading] = useState(false);
  const [checkingBookings, setCheckingBookings] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  
  // Form state
  const [daysAhead, setDaysAhead] = useState(1);
  const [status, setStatus] = useState('Confirmed');
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSMS, setSendSMS] = useState(true);

  // Fetch bookings function
  const fetchBookings = useCallback(async () => {
    setCheckingBookings(true);
    setError(null);
    setSuccess(null);
    setResults(null);
    try {
      const response = await apiClient.get(`/reminders/check`, {
        params: { daysAhead, status }
      });
      setBookings(response.data.bookings || []);
      if (response.data.count === 0) {
        setSuccess('No bookings found that need reminders.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error checking for bookings');
      setBookings([]);
    } finally {
      setCheckingBookings(false);
    }
  }, [daysAhead, status]);

  // Initial fetch on mount
  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Send reminders
  const sendReminders = async () => {
    setSendingReminders(true);
    setError(null);
    setSuccess(null);
    setResults(null);
    try {
      const response = await apiClient.post('/reminders/send', {
        daysAhead,
        status,
        sendEmail,
        sendSMS
      });
      setResults(response.data.results);
      setSuccess('Reminders sent successfully!');
      // Refresh bookings after sending
      await fetchBookings();
    } catch (err) {
      setError(err.response?.data?.message || 'Error sending reminders');
    } finally {
      setSendingReminders(false);
      setConfirmOpen(false);
    }
  };

  // Confirmation dialog handlers
  const handleOpenConfirm = () => setConfirmOpen(true);
  const handleCloseConfirm = () => setConfirmOpen(false);

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Appointment Reminders
      </Typography>
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Check for Upcoming Appointments
          </Typography>
          
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel id="daysAhead-label">Days Ahead</InputLabel>
                <Select
                  labelId="daysAhead-label"
                  value={daysAhead}
                  label="Days Ahead"
                  onChange={(e) => setDaysAhead(e.target.value)}
                >
                  <MenuItem value={1}>Tomorrow</MenuItem>
                  <MenuItem value={2}>2 Days</MenuItem>
                  <MenuItem value={3}>3 Days</MenuItem>
                  <MenuItem value={7}>7 Days</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel id="status-label">Booking Status</InputLabel>
                <Select
                  labelId="status-label"
                  value={status}
                  label="Booking Status"
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <MenuItem value="Confirmed">Confirmed</MenuItem>
                  <MenuItem value="Pending Confirmation">Pending Confirmation</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={12} md={6}>
              <Button 
                variant="outlined" 
                onClick={fetchBookings}
                disabled={checkingBookings}
                startIcon={checkingBookings ? <CircularProgress size={20} /> : null}
                aria-label="Check bookings that need reminders"
              >
                {checkingBookings ? 'Checking...' : 'Check Bookings'}
              </Button>
            </Grid>
          </Grid>
          
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {success}
            </Alert>
          )}
          
          {bookings.length > 0 && (
            <Box mt={3}>
              <Typography variant="subtitle1" gutterBottom>
                Found {bookings.length} bookings that need reminders:
              </Typography>
              
              <List>
                {bookings.map((booking) => {
                  const dateObj = new Date(booking.appointmentDate);
                  const formattedDate = isValid(dateObj)
                    ? format(dateObj, 'EEEE, MMMM d, yyyy h:mm a')
                    : 'Invalid date';
                  return (
                    <ListItem key={booking.id} divider>
                      <ListItemText
                        primary={`${booking.clientName} - ${booking.serviceName}`}
                        secondary={`${formattedDate} with ${booking.therapistName}`}
                      />
                      <BookingChips hasEmail={booking.hasEmail} hasPhone={booking.hasPhone} />
                    </ListItem>
                  );
                })}
              </List>
              
              <Box mt={3}>
                <Typography variant="h6" gutterBottom>
                  Send Reminders
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={sendEmail}
                          onChange={(e) => setSendEmail(e.target.checked)}
                          inputProps={{ 'aria-label': 'Send Email Reminders' }}
                        />
                      }
                      label="Send Email Reminders"
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={sendSMS}
                          onChange={(e) => setSendSMS(e.target.checked)}
                          inputProps={{ 'aria-label': 'Send SMS Reminders' }}
                        />
                      }
                      label="Send SMS Reminders"
                    />
                  </Grid>
                </Grid>
                
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleOpenConfirm}
                  disabled={sendingReminders || (!sendEmail && !sendSMS)}
                  startIcon={sendingReminders ? <CircularProgress size={20} color="inherit" /> : null}
                  sx={{ mt: 2 }}
                  aria-label="Send reminders to clients"
                >
                  {sendingReminders ? 'Sending...' : 'Send Reminders'}
                </Button>

                {/* Confirmation Dialog */}
                <Dialog
                  open={confirmOpen}
                  onClose={handleCloseConfirm}
                  aria-labelledby="confirm-dialog-title"
                  aria-describedby="confirm-dialog-description"
                >
                  <DialogTitle id="confirm-dialog-title">Confirm Send Reminders</DialogTitle>
                  <DialogContent>
                    <DialogContentText id="confirm-dialog-description">
                      Are you sure you want to send reminders to {bookings.length} booking{bookings.length !== 1 ? 's' : ''}?
                    </DialogContentText>
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={handleCloseConfirm} disabled={sendingReminders}>Cancel</Button>
                    <Button onClick={sendReminders} color="primary" disabled={sendingReminders} autoFocus>
                      Yes, Send
                    </Button>
                  </DialogActions>
                </Dialog>
              </Box>
            </Box>
          )}
          
          {results && (
            <Box mt={3}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6">Results</Typography>
              <Typography>Total bookings processed: {results.total}</Typography>
              <Typography>Email reminders sent: {results.emailSent}</Typography>
              <Typography>SMS reminders sent: {results.smsSent}</Typography>
              
              {results.errors && results.errors.length > 0 && (
                <Box mt={2}>
                  <Typography color="error">Errors: {results.errors.length}</Typography>
                  <List>
                    {results.errors.map((error, index) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={`Error with booking ${error.bookingId}`}
                          secondary={error.error}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default RemindersPanel;
