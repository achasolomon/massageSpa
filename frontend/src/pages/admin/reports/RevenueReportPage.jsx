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
    Chip,
    Tabs,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow
} from '@mui/material';
import { 
    Assessment,
    GetApp,
    Print,
    MonetizationOn,
    Receipt,
    TrendingUp,
    CheckCircle,
    Cancel,
    Autorenew,
    MoneyOff
} from '@mui/icons-material';
import { Line, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip as ChartTooltip,
    Legend,
} from 'chart.js';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import apiClient from '../../../services/apiClient';
import ReportFilters from '../../../components/admin/reports/ReportFilters';
import { format, parseISO, eachDayOfInterval } from 'date-fns';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    ChartTooltip,
    Legend
);

// Color scheme
const colors = {
    primary: '#2C3E50',
    secondary: '#34495E',
    accent: '#7F8C8D',
    background: '#F8F9FA',
    white: '#FFFFFF',
    border: '#E0E0E0',
    revenue: '#00796B',
    status: {
        succeeded: '#4CAF50',
        failed: '#F44336',
        refunded: '#9E9E9E',
        pending: '#FFC107',
        cancelled: '#607D8B'
    }
};

// StatusChip component
const StatusChip = ({ status }) => {
    const statusConfig = {
        Succeeded: {
            icon: <CheckCircle fontSize="small" />,
            color: colors.status.succeeded,
            label: 'Succeeded'
        },
        Failed: {
            icon: <Cancel fontSize="small" />,
            color: colors.status.failed,
            label: 'Failed'
        },
        Refunded: {
            icon: <MoneyOff fontSize="small" />,
            color: colors.status.refunded,
            label: 'Refunded'
        },
        Pending: {
            icon: <Autorenew fontSize="small" />,
            color: colors.status.pending,
            label: 'Pending'
        }
    };

    const config = statusConfig[status] || {
        icon: null,
        color: colors.accent,
        label: status
    };

    return (
        <Chip
            icon={config.icon}
            label={config.label}
            size="small"
            sx={{
                backgroundColor: `${config.color}20`,
                color: config.color,
                border: `1px solid ${config.color}`,
                fontWeight: 300
            }}
        />
    );
};

// StatCard component with optional color prop
const StatCard = ({ title, value, icon: Icon, color }) => (
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
                    backgroundColor: color ? `${color}08` : `${colors.primary}08`,
                    borderRadius: '8px',
                    p: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <Icon sx={{ fontSize: 18, color: color || colors.primary }} />
                </Box>
                <Box>
                    <Typography variant="body2" sx={{ 
                        color: colors.secondary,
                        fontWeight: 400
                    }}>
                        {title}
                    </Typography>
                    <Typography variant="h5" sx={{ 
                        fontWeight: 400, 
                        color: colors.primary,
                    }}>
                        {value}
                    </Typography>
                </Box>
            </Box>
        </CardContent>
    </Card>
);

