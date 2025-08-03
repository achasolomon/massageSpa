import React, { useState } from 'react';
import { Box, TextField, Button, Grid, FormControl, InputLabel, Select, MenuItem, Paper, Typography } from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from 'date-fns';

// Component for common report filtering options
export default function ReportFilters({ onApplyFilters, availableTherapists = [], availableServices = [] }) {
    const today = new Date();
    const [filters, setFilters] = useState({
        startDate: startOfMonth(today), // Default to start of current month
        endDate: endOfMonth(today),     // Default to end of current month
        therapistId: '',
        serviceId: '',
    });



    const handleDateChange = (name) => (date) => {
        setFilters(prev => ({ ...prev, [name]: date }));
    };

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handlePresetDateRange = (range) => {
        let start, end;
        switch (range) {
            case 'this_month':
                start = startOfMonth(today);
                end = endOfMonth(today);
                break;
            case 'last_month':
                const lastMonth = subMonths(today, 1);
                start = startOfMonth(lastMonth);
                end = endOfMonth(lastMonth);
                break;
            case 'this_year':
                start = startOfYear(today);
                end = endOfYear(today);
                break;
            default:
                start = startOfMonth(today);
                end = endOfMonth(today);
        }
        setFilters(prev => ({ ...prev, startDate: start, endDate: end }));
    };

    const applyFilters = () => {
        // Pass the current filter state to the parent component
        onApplyFilters(filters);
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="h6" gutterBottom>Filter Report</Typography>
                <Grid container spacing={2} alignItems="center">
                    {/* Date Range Presets */}
                    <Grid item xs={12} sm={6} md={3}>
                        <FormControl fullWidth size="small">
                            <InputLabel id="preset-range-label">Date Range</InputLabel>
                            <Select
                                labelId="preset-range-label"
                                label="Date Range"
                                onChange={(e) => handlePresetDateRange(e.target.value)}
                                defaultValue="this_month"
                            >
                                <MenuItem value="this_month">This Month</MenuItem>
                                <MenuItem value="last_month">Last Month</MenuItem>
                                <MenuItem value="this_year">This Year</MenuItem>
                                {/* Add custom option if needed */}
                            </Select>
                        </FormControl>
                    </Grid>
                    {/* Start Date */}
                    <Grid item xs={12} sm={6} md={3}>
                        <DatePicker
                            label="Start Date"
                            value={filters.startDate}
                            onChange={handleDateChange('startDate')}
                            renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                        />
                    </Grid>
                    {/* End Date */}
                    <Grid item xs={12} sm={6} md={3}>
                        <DatePicker
                            label="End Date"
                            value={filters.endDate}
                            onChange={handleDateChange('endDate')}
                            renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                        />
                    </Grid>
                    {/* Therapist Filter */}
                    <Grid item xs={12} sm={6} md={3}>
                        <FormControl fullWidth size="small">
                            <InputLabel id="therapist-filter-label">Therapist</InputLabel>
                            <Select
                                labelId="therapist-filter-label"
                                name="therapistId"
                                value={filters.therapistId}
                                label="Therapist"
                                onChange={handleChange}
                            >
                                {Array.isArray(availableTherapists) &&
                                    availableTherapists.map((therapist) => (
                                        <MenuItem key={therapist.id} value={therapist.id}>
                                            {therapist.User?.firstName} {therapist.User?.lastName}
                                        </MenuItem>
                                    ))}

                            </Select>
                        </FormControl>
                    </Grid>
                    {/* Service Filter */}
                    <Grid item xs={12} sm={6} md={3}>
                        <FormControl fullWidth size="small">
                            <InputLabel id="service-filter-label">Service</InputLabel>
                            <Select
                                labelId="service-filter-label"
                                name="serviceId"
                                value={filters.serviceId}
                                label="Service"
                                onChange={handleChange}
                            >
                                <MenuItem value=""><em>All Services</em></MenuItem>
                                {availableServices.map(service => (
                                    <MenuItem key={service.id} value={service.id}>
                                        {service.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    {/* Apply Button */}
                    <Grid item xs={12} md={3} sx={{ display: 'flex', alignItems: 'flex-end' }}>
                        <Button variant="contained" onClick={applyFilters} fullWidth>
                            Apply Filters
                        </Button>
                    </Grid>
                </Grid>
            </Paper>
        </LocalizationProvider>
    );
}
