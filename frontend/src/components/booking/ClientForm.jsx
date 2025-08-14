import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Grid,
  Avatar,
  Paper,
  Divider,
  Stack,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { Person, Email, Phone, Notes } from '@mui/icons-material';

export default function ClientForm({ formData: initialFormData, onFormChange }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    notes: '',
  });

  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    if (initialFormData) {
      setFormData(initialFormData);
    }
  }, [initialFormData]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    const updatedFormData = { ...formData, [name]: value };
    setFormData(updatedFormData);
    onFormChange?.(updatedFormData);
  };

  return (
    <Paper 
      elevation={1} 
      sx={{ 
        p: 4, 
        borderRadius: 3,
        backgroundColor: theme.palette.background.paper,
        border: theme.palette.mode === 'dark' ? '1px solid' : 'none',
        borderColor: theme.palette.mode === 'dark' ? 'divider' : 'transparent'
      }}
    >
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <Avatar sx={{ bgcolor: 'primary.main' }}>
          <Person />
        </Avatar>
        <Box>
          <Typography variant="h6" color="text.primary">
            Client Contact Details
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Please provide accurate information
          </Typography>
        </Box>
      </Stack>

      <Divider sx={{ mb: 4, borderColor: theme.palette.divider }} />

      <Grid container spacing={3}>
        {/* First Name and Last Name will always be in two columns except on small screens */}
        <Grid item xs={12} sm={6}>
          <TextField
            name="firstName"
            label="First Name"
            fullWidth
            required
            variant="outlined"
            value={formData.firstName}
            onChange={handleChange}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: theme.palette.background.paper,
                '& fieldset': {
                  borderColor: theme.palette.divider,
                },
                '&:hover fieldset': {
                  borderColor: theme.palette.primary.main,
                },
                '&.Mui-focused fieldset': {
                  borderColor: theme.palette.primary.main,
                },
              },
              '& .MuiInputLabel-root': {
                color: theme.palette.text.secondary,
                '&.Mui-focused': {
                  color: theme.palette.primary.main,
                },
              },
              '& .MuiOutlinedInput-input': {
                color: theme.palette.text.primary,
              },
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            name="lastName"
            label="Last Name"
            fullWidth
            required
            variant="outlined"
            value={formData.lastName}
            onChange={handleChange}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: theme.palette.background.paper,
                '& fieldset': {
                  borderColor: theme.palette.divider,
                },
                '&:hover fieldset': {
                  borderColor: theme.palette.primary.main,
                },
                '&.Mui-focused fieldset': {
                  borderColor: theme.palette.primary.main,
                },
              },
              '& .MuiInputLabel-root': {
                color: theme.palette.text.secondary,
                '&.Mui-focused': {
                  color: theme.palette.primary.main,
                },
              },
              '& .MuiOutlinedInput-input': {
                color: theme.palette.text.primary,
              },
            }}
          />
        </Grid>

        {/* Email and Phone will be stacked on small screens, side by side on larger */}
        <Grid item xs={12} md={6}>
          <TextField
            name="email"
            label="Email Address"
            type="email"
            fullWidth
            required
            variant="outlined"
            value={formData.email}
            onChange={handleChange}
            InputProps={{
              startAdornment: <Email sx={{ mr: 1, color: theme.palette.action.active }} />
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: theme.palette.background.paper,
                '& fieldset': {
                  borderColor: theme.palette.divider,
                },
                '&:hover fieldset': {
                  borderColor: theme.palette.primary.main,
                },
                '&.Mui-focused fieldset': {
                  borderColor: theme.palette.primary.main,
                },
              },
              '& .MuiInputLabel-root': {
                color: theme.palette.text.secondary,
                '&.Mui-focused': {
                  color: theme.palette.primary.main,
                },
              },
              '& .MuiOutlinedInput-input': {
                color: theme.palette.text.primary,
              },
            }}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            name="phone"
            label="Phone Number"
            type="tel"
            fullWidth
            required
            variant="outlined"
            value={formData.phone}
            onChange={handleChange}
            InputProps={{
              startAdornment: <Phone sx={{ mr: 1, color: theme.palette.action.active }} />
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: theme.palette.background.paper,
                '& fieldset': {
                  borderColor: theme.palette.divider,
                },
                '&:hover fieldset': {
                  borderColor: theme.palette.primary.main,
                },
                '&.Mui-focused fieldset': {
                  borderColor: theme.palette.primary.main,
                },
              },
              '& .MuiInputLabel-root': {
                color: theme.palette.text.secondary,
                '&.Mui-focused': {
                  color: theme.palette.primary.main,
                },
              },
              '& .MuiOutlinedInput-input': {
                color: theme.palette.text.primary,
              },
            }}
          />
        </Grid>

        {/* Notes will always take full width */}
        <Grid item xs={12}>
          <TextField
            name="notes"
            label="Any special requests or notes?"
            multiline
            rows={4}
            fullWidth
            variant="outlined"
            value={formData.notes}
            onChange={handleChange}
            InputProps={{
              startAdornment: <Notes sx={{ mr: 1, mt: 1.5, color: theme.palette.action.active }} />
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: theme.palette.background.paper,
                '& fieldset': {
                  borderColor: theme.palette.divider,
                },
                '&:hover fieldset': {
                  borderColor: theme.palette.primary.main,
                },
                '&.Mui-focused fieldset': {
                  borderColor: theme.palette.primary.main,
                },
              },
              '& .MuiInputLabel-root': {
                color: theme.palette.text.secondary,
                '&.Mui-focused': {
                  color: theme.palette.primary.main,
                },
              },
              '& .MuiOutlinedInput-input': {
                color: theme.palette.text.primary,
              },
            }}
          />
        </Grid>
      </Grid>
    </Paper>
  );
}