// StatusSummary component
const StatusSummary = ({ byStatus }) => {
    if (!byStatus) return null;

    return (
        <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="subtitle1" sx={{ 
                color: colors.primary,
                fontWeight: 400,
                mb: 2
            }}>
                Payment Status Breakdown
            </Typography>
            <Grid container spacing={2}>
                {Object.entries(byStatus).map(([status, data]) => (
                    <Grid item xs={12} sm={6} md={3} key={status}>
                        <Card sx={{ 
                            height: '100%',
                            backgroundColor: colors.white,
                            border: `1px solid ${colors.border}`,
                            borderRadius: 1,
                            boxShadow: 'none'
                        }}>
                            <CardContent sx={{ p: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <StatusChip status={status} />
                                    <Box>
                                        <Typography variant="body2" sx={{ 
                                            color: colors.secondary,
                                            fontWeight: 300
                                        }}>
                                            {status} Payments
                                        </Typography>
                                        <Typography variant="h6" sx={{ 
                                            fontWeight: 400, 
                                            color: colors.primary,
                                        }}>
                                            ${parseFloat(data.totalRevenue || 0).toFixed(2)}
                                        </Typography>
                                        <Typography variant="caption" sx={{ 
                                            color: colors.accent,
                                        }}>
                                            {data.paymentCount} payments
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Paper>
    );
};

// Prepare chart data function
const prepareChartData = (dailyRevenue, currentFilters) => {
    if (!dailyRevenue || !currentFilters) {
        return { lineData: null, barData: null };
    }

    const { startDate, endDate } = currentFilters;
    const interval = { start: parseISO(format(startDate, 'yyyy-MM-dd')), end: parseISO(format(endDate, 'yyyy-MM-dd')) };
    
    const allDays = eachDayOfInterval(interval);
    const labels = allDays.map(day => format(day, 'MMM dd'));

    const statuses = ['Succeeded', 'Failed', 'Refunded', 'Pending'];
    const datasets = statuses.map(status => {
        const statusData = dailyRevenue.filter(item => item.status === status);
        const statusMap = new Map(statusData.map(item => [
            format(parseISO(item.date), 'MMM dd'), 
            item.totalRevenue
        ]));
        const dataPoints = labels.map(label => statusMap.get(label) || 0);
        
        return {
            label: status,
            data: dataPoints,
            backgroundColor: colors.status[status.toLowerCase()],
            borderColor: colors.status[status.toLowerCase()],
            tension: 0.1,
        };
    });

    const lineData = {
        labels,
        datasets: [{
            label: 'Total Revenue',
            data: labels.map(label => {
                return dailyRevenue
                    .filter(item => format(parseISO(item.date), 'MMM dd') === label)
                    .reduce((sum, item) => sum + (item.totalRevenue || 0), 0);
            }),
            borderColor: colors.revenue,
            backgroundColor: `${colors.revenue}20`,
            tension: 0.1,
            fill: true,
        }],
    };

    const barData = {
        labels,
        datasets: datasets.filter(dataset => 
            dataset.data.some(value => value > 0)
        ),
    };

    return { lineData, barData };
};

// Chart options
const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'top',
            labels: {
                usePointStyle: true,
                padding: 20,
            }
        },
        tooltip: {
            backgroundColor: colors.primary,
            titleColor: 'white',
            bodyColor: 'white',
            borderWidth: 0,
            cornerRadius: 4,
            callbacks: {
                label: function(context) {
                    let label = context.dataset.label || '';
                    if (label) {
                        label += ': ';
                    }
                    if (context.parsed.y !== null) {
                        label += new Intl.NumberFormat('en-US', { 
                            style: 'currency', 
                            currency: 'USD' 
                        }).format(context.parsed.y);
                    }
                    return label;
                }
            }
        }
    },
    scales: {
        x: {
            grid: {
                display: false,
            },
            ticks: {
                color: colors.accent,
                font: {
                    size: 8,
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
                    size: 8,
                },
                callback: function(value) {
                    return '$' + value;
                }
            },
            beginAtZero: true,
        },
    },
};

export default function RevenueReportPage() {
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [availableTherapists, setAvailableTherapists] = useState([]);
    const [availableServices, setAvailableServices] = useState([]);
    const [currentFilters, setCurrentFilters] = useState(null);
    const [isExporting, setIsExporting] = useState(false);
    const [activeTab, setActiveTab] = useState(0);

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

    const fetchRevenueReport = async (filters) => {
        setLoading(true);
        setError(null);
        setReportData(null);
        setCurrentFilters(filters);
        
        try {
            const queryParams = {
                startDate: format(filters.startDate, 'yyyy-MM-dd'),
                endDate: format(filters.endDate, 'yyyy-MM-dd'),
                includeStatuses: filters.includeStatuses?.join(',') || 'Succeeded,Failed,Refunded,Pending',
                ...(filters.therapistId && { therapistId: filters.therapistId }),
                ...(filters.serviceId && { serviceId: filters.serviceId }),
            };
            const response = await apiClient.get('/reports/revenue', { params: queryParams });
            setReportData(response.data);
        } catch (err) {
            console.error("Error fetching revenue report:", err);
            setError(err.response?.data?.message || "Failed to load revenue report.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const defaultStart = new Date();
        defaultStart.setDate(1);
        const defaultEnd = new Date();

        fetchRevenueReport({ 
            startDate: defaultStart, 
            endDate: defaultEnd,
            includeStatuses: ['Succeeded', 'Failed', 'Refunded', 'Pending']
        });
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
            pdf.text('Revenue Report', 20, 20);
            
            pdf.setFontSize(10);
            pdf.setTextColor(127, 140, 157);
            const dateRange = currentFilters ? 
                `${format(currentFilters.startDate, 'MMM dd, yyyy')} - ${format(currentFilters.endDate, 'MMM dd, yyyy')}` : 
                'Current Period';
            pdf.text(`Report Period: ${dateRange}`, 20, 28);
            
            // Summary Statistics
            pdf.setFontSize(12);
            pdf.setTextColor(44, 62, 80);
            pdf.text('Summary Statistics', 20, 40);
            
            pdf.setFontSize(10);
            pdf.setTextColor(52, 73, 94);
            const stats = [
                `Total Revenue: $${parseFloat(reportData.totalRevenue || 0).toFixed(2)}`,
                `Total Bookings: ${reportData.totalBookings || 0}`,
                `Average Booking Value: $${parseFloat(reportData.averageBookingValue || 0).toFixed(2)}`
            ];
            
            stats.forEach((stat, index) => {
                pdf.text(stat, 25, 50 + (index * 7));
            });

            // Status Breakdown
            pdf.setFontSize(12);
            pdf.setTextColor(44, 62, 80);
            pdf.text('Payment Status Breakdown', 20, 80);

            if (reportData.byStatus) {
                const statusData = Object.entries(reportData.byStatus).map(([status, data]) => [
                    status,
                    `$${parseFloat(data.totalRevenue || 0).toFixed(2)}`,
                    data.paymentCount
                ]);

                pdf.autoTable({
                    startY: 85,
                    head: [['Status', 'Amount', 'Count']],
                    body: statusData,
                    theme: 'grid',
                    headStyles: {
                        fillColor: [44, 62, 80],
                        textColor: 255
                    },
                    alternateRowStyles: {
                        fillColor: [248, 249, 250]
                    },
                    margin: { top: 85 }
                });
            }

            // Daily Revenue Table
            if (reportData.dailyRevenue?.length > 0) {
                pdf.addPage();
                pdf.setFontSize(12);
                pdf.setTextColor(44, 62, 80);
                pdf.text('Daily Revenue Breakdown', 20, 20);

                const dailyData = reportData.dailyRevenue.map(item => [
                    format(parseISO(item.date), 'MMM dd, yyyy'),
                    item.status,
                    `$${parseFloat(item.totalRevenue || 0).toFixed(2)}`,
                    item.paymentCount
                ]);

                pdf.autoTable({
                    startY: 25,
                    head: [['Date', 'Status', 'Amount', 'Count']],
                    body: dailyData,
                    theme: 'grid',
                    headStyles: {
                        fillColor: [44, 62, 80],
                        textColor: 255
                    },
                    alternateRowStyles: {
                        fillColor: [248, 249, 250]
                    },
                    margin: { top: 25 }
                });
            }

            // Save the PDF
            const fileName = `revenue-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
            pdf.save(fileName);
            
        } catch (error) {
            console.error('Error generating PDF:', error);
        } finally {
            setIsExporting(false);
        }
    };

    const hasData = reportData && (
        (reportData.dailyRevenue && reportData.dailyRevenue.length > 0) ||
        reportData.totalRevenue
    );

    const { lineData, barData } = prepareChartData(reportData?.dailyRevenue, currentFilters);

    return (
        <Box>
            {/* Header with Export Options */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">Revenue Report</Typography>
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
                onApplyFilters={fetchRevenueReport}
                availableTherapists={availableTherapists}
                availableServices={availableServices}
                initialStatuses={['Succeeded', 'Failed', 'Refunded', 'Pending']}
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
                                title="Total Revenue"
                                value={`$${parseFloat(reportData.totalRevenue || 0).toFixed(2)}`}
                                icon={MonetizationOn}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatCard
                                title="Successful Revenue"
                                value={`$${parseFloat(reportData.byStatus?.Succeeded?.totalRevenue || 0).toFixed(2)}`}
                                icon={CheckCircle}
                                color={colors.status.succeeded}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatCard
                                title="Pending Payments"
                                value={`$${parseFloat(reportData.byStatus?.Pending?.totalRevenue || 0).toFixed(2)}`}
                                icon={Autorenew}
                                color={colors.status.pending}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatCard
                                title="Total Bookings"
                                value={reportData.totalBookings || 0}
                                icon={Receipt}
                            />
                        </Grid>
                    </Grid>

                    {/* Status Summary */}
                    <StatusSummary byStatus={reportData.byStatus} />

                    {/* Tabs for different views */}
                    <Paper sx={{ p: 2, mt: 3 }}>
                        <Tabs 
                            value={activeTab} 
                            onChange={(e, newValue) => setActiveTab(newValue)}
                            indicatorColor="primary"
                            textColor="primary"
                        >
                            <Tab label="Revenue Trend" />
                            <Tab label="Status Breakdown" />
                            <Tab label="Detailed Data" />
                        </Tabs>
                    </Paper>

                    {/* Tab Content */}
                    <Box sx={{ mt: 2 }}>
                        {activeTab === 0 && (
                            <Paper sx={{ p: 3 }}>
                                {lineData ? (
                                    <Box sx={{ height: 400 }}>
                                        <Typography variant="subtitle1" sx={{ 
                                            color: colors.primary,
                                            fontWeight: 400,
                                             fontSize: '0.60rem',
                                            mb: 2
                                        }}>
                                            Revenue Trend
                                        </Typography>
                                        <Line options={chartOptions} data={lineData} />
                                    </Box>
                                ) : (
                                    <Typography>No revenue data available for the selected period</Typography>
                                )}
                            </Paper>
                        )}

                        {activeTab === 1 && (
                            <Paper sx={{ p: 3 }}>
                                {barData ? (
                                    <Box sx={{ height: 400 }}>
                                        <Typography variant="subtitle1" sx={{ 
                                            color: colors.primary,
                                            fontWeight: 600,
                                            mb: 2
                                        }}>
                                            Payment Status Breakdown
                                        </Typography>
                                        <Bar 
                                            options={{
                                                ...chartOptions,
                                                scales: {
                                                    ...chartOptions.scales,
                                                    x: {
                                                        stacked: true,
                                                        ...chartOptions.scales.x
                                                    },
                                                    y: {
                                                        stacked: false,
                                                        ...chartOptions.scales.y
                                                    }
                                                }
                                            }} 
                                            data={barData} 
                                        />
                                    </Box>
                                ) : (
                                    <Typography>No status data available for the selected period</Typography>
                                )}
                            </Paper>
                        )}

                        {activeTab === 2 && (
                            <Paper sx={{ p: 3 }}>
                                <Typography variant="subtitle1" sx={{ 
                                    color: colors.primary,
                                    fontWeight: 400,
                                     fontSize: '0.60rem',
                                    mb: 2
                                }}>
                                    Detailed Payment Data
                                </Typography>
                                {reportData.dailyRevenue?.length > 0 ? (
                                    <TableContainer>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Date</TableCell>
                                                    <TableCell>Status</TableCell>
                                                    <TableCell align="right">Amount</TableCell>
                                                    <TableCell align="right">Count</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {reportData.dailyRevenue.map((row, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell>{format(parseISO(row.date), 'MMM dd, yyyy')}</TableCell>
                                                        <TableCell>
                                                            <StatusChip status={row.status} />
                                                        </TableCell>
                                                        <TableCell align="right">${parseFloat(row.totalRevenue || 0).toFixed(2)}</TableCell>
                                                        <TableCell align="right">{row.paymentCount}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                ) : (
                                    <Typography>No detailed data available for the selected period</Typography>
                                )}
                            </Paper>
                        )}
                    </Box>
                </>
            )}
        </Box>
    );
}