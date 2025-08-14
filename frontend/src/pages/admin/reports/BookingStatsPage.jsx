import React, { useState, useEffect } from 'react';
import { 
    Box, 
    Typography, 
    Paper, 
    CircularProgress, 
    Alert, 
    Grid,
    Button,
    Stack,
    Card,
    CardContent,
    Fade,
    Divider
} from '@mui/material';
import { 
    Assessment,
    GetApp,
    Print,
    EventNote,
    CheckCircle,
    Cancel,
    PersonOff,
    BarChart,
    PieChart
} from '@mui/icons-material';
import { Bar, Pie, Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    Tooltip as ChartTooltip,
    Legend,
} from 'chart.js';
import jsPDF from 'jspdf';
import apiClient from '../../../services/apiClient';
import ReportFilters from '../../../components/admin/reports/ReportFilters';
import { format } from 'date-fns';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    ChartTooltip,
    Legend
);

// Clean, minimal color scheme
const theme = {
    colors: {
        primary: '#1a1a1a',
        secondary: '#4a4a4a',
        tertiary: '#6a6a6a',
        light: '#f8f9fa',
        white: '#ffffff',
        border: '#e5e7eb',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
    },
    shadows: {
        small: '0 1px 3px rgba(0, 0, 0, 0.05)',
        medium: '0 4px 6px rgba(0, 0, 0, 0.05)',
        large: '0 10px 15px rgba(0, 0, 0, 0.08)',
    }
};

// Professional chart colors with better visual appeal
const chartColors = [
    '#3b82f6', // Blue
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Violet
    '#06b6d4', // Cyan
    '#f97316', // Orange
    '#84cc16', // Lime
    '#ec4899', // Pink
    '#6366f1', // Indigo
    '#14b8a6', // Teal
    '#eab308'  // Yellow
];

// Clean Statistic Card Component
const StatCard = ({ title, value, icon: Icon, color = theme.colors.primary, delay = 0 }) => {
    return (
        <Fade in={true} timeout={600} style={{ transitionDelay: `${delay}ms` }}>
            <Card sx={{ 
                height: '100%',
                background: theme.colors.white,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: 2,
                boxShadow: theme.shadows.small,
                transition: 'all 0.2s ease',
                '&:hover': {
                    boxShadow: theme.shadows.medium,
                    borderColor: color,
                }
            }}>
                <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" sx={{ 
                                color: theme.colors.tertiary,
                                fontWeight: 500,
                                mb: 1,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                fontSize: '0.75rem'
                            }}>
                                {title}
                            </Typography>
                            <Typography variant="h4" sx={{ 
                                fontWeight: 700, 
                                color: theme.colors.primary,
                                fontSize: { xs: '1.75rem', md: '2rem' },
                                lineHeight: 1.2
                            }}>
                                {value}
                            </Typography>
                        </Box>
                        <Box sx={{
                            backgroundColor: `${color}08`,
                            borderRadius: 2,
                            p: 1.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Icon sx={{ fontSize: 24, color: color }} />
                        </Box>
                    </Box>
                </CardContent>
            </Card>
        </Fade>
    );
};

// Clean Empty State Component
const EmptyState = ({ title, subtitle, icon: Icon }) => (
    <Fade in={true} timeout={800}>
        <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            py: 8,
            textAlign: 'center'
        }}>
            <Box sx={{
                backgroundColor: theme.colors.light,
                borderRadius: '50%',
                p: 3,
                mb: 3,
                border: `1px solid ${theme.colors.border}`
            }}>
                <Icon sx={{ fontSize: 48, color: theme.colors.tertiary }} />
            </Box>
            <Typography variant="h6" sx={{ 
                color: theme.colors.primary,
                fontWeight: 600,
                mb: 1
            }}>
                {title}
            </Typography>
            <Typography variant="body1" sx={{ 
                color: theme.colors.secondary,
                maxWidth: 400,
                lineHeight: 1.6
            }}>
                {subtitle}
            </Typography>
        </Box>
    </Fade>
);

// Clean Chart Container
const ChartContainer = ({ title, icon: Icon, children, delay = 0 }) => (
    <Fade in={true} timeout={600} style={{ transitionDelay: `${delay}ms` }}>
        <Card sx={{
            height: '100%',
            width: '100%',
            background: theme.colors.white,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: 2,
            boxShadow: theme.shadows.small,
            overflow: 'hidden',
            transition: 'all 0.2s ease',
            '&:hover': {
                boxShadow: theme.shadows.medium,
            }
        }}>
            <Box sx={{
                p: 3,
                borderBottom: `1px solid ${theme.colors.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5
            }}>
                <Icon sx={{ color: theme.colors.secondary, fontSize: 20 }} />
                <Typography variant="h6" sx={{ 
                    color: theme.colors.primary,
                    fontWeight: 600,
                    fontSize: '1rem'
                }}>
                    {title}
                </Typography>
            </Box>
            <CardContent sx={{ p: 3, height: 'calc(100% - 73px)', width: '100%' }}>
                {children}
            </CardContent>
        </Card>
    </Fade>
);

export default function BookingStatsPage() {
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [availableTherapists, setAvailableTherapists] = useState([]);
    const [availableServices, setAvailableServices] = useState([]);
    const [currentFilters, setCurrentFilters] = useState(null);
    const [isExporting, setIsExporting] = useState(false);

    // Fetch initial data for filters
    useEffect(() => {
        const fetchFilterData = async () => {
            try {
                const [therapistsRes, servicesRes] = await Promise.all([
                    apiClient.get('/therapists'),
                    apiClient.get('/services')
                ]);

                const therapists = therapistsRes.data?.therapists || [];
                const services = Array.isArray(servicesRes.data) ? servicesRes.data : [];

                setAvailableTherapists(therapists);
                setAvailableServices(services);
            } catch (err) {
                console.error("Error fetching filter data:", err);
            }
        };

        fetchFilterData();
    }, []);

    const fetchBookingStats = async (filters) => {
        setLoading(true);
        setError(null);
        setReportData(null);
        setCurrentFilters(filters);
        
        try {
            const queryParams = {
                startDate: format(filters.startDate, 'yyyy-MM-dd'),
                endDate: format(filters.endDate, 'yyyy-MM-dd'),
                ...(filters.therapistId && { therapistId: filters.therapistId }),
                ...(filters.serviceId && { serviceId: filters.serviceId }),
            };
            const response = await apiClient.get('/reports/booking-stats', { params: queryParams });
            setReportData(response.data);
        } catch (err) {
            console.error("Error fetching booking stats:", err);
            setError(err.response?.data?.message || "Failed to load booking statistics.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const defaultStart = new Date();
        defaultStart.setDate(1);
        const defaultEnd = new Date();

        fetchBookingStats({ startDate: defaultStart, endDate: defaultEnd });
    }, []);

    // PDF Export Function
    const exportToPDF = async () => {
        if (!reportData) return;
        
        setIsExporting(true);
        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            // Clean header
            pdf.setFontSize(20);
            pdf.setTextColor(26, 26, 26);
            pdf.text('Booking Statistics Report', 20, 25);
            
            pdf.setFontSize(10);
            pdf.setTextColor(106, 106, 106);
            const dateRange = currentFilters ? 
                `${format(currentFilters.startDate, 'MMM dd, yyyy')} - ${format(currentFilters.endDate, 'MMM dd, yyyy')}` : 
                'Current Period';
            pdf.text(`Report Period: ${dateRange}`, 20, 33);
            
            // Statistics Summary
            pdf.setFontSize(14);
            pdf.setTextColor(26, 26, 26);
            pdf.text('Summary Statistics', 20, 50);
            
            pdf.setFontSize(11);
            pdf.setTextColor(74, 74, 74);
            const stats = [
                `Total Bookings: ${reportData.totalBookings || 0}`,
                `Completed Sessions: ${reportData.totalCompleted || 0}`,
                `Cancelled Sessions: ${reportData.totalCancelled || 0}`,
                `No-Show Rate: ${reportData.noShowRate !== undefined ? `${(reportData.noShowRate * 100).toFixed(1)}%` : 'N/A'}`
            ];
            
            stats.forEach((stat, index) => {
                pdf.text(stat, 25, 60 + (index * 8));
            });
            
            const fileName = `booking-stats-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
            pdf.save(fileName);
            
        } catch (error) {
            console.error('Error generating PDF:', error);
        } finally {
            setIsExporting(false);
        }
    };

    // Enhanced chart data preparation with top services logic
    const prepareChartData = (dataKey, labelField, dataField, chartLabel, maxItems = 8) => {
        const raw = reportData?.[dataKey] || [];
        const isEmpty = raw.length === 0;

        if (isEmpty) {
            return {
                labels: ['No Data'],
                datasets: [{
                    label: chartLabel,
                    data: [0],
                    backgroundColor: [chartColors[0]],
                    hoverBackgroundColor: [`rgba(59, 130, 246, 0.8)`],
                    borderColor: theme.colors.white,
                    borderWidth: 2,
                }],
                isEmpty: true,
                allData: [],
                topData: [],
                othersData: null
            };
        }

        // Sort by count in descending order
        const sortedData = [...raw].sort((a, b) => b[dataField] - a[dataField]);
        
        let topData = sortedData;
        let othersData = null;
        
        // If we have more than maxItems, group the rest as "Others"
        if (sortedData.length > maxItems) {
            topData = sortedData.slice(0, maxItems - 1);
            const othersItems = sortedData.slice(maxItems - 1);
            const othersCount = othersItems.reduce((sum, item) => sum + item[dataField], 0);
            
            othersData = {
                [labelField]: `Others (${othersItems.length})`,
                [dataField]: othersCount,
                items: othersItems
            };
            
            topData.push(othersData);
        }

        const labels = topData.map(item => item[labelField]);
        const data = topData.map(item => item[dataField]);
        const backgroundColors = data.map((_, index) => chartColors[index % chartColors.length]);
        const hoverColors = backgroundColors.map(color => {
            const hex = color.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            return `rgba(${r}, ${g}, ${b}, 0.8)`;
        });

        return {
            labels,
            datasets: [{
                label: chartLabel,
                data,
                backgroundColor: backgroundColors,
                hoverBackgroundColor: hoverColors,
                borderColor: theme.colors.white,
                borderWidth: 2,
                hoverBorderWidth: 3,
            }],
            isEmpty: false,
            allData: sortedData,
            topData,
            othersData
        };
    };

    const bookingsByServiceChart = prepareChartData(
        'bookingsByService',
        'serviceName', 
        'count',
        'Bookings by Service'
    );

    const bookingsByTherapistChart = prepareChartData(
        'bookingsByTherapist',
        'therapistName',
        'count', 
        'Bookings by Therapist'
    );

    // Clean chart options
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: theme.colors.primary,
                titleColor: 'white',
                bodyColor: 'white',
                borderWidth: 0,
                cornerRadius: 4,
                displayColors: false,
                padding: 12,
            },
        },
        scales: {
            x: {
                grid: {
                    display: false,
                },
                ticks: {
                    color: theme.colors.secondary,
                    font: {
                        size: 12,
                    },
                },
            },
            y: {
                grid: {
                    color: theme.colors.border,
                    drawBorder: false,
                },
                ticks: {
                    color: theme.colors.secondary,
                    font: {
                        size: 12,
                    },
                },
                beginAtZero: true,
            },
        },
        elements: {
            bar: {
                borderRadius: 4,
            }
        }
    };

    const doughnutChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    padding: 20,
                    usePointStyle: true,
                    pointStyle: 'circle',
                    color: theme.colors.secondary,
                    font: {
                        size: 12,
                    },
                },
            },
            tooltip: {
                backgroundColor: theme.colors.primary,
                titleColor: 'white',
                bodyColor: 'white',
                borderWidth: 0,
                cornerRadius: 4,
                padding: 12,
                callbacks: {
                    label: function (context) {
                        let label = context.label || '';
                        if (label) {
                            label += ': ';
                        }
                        const value = context.parsed;
                        const total = context.dataset.data.reduce((acc, val) => acc + val, 0);
                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) + '%' : '0%';
                        label += `${value} (${percentage})`;
                        return label;
                    }
                }
            }
        },
    };

    const hasData = reportData && (
        (reportData.bookingsByService && reportData.bookingsByService.length > 0) ||
        (reportData.bookingsByTherapist && reportData.bookingsByTherapist.length > 0)
    );

    return (
        <Box sx={{ 
            minHeight: '100vh',
            backgroundColor: theme.colors.light,
            p: { xs: 2, md: 3 },
            width: '100%',
            maxWidth: 'none'
        }}>
            {/* Clean Header */}
            <Fade in={true} timeout={600}>
                <Paper sx={{
                    background: theme.colors.white,
                    borderRadius: 2,
                    p: 4,
                    mb: 4,
                    boxShadow: theme.shadows.medium,
                    border: `1px solid ${theme.colors.border}`
                }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 3 }}>
                        <Box>
                            <Typography variant="h3" sx={{ 
                                color: theme.colors.primary,
                                fontWeight: 700,
                                fontSize: { xs: '1.75rem', md: '2.25rem' },
                                mb: 1,
                                lineHeight: 1.2
                            }}>
                                Booking Statistics
                            </Typography>
                            <Typography variant="body1" sx={{ 
                                color: theme.colors.secondary,
                                fontSize: '1rem',
                                lineHeight: 1.6
                            }}>
                                Comprehensive insights into your booking performance
                            </Typography>
                        </Box>
                        <Stack direction="row" spacing={2}>
                            <Button
                                variant="outlined"
                                startIcon={<Print />}
                                onClick={() => window.print()}
                                sx={{ 
                                    borderColor: theme.colors.border,
                                    color: theme.colors.secondary,
                                    borderRadius: 1.5,
                                    px: 3,
                                    '&:hover': {
                                        borderColor: theme.colors.primary,
                                        color: theme.colors.primary,
                                        backgroundColor: 'transparent'
                                    }
                                }}
                            >
                                Print
                            </Button>
                            <Button
                                variant="contained"
                                startIcon={<GetApp />}
                                onClick={exportToPDF}
                                disabled={!reportData || isExporting}
                                sx={{ 
                                    backgroundColor: theme.colors.primary,
                                    borderRadius: 1.5,
                                    px: 3,
                                    boxShadow: theme.shadows.small,
                                    '&:hover': {
                                        backgroundColor: theme.colors.secondary,
                                        boxShadow: theme.shadows.medium
                                    }
                                }}
                            >
                                {isExporting ? 'Exporting...' : 'Export PDF'}
                            </Button>
                        </Stack>
                    </Box>
                </Paper>
            </Fade>

            {/* Filters */}
            <Fade in={true} timeout={800}>
                <Paper sx={{
                    p: 3,
                    mb: 4,
                    borderRadius: 2,
                    boxShadow: theme.shadows.small,
                    border: `1px solid ${theme.colors.border}`,
                    background: theme.colors.white
                }}>
                    <ReportFilters
                        onApplyFilters={fetchBookingStats}
                        availableTherapists={availableTherapists}
                        availableServices={availableServices}
                    />
                </Paper>
            </Fade>

            {/* Loading State */}
            {loading && (
                <Fade in={true} timeout={400}>
                    <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        my: 6,
                        p: 4
                    }}>
                        <Box sx={{ textAlign: 'center' }}>
                            <CircularProgress 
                                size={40} 
                                sx={{ 
                                    color: theme.colors.primary,
                                    mb: 2 
                                }} 
                            />
                            <Typography variant="body1" sx={{ color: theme.colors.secondary }}>
                                Loading analytics...
                            </Typography>
                        </Box>
                    </Box>
                </Fade>
            )}

            {/* Error State */}
            {error && (
                <Fade in={true} timeout={400}>
                    <Alert 
                        severity="error" 
                        sx={{ 
                            my: 3,
                            borderRadius: 2
                        }}
                    >
                        {error}
                    </Alert>
                </Fade>
            )}

            {reportData && (
                <>
                    {/* Statistics Cards */}
                    <Grid container spacing={3} sx={{ mb: 4 }}>
                        <Grid item xs={12} sm={6} lg={3}>
                            <StatCard
                                title="Total Bookings"
                                value={reportData.totalBookings || 0}
                                icon={EventNote}
                                color={theme.colors.primary}
                                delay={0}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} lg={3}>
                            <StatCard
                                title="Completed"
                                value={reportData.totalCompleted || 0}
                                icon={CheckCircle}
                                color={theme.colors.success}
                                delay={100}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} lg={3}>
                            <StatCard
                                title="Cancelled"
                                value={reportData.totalCancelled || 0}
                                icon={Cancel}
                                color={theme.colors.error}
                                delay={200}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} lg={3}>
                            <StatCard
                                title="No-Show Rate"
                                value={reportData.noShowRate !== undefined ? `${(reportData.noShowRate * 100).toFixed(1)}%` : 'N/A'}
                                icon={PersonOff}
                                color={theme.colors.warning}
                                delay={300}
                            />
                        </Grid>
                    </Grid>

                    {/* Charts */}
                    {hasData ? (
                        <Box sx={{ 
                            width: '100vw', 
                            maxWidth: '100%',
                            marginLeft: { xs: '-16px', md: '-24px' },
                            marginRight: { xs: '-16px', md: '-24px' },
                            paddingLeft: { xs: '16px', md: '24px' },
                            paddingRight: { xs: '16px', md: '24px' }
                        }}>
                            <Grid container spacing={4} sx={{ width: '100%', margin: 0 }}>
                                <Grid item xs={12} lg={6} sx={{ width: '100%' }}>
                                    <ChartContainer 
                                        title="Bookings by Service"
                                        icon={PieChart}
                                        delay={0}
                                    >
                                        <Box sx={{ display: 'flex', gap: 3, height: 350 }}>
                                            {/* Chart Section */}
                                            <Box sx={{ flex: 1, position: 'relative' }}>
                                                {/* Center text overlay for doughnut chart */}
                                                <Box sx={{
                                                    position: 'absolute',
                                                    top: '50%',
                                                    left: '50%',
                                                    transform: 'translate(-50%, -50%)',
                                                    textAlign: 'center',
                                                    zIndex: 1,
                                                    pointerEvents: 'none'
                                                }}>
                                                    <Typography variant="h4" sx={{ 
                                                        fontWeight: 700, 
                                                        color: theme.colors.primary,
                                                        lineHeight: 1
                                                    }}>
                                                        {reportData?.totalBookings || 0}
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ 
                                                        color: theme.colors.secondary,
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.5px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 500
                                                    }}>
                                                        Total Bookings
                                                    </Typography>
                                                </Box>
                                                <Doughnut 
                                                    options={doughnutChartOptions} 
                                                    data={bookingsByServiceChart} 
                                                />
                                            </Box>
                                            
                                            {/* Service breakdown stats */}
                                            {reportData?.bookingsByService && reportData.bookingsByService.length > 0 && (
                                                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                    <Typography variant="subtitle2" sx={{ 
                                                        color: theme.colors.primary,
                                                        fontWeight: 600,
                                                        mb: 2,
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.5px',
                                                        fontSize: '0.75rem'
                                                    }}>
                                                        Service Breakdown
                                                    </Typography>
                                                    <Box sx={{ 
                                                        display: 'flex', 
                                                        flexDirection: 'column', 
                                                        gap: 1.5,
                                                        overflowY: 'auto',
                                                        flex: 1,
                                                        pr: 1
                                                    }}>
                                                        {reportData.bookingsByService.map((service, index) => {
                                                            const total = reportData.totalBookings || 1;
                                                            const percentage = ((service.count / total) * 100).toFixed(1);
                                                            const color = chartColors[index % chartColors.length];
                                                            
                                                            return (
                                                                <Box key={service.serviceName} sx={{ 
                                                                    display: 'flex', 
                                                                    alignItems: 'center', 
                                                                    justifyContent: 'space-between',
                                                                    py: 1.5,
                                                                    px: 2,
                                                                    backgroundColor: `${color}08`,
                                                                    borderRadius: 1.5,
                                                                    border: `1px solid ${color}20`,
                                                                    minHeight: 48
                                                                }}>
                                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                                                                        <Box sx={{
                                                                            width: 12,
                                                                            height: 12,
                                                                            borderRadius: '50%',
                                                                            backgroundColor: color,
                                                                            flexShrink: 0
                                                                        }} />
                                                                        <Typography variant="body2" sx={{ 
                                                                            color: theme.colors.primary,
                                                                            fontWeight: 500,
                                                                            fontSize: '0.85rem',
                                                                            lineHeight: 1.3
                                                                        }}>
                                                                            {service.serviceName}
                                                                        </Typography>
                                                                    </Box>
                                                                    <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                                                                        <Typography variant="body2" sx={{ 
                                                                            color: theme.colors.primary,
                                                                            fontWeight: 600,
                                                                            fontSize: '0.9rem'
                                                                        }}>
                                                                            {service.count}
                                                                        </Typography>
                                                                        <Typography variant="caption" sx={{ 
                                                                            color: theme.colors.secondary,
                                                                            fontSize: '0.7rem'
                                                                        }}>
                                                                            {percentage}%
                                                                        </Typography>
                                                                    </Box>
                                                                </Box>
                                                            );
                                                        })}
                                                    </Box>
                                                </Box>
                                            )}
                                        </Box>
                                    </ChartContainer>
                                </Grid>
                                <Grid item xs={12} lg={6} sx={{ width: '100%' }}>
                                    <ChartContainer 
                                        title="Bookings by Therapist"
                                        icon={BarChart}
                                        delay={200}
                                    >
                                        <Box sx={{ height: 350, width: '100%' }}>
                                            <Bar 
                                                options={chartOptions} 
                                                data={bookingsByTherapistChart} 
                                            />
                                        </Box>
                                    </ChartContainer>
                                </Grid>
                            </Grid>
                        </Box>
                    ) : (
                        <Paper sx={{
                            p: 6,
                            borderRadius: 2,
                            boxShadow: theme.shadows.small,
                            border: `1px solid ${theme.colors.border}`,
                            background: theme.colors.white
                        }}>
                            <EmptyState
                                title="No Data Available"
                                subtitle="No bookings found for the selected criteria. Try adjusting your date range or removing filters to see more results."
                                icon={Assessment}
                            />
                        </Paper>
                    )}
                </>
            )}
        </Box>
    );
}