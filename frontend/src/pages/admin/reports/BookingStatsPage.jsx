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
    CardContent
} from '@mui/material';
import { 
    Assessment,
    GetApp,
    Print,
    EventNote,
    CheckCircle,
    Cancel,
    PersonOff
} from '@mui/icons-material';
import { Bar, Pie } from 'react-chartjs-2';
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

// Professional color scheme
const colors = {
    primary: '#2C3E50',
    secondary: '#34495E',
    accent: '#7F8C8D',
    background: '#F8F9FA',
    white: '#FFFFFF',
    border: '#E0E0E0'
};

// Chart color palette
const chartColors = [
    '#2C3E50', '#34495E', '#7F8C8D', '#95A5A6',
    '#27AE60', '#16A085', '#F39C12', '#E67E22'
];

// Statistic Card Component
const StatCard = ({ title, value, icon: Icon }) => (
    <Card sx={{ 
        height: '100%',
        backgroundColor: colors.white,
        border: `1px solid ${colors.border}`,
        borderRadius: 1,
        boxShadow: 'none'
    }}>
        <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ 
                    backgroundColor: `${colors.primary}08`,
                    borderRadius: '8px',
                    p: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <Icon sx={{ fontSize: 20, color: colors.primary }} />
                </Box>
                <Box>
                    <Typography variant="body2" sx={{ 
                        color: colors.secondary,
                        fontWeight: 500
                    }}>
                        {title}
                    </Typography>
                    <Typography variant="h5" sx={{ 
                        fontWeight: 600, 
                        color: colors.primary,
                    }}>
                        {value}
                    </Typography>
                </Box>
            </Box>
        </CardContent>
    </Card>
);

// Empty State Component
const EmptyState = ({ title, subtitle, icon: Icon }) => (
    <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        py: 8,
        textAlign: 'center'
    }}>
        <Box sx={{
            backgroundColor: `${colors.accent}10`,
            borderRadius: '50%',
            p: 2,
            mb: 2
        }}>
            <Icon sx={{ fontSize: 36, color: colors.accent }} />
        </Box>
        <Typography variant="h6" sx={{ 
            color: colors.secondary,
            fontWeight: 600,
            mb: 1
        }}>
            {title}
        </Typography>
        <Typography variant="body2" sx={{ 
            color: colors.accent,
            maxWidth: 300
        }}>
            {subtitle}
        </Typography>
    </Box>
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
            
            // Header
            pdf.setFontSize(16);
            pdf.setTextColor(44, 62, 80);
            pdf.text('Booking Statistics Report', 20, 20);
            
            pdf.setFontSize(10);
            pdf.setTextColor(127, 140, 157);
            const dateRange = currentFilters ? 
                `${format(currentFilters.startDate, 'MMM dd, yyyy')} - ${format(currentFilters.endDate, 'MMM dd, yyyy')}` : 
                'Current Period';
            pdf.text(`Report Period: ${dateRange}`, 20, 28);
            
            // Statistics Summary
            pdf.setFontSize(12);
            pdf.setTextColor(44, 62, 80);
            pdf.text('Summary Statistics', 20, 40);
            
            pdf.setFontSize(10);
            pdf.setTextColor(52, 73, 94);
            const stats = [
                `Total Bookings: ${reportData.totalBookings || 0}`,
                `Completed Sessions: ${reportData.totalCompleted || 0}`,
                `Cancelled Sessions: ${reportData.totalCancelled || 0}`,
                `No-Show Rate: ${reportData.noShowRate !== undefined ? `${(reportData.noShowRate * 100).toFixed(1)}%` : 'N/A'}`
            ];
            
            stats.forEach((stat, index) => {
                pdf.text(stat, 25, 50 + (index * 7));
            });
            
            // Save the PDF
            const fileName = `booking-stats-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
            pdf.save(fileName);
            
        } catch (error) {
            console.error('Error generating PDF:', error);
        } finally {
            setIsExporting(false);
        }
    };

    // Prepare chart data
    const prepareChartData = (dataKey, labelField, dataField, chartLabel) => {
        const raw = reportData?.[dataKey] || [];
        const isEmpty = raw.length === 0;

        const labels = isEmpty ? ['No Data'] : raw.map(item => item[labelField]);
        const data = isEmpty ? [0] : raw.map(item => item[dataField]);
        const backgroundColors = data.map((_, index) => chartColors[index % chartColors.length]);

        return {
            labels,
            datasets: [
                {
                    label: chartLabel,
                    data,
                    backgroundColor: backgroundColors,
                    borderColor: colors.white,
                    borderWidth: 1,
                },
            ],
            isEmpty,
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

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: colors.primary,
                titleColor: 'white',
                bodyColor: 'white',
                borderWidth: 0,
                cornerRadius: 4,
                displayColors: false,
            },
        },
        scales: {
            x: {
                grid: {
                    display: false,
                },
                ticks: {
                    color: colors.accent,
                    font: {
                        size: 11,
                    },
                },
            },
            y: {
                grid: {
                    color: '#F5F5F5',
                    drawBorder: false,
                },
                ticks: {
                    color: colors.accent,
                    font: {
                        size: 11,
                    },
                },
                beginAtZero: true,
            },
        },
    };

    const pieChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    padding: 16,
                    usePointStyle: true,
                    pointStyle: 'circle',
                    color: colors.secondary,
                    font: {
                        size: 11,
                    },
                },
            },
            tooltip: {
                backgroundColor: colors.primary,
                titleColor: 'white',
                bodyColor: 'white',
                borderWidth: 0,
                cornerRadius: 4,
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
        <Box>
            {/* Header with Export Options */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">Booking Statistics</Typography>
                <Stack direction="row" spacing={1}>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Print />}
                        onClick={() => window.print()}
                        sx={{ 
                            borderColor: colors.primary,
                            color: colors.primary,
                        }}
                    >
                        Print
                    </Button>
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<GetApp />}
                        onClick={exportToPDF}
                        disabled={!reportData || isExporting}
                        sx={{ 
                            backgroundColor: colors.primary,
                            '&:hover': {
                                backgroundColor: colors.secondary,
                            }
                        }}
                    >
                        {isExporting ? 'Exporting...' : 'Export PDF'}
                    </Button>
                </Stack>
            </Box>

            <ReportFilters
                onApplyFilters={fetchBookingStats}
                availableTherapists={availableTherapists}
                availableServices={availableServices}
            />

            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
                    <CircularProgress />
                </Box>
            )}
            {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}

            {reportData && (
                <>
                    {/* Statistics Cards */}
                    <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatCard
                                title="Total Bookings"
                                value={reportData.totalBookings || 0}
                                icon={EventNote}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatCard
                                title="Completed"
                                value={reportData.totalCompleted || 0}
                                icon={CheckCircle}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatCard
                                title="Cancelled"
                                value={reportData.totalCancelled || 0}
                                icon={Cancel}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatCard
                                title="No-Show Rate"
                                value={reportData.noShowRate !== undefined ? `${(reportData.noShowRate * 100).toFixed(1)}%` : 'N/A'}
                                icon={PersonOff}
                            />
                        </Grid>
                    </Grid>

                    {/* Charts */}
                    <Paper sx={{ p: 3, mt: 3 }}>
                        {hasData ? (
                            <Grid container spacing={4}>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle1" align="center">Bookings by Service</Typography>
                                    <Box sx={{ height: 300 }}>
                                        <Pie options={pieChartOptions} data={bookingsByServiceChart} />
                                    </Box>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle1" align="center">Bookings by Therapist</Typography>
                                    <Box sx={{ height: 300 }}>
                                        <Bar options={chartOptions} data={bookingsByTherapistChart} />
                                    </Box>
                                </Grid>
                            </Grid>
                        ) : (
                            <EmptyState
                                title="No Data Available"
                                subtitle="No bookings found for the selected criteria. Please adjust your filters and try again."
                                icon={Assessment}
                            />
                        )}
                    </Paper>
                </>
            )}
        </Box>
    );
}