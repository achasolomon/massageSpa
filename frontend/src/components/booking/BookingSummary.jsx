import React from 'react';
import { Paper, Typography, Grid, Divider, Box, Chip } from '@mui/material';
import { CalendarToday, Person, Email, LocalPhone, CreditCard, MonetizationOn, Spa } from '@mui/icons-material';
import { format } from 'date-fns';

export default function BookingSummary({ bookingData }) {
  const { service, serviceOption, dateTime, clientInfo, paymentDetails } = bookingData;

  const formattedDate = dateTime.date ? format(dateTime.date, 'EEEE, MMMM do, yyyy') : 'N/A';
  const formattedTime = dateTime.time || 'N/A';

  return (
    <Paper sx={{ p: 4, borderRadius: 4, backgroundColor: '#fff' }}>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
        Booking Summary
      </Typography>

      <Grid container spacing={4}>
        <Grid item xs={12} md={7}>
          <Section title="Service Details" icon={<Spa />}>
            <Item label="Service:" value={service?.name || 'N/A'} />
            <Item 
              label="Option:" 
              value={serviceOption ? `${serviceOption.optionName || ''} - $${serviceOption.price} (${serviceOption.duration} min)` : 'N/A'} 
            />
          </Section>

          <Divider sx={{ my: 3 }} />

          <Section title="Appointment" icon={<CalendarToday />}>
            <Item value={`${formattedDate} at ${formattedTime}`} fullWidth />
          </Section>

          <Divider sx={{ my: 3 }} />

          <Section title="Client Information" icon={<Person />} spacing={2}>
            <Item label="Name:" value={`${clientInfo.firstName} ${clientInfo.lastName}`} />
            <Item label="Email:" value={clientInfo.email} />
            <Item label="Phone:" value={clientInfo.phone} />
          </Section>
        </Grid>

        <Grid item xs={12} md={5}>
          <Section title="Payment Method" icon={<CreditCard />}>
            <Item value={getPaymentMethodDisplay(paymentDetails)} />
          </Section>

          <Divider sx={{ my: 3 }} />

          <Section title="Summary" icon={<MonetizationOn />}>
            <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
              <Typography variant="subtitle1">Total</Typography>
              <Chip
                label={`$${serviceOption?.price ? Number(serviceOption.price).toFixed(2) : '0.00'}`}
                color="primary"
                sx={{ fontSize: '0.75rem', fontWeight: 400, px: 2, backgroundColor: '#1976d2', color: '#fff' }}
              />
            </Box>
          </Section>
        </Grid>
      </Grid>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 4, textAlign: 'center' }}>
        Please review your booking details before confirming.
      </Typography>
    </Paper>
  );
}

function Section({ title, icon, children }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        {icon}
        <Typography variant="subtitle1" fontWeight={600}>
          {title}
        </Typography>
      </Box>
      <Box>{children}</Box>
    </Box>
  );
}

function Item({ label, value, icon, fullWidth = false }) {
  return (
    <Grid container spacing={1} alignItems="center" sx={{ mb: 1 }}>
      {!fullWidth && (
        <Grid item xs={5} display="flex" alignItems="center" gap={1}>
          {icon}
          <Typography 
            component="span" 
            color="text.secondary" 
            sx={{ whiteSpace: 'nowrap', fontWeight: 600 }}
          >
            {label}
          </Typography>
        </Grid>
      )}
      <Grid item xs={fullWidth ? 12 : 7}>
        <Typography component="span" sx={{ wordBreak: 'break-word' }}>
          {value}
        </Typography>
      </Grid>
    </Grid>
  );
}

function getPaymentMethodDisplay(paymentDetails) {
  if (!paymentDetails?.method) return 'N/A';
  
  const methodNames = {
    credit_card: 'Credit/Debit Card',
    insurance: 'Insurance',
    cash: 'Cash',
    interac: 'Interac e-Transfer'
  };
  
  return methodNames[paymentDetails.method] || paymentDetails.method;
}