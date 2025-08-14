import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Paper, CircularProgress, Alert, IconButton, TextField,
    InputAdornment, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination,
    FormControl, InputLabel, Select, Stack, Grid, Tooltip, useMediaQuery, useTheme,
    Avatar, Badge, Divider, Collapse
} from '@mui/material';
import {
    Search, Add, Delete as DeleteIcon, Visibility, Clear, Edit as EditIcon,
    Cancel as CancelIcon, CheckCircle as CheckCircleIcon, Info as InfoIcon,
    AccessTime, CalendarToday, Person, Spa, AttachMoney, Receipt, Notes, Warning,
    ExpandMore, ExpandLess
} from "@mui/icons-material";
import { styled, alpha } from "@mui/material/styles";
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import apiClient from '../../../services/apiClient';
import useAuth from '../../../hooks/useAuth';
import BookingEditModal from './BookingEditPage';

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
    background: "#fff",
    overflowX: "auto",
  
    "& .MuiTableHead-root": { backgroundColor: alpha(theme.palette.primary.main, 0.03) },
    "& .MuiTableCell-head": {
        fontWeight: 500,
        fontSize: "0.8rem",
        color: theme.palette.text.primary,
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
        padding: "12px 16px",
    },
    "& .MuiTableCell-body": {
        fontSize: "0.75rem",
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.04)}`,
        padding: "10px 16px",
        color: theme.palette.text.secondary,
    },
    "& .MuiTableRow-root:hover": {
        backgroundColor: alpha(theme.palette.primary.main, 0.07),
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        transition: "background 0.2s, box-shadow 0.2s",
    },
    "& .MuiTableRow-root:nth-of-type(even)": {
        backgroundColor: alpha(theme.palette.primary.main, 0.015),
    },
}));

const StatusChip = styled(Chip)(({ theme, status }) => ({
    fontWeight: 300,
    fontSize: "0.60rem",
    height: 24,
    "& .MuiChip-label": { padding: "0 8px" },
}));

const getStatusChipColor = (status) => {
    switch (status) {
        case 'Confirmed':
        case 'Completed':
            return 'success';
        case 'Pending Confirmation':
        case 'Pending Payment':
            return 'warning';
        case 'Cancelled By Client':
        case 'Cancelled By Staff':
        case 'No Show':
            return 'error';
        default:
            return 'default';
    }
};

const getPaymentMethodIcon = (method) => {
    switch (method) {
        case 'Insurance':
            return <Receipt fontSize="small" />;
        case 'Credit Card':
            return <AttachMoney fontSize="small" />;
        case 'Cash':
            return <AttachMoney fontSize="small" />;
        default:
            return <AttachMoney fontSize="small" />;
    }
};

// Helper function to format booking data
const formatBookingData = (booking) => ({
    ...booking,
    // Client information
    clientName: booking.Client ? `${booking.Client.firstName || ''} ${booking.Client.lastName || ''}`.trim() : 'N/A',
    clientEmail: booking.Client?.email || 'N/A',
    clientId: booking.Client?.id || null,

    // Service information
    serviceName: booking.ServiceOption?.Service?.name || 'N/A',
    serviceId: booking.ServiceOption?.Service?.id || null,
    optionName: booking.ServiceOption?.optionName || 'Standard Session',
    duration: booking.ServiceOption?.duration || 0,
    originalPrice: booking.ServiceOption?.price || '0.00',

    // Therapist information
    therapistName: booking.Therapist ?
        `${booking.Therapist.User?.firstName || ''} ${booking.Therapist.User?.lastName || ''}`.trim() : 'Not Assigned',
    therapistId: booking.Therapist?.id || null,

    // Booking timing
    bookingDate: format(parseISO(booking.bookingStartTime), 'yyyy-MM-dd'),
    bookingTime: format(parseISO(booking.bookingStartTime), 'HH:mm'),
    endTime: format(parseISO(booking.bookingEndTime), 'HH:mm'),
    dateTime: parseISO(booking.bookingStartTime),

    // Pricing
    price: booking.priceAtBooking || booking.ServiceOption?.price || '0.00',

    // Payment and status
    paymentMethod: booking.paymentMethod || 'Not Specified',
    paymentStatus: booking.paymentStatus || 'Pending',

    // Notes
    clientNotes: booking.clientNotes || '',
    internalNotes: booking.internalNotes || '',

    // Additional metadata
    consentFormCompleted: !!booking.consentFormCompletedAt,
    reminderSent: booking.reminderSent || false,
    createdAt: booking.createdAt ? format(parseISO(booking.createdAt), 'yyyy-MM-dd HH:mm') : 'N/A',
    updatedAt: booking.updatedAt ? format(parseISO(booking.updatedAt), 'yyyy-MM-dd HH:mm') : 'N/A'
});

export default function BookingListPage() {
    const theme = useTheme();
    const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [expandedRows, setExpandedRows] = useState([]);
    const [therapists, setTherapists] = useState([]);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [currentBooking, setCurrentBooking] = useState(null);
    const navigate = useNavigate();
    const { user } = useAuth();

    const fetchBookings = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.get('/bookings');
            const bookingsArray = response.data?.bookings || response.data || [];

            const formattedBookings = bookingsArray.map(formatBookingData);
            setBookings(formattedBookings.sort((a, b) => b.dateTime - a.dateTime));
        } catch (err) {
            console.error("Error fetching bookings:", err);
            setError(err.response?.data?.message || "Failed to load bookings.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBookings();
    }, []);

    useEffect(() => {
        if (user?.role === 'admin' || user?.role === 'staff') {
            const fetchTherapists = async () => {
                try {
                    const response = await apiClient.get('/therapists');
                    setTherapists(response.data || []);
                } catch (err) {
                    console.error("Error fetching therapists:", err);
                }
            };
            fetchTherapists();
        }
    }, [user]);

    const handleEditBooking = (booking) => {
        setCurrentBooking(booking);
        setEditModalOpen(true);
    };

    const handleSaveBooking = async (updatedBookingData) => {
        try {
            // Fetch the updated booking from the server to ensure we have the latest data
            const response = await apiClient.get(`/bookings/${updatedBookingData.id || updatedBookingData.bookingId}`);
            const updatedBooking = formatBookingData(response.data);
            
            setBookings(prev =>
                prev.map(b => b.id === updatedBooking.id ? updatedBooking : b)
            );
            
            // If this booking is currently selected for viewing, update it too
            if (selectedBooking && selectedBooking.id === updatedBooking.id) {
                setSelectedBooking(updatedBooking);
            }
            
            setEditModalOpen(false);
            setCurrentBooking(null);
        } catch (err) {
            console.error("Error fetching updated booking:", err);
            // Fallback: refresh all bookings
            fetchBookings();
        }
    };

    const toggleRowExpand = (id) => {
        setExpandedRows(prev =>
            prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
        );
    };

    const handleViewDetails = (booking) => {
        setSelectedBooking(booking);
        setViewModalOpen(true);
    };

    const handleCancelBooking = (booking) => {
        setSelectedBooking(booking);
        setDeleteModalOpen(true);
    };

    const confirmCancelBooking = async () => {
        if (!selectedBooking) return;

        try {
            await apiClient.delete(`/bookings/${selectedBooking.id}`);
            fetchBookings(); // Refresh the entire list
            setDeleteModalOpen(false);
            setSelectedBooking(null);
        } catch (err) {
            console.error("Error cancelling booking:", err);
            setError(err.response?.data?.message || "Failed to cancel booking.");
        }
    };

    const filteredBookings = bookings.filter(booking => {
        const matchesSearch =
            booking.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            booking.clientEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
            booking.serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            booking.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            booking.optionName.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus =
            statusFilter === "all" ||
            booking.status.toLowerCase().includes(statusFilter.toLowerCase());

        return matchesSearch && matchesStatus;
    });

    const handleChangePage = (event, newPage) => setPage(newPage);
    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    // Columns to hide on small screens
    const hiddenColumns = isSmallScreen ? ['therapistName', 'paymentMethod', 'duration'] : [];

    return (
        <Box sx={{ width: '100%', overflow: 'hidden' }}>
            <Typography variant="h4" gutterBottom>
                {user?.role === 'therapist' ? 'My Bookings' : 'Booking Management'}
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center" mb={2} flexWrap="wrap">
                <TextField
                    size="small"
                    placeholder="Search bookings..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    InputProps={{
                        startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
                        endAdornment: searchTerm && (
                            <IconButton onClick={() => setSearchTerm("")} size="small"><Clear /></IconButton>
                        )
                    }}
                    sx={{ minWidth: 200, flexGrow: 1, maxWidth: 400 }}
                />
                <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Status</InputLabel>
                    <Select
                        value={statusFilter}
                        label="Status"
                        onChange={e => setStatusFilter(e.target.value)}
                    >
                        <MenuItem value="all">All</MenuItem>
                        <MenuItem value="confirmed">Confirmed</MenuItem>
                        <MenuItem value="pending">Pending</MenuItem>
                        <MenuItem value="cancelled">Cancelled</MenuItem>
                        <MenuItem value="completed">Completed</MenuItem>
                    </Select>
                </FormControl>
                {/* {user?.role !== 'therapist' && (
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => navigate('/admin/bookings/new')}
                    >
                        New Booking
                    </Button>
                )} */}
            </Stack>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Paper >
                <StyledTableContainer>
                    <Table stickyHeader aria-label="bookings table">
                        <TableHead>
                            <TableRow>
                                <TableCell width="20px"></TableCell>
                                <TableCell width="20px">Client</TableCell>
                                <TableCell >Service</TableCell>
                                {!hiddenColumns.includes('therapistName') && <TableCell >Therapist</TableCell>}
                                {!hiddenColumns.includes('duration') && <TableCell width="20px">Duration</TableCell>}
                                 <TableCell width="20px">Status</TableCell>
                                <TableCell >Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={10 - hiddenColumns.length} align="center">
                                        <CircularProgress size={32} />
                                    </TableCell>
                                </TableRow>
                            ) : filteredBookings.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={10 - hiddenColumns.length} align="center">
                                        No bookings found.
                                    </TableCell>
                                </TableRow>
                            ) : filteredBookings.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(booking => (
                                <React.Fragment key={booking.id}>
                                    <TableRow hover>
                                        <TableCell>
                                            <IconButton
                                                size="small"
                                                onClick={() => toggleRowExpand(booking.id)}
                                                aria-label="expand row"
                                            >
                                                {expandedRows.includes(booking.id) ? <ExpandLess /> : <ExpandMore />}
                                            </IconButton>
                                        </TableCell>
                                          <TableCell>
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <Person fontSize="small" color="action" />
                                                <Box>
                                                    <Typography variant="body2">{booking.clientName}</Typography>
                                                    {!isSmallScreen && (
                                                        <Typography variant="caption" color="text.secondary">{booking.clientEmail}</Typography>
                                                    )}
                                                </Box>
                                            </Stack>
                                        </TableCell>
                                         <TableCell>
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <Spa fontSize="small" color="action" />
                                                <Box>
                                                    <Typography variant="body2">{booking.serviceName}</Typography>
                                                    {!isSmallScreen && (
                                                        <Typography variant="caption" color="text.secondary">{booking.optionName}</Typography>
                                                    )}
                                                </Box>
                                            </Stack>
                                        </TableCell>
                                        {!hiddenColumns.includes('therapistName') && (
                                            <TableCell>
                                                <Badge
                                                    color={booking.therapistName === 'Not Assigned' ? 'error' : 'success'}
                                                    variant="dot"
                                                    sx={{ mr: 1 }}
                                                >
                                                    <Typography variant="body2">{booking.therapistName}</Typography>
                                                </Badge>
                                            </TableCell>
                                        )}
                                           {!hiddenColumns.includes('duration') && (
                                            <TableCell>{booking.duration} min</TableCell>
                                        )}
                                        <TableCell>
                                            <StatusChip
                                                label={booking.status}
                                                status={booking.status.toLowerCase().replace(/\s+/g, '-')}
                                                color={getStatusChipColor(booking.status)}
                                            />
                                        </TableCell>
                    
                                       
                                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                            <Tooltip title="View Details">
                                                <IconButton onClick={() => handleViewDetails(booking)} size="small">
                                                    <Visibility fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Edit">
                                                <IconButton onClick={() => handleEditBooking(booking)} size="small">
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            {!['Completed', 'Cancelled By Client', 'Cancelled By Staff', 'No Show'].includes(booking.status) && (
                                                <Tooltip title="Cancel Booking">
                                                    <IconButton
                                                        color="error"
                                                        onClick={() => handleCancelBooking(booking)}
                                                        size="small"
                                                    >
                                                        <CancelIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell style={{ padding: 0 }} colSpan={10 - hiddenColumns.length}>
                                            <Collapse in={expandedRows.includes(booking.id)} timeout="auto" unmountOnExit>
                                                <Box sx={{ p: 2, backgroundColor: alpha(theme.palette.primary.light, 0.05) }}>
                                                    <Grid container spacing={2}>
                                                        <Grid item xs={12} md={6}>
                                                            <Typography variant="subtitle2" gutterBottom>
                                                                <Notes fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
                                                                Client Notes
                                                            </Typography>
                                                            <Typography variant="body2" sx={{ pl: 3 }}>
                                                                {booking.clientNotes || 'No client notes provided'}
                                                            </Typography>
                                                        </Grid>
                                                        <Grid item xs={12} md={6}>
                                                            <Typography variant="subtitle2" gutterBottom>
                                                                <Warning fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
                                                                Internal Notes
                                                            </Typography>
                                                            <Typography variant="body2" sx={{ pl: 3 }}>
                                                                {booking.internalNotes || 'No internal notes'}
                                                            </Typography>
                                                        </Grid>
                                                        <Grid item xs={12}>
                                                            <Typography variant="caption" color="text.secondary">
                                                                Booking ID: {booking.id} | Created: {booking.createdAt} | Last Updated: {booking.updatedAt}
                                                            </Typography>
                                                        </Grid>
                                                    </Grid>
                                                </Box>
                                            </Collapse>
                                        </TableCell>
                                    </TableRow>
                                </React.Fragment>
                            ))}
                        </TableBody>
                    </Table>
                </StyledTableContainer>
                <TablePagination
                    component="div"
                    count={filteredBookings.length}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={[5, 10, 25]}
                />
            </Paper>

            {/* View Booking Modal */}
            <Dialog open={viewModalOpen} onClose={() => setViewModalOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <InfoIcon color="primary" />
                        <Typography variant="h6">Booking Details</Typography>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    {selectedBooking && (
                        <Box sx={{ mt: 2 }}>
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                                        <Person sx={{ verticalAlign: 'middle', mr: 1 }} />
                                        Client Information
                                    </Typography>
                                    <Box sx={{ pl: 3 }}>
                                        <Typography><strong>Booking ID:</strong> {selectedBooking.id}</Typography>
                                        <Typography><strong>Name:</strong> {selectedBooking.clientName}</Typography>
                                        <Typography><strong>Email:</strong> {selectedBooking.clientEmail}</Typography>
                                        <Typography><strong>Client ID:</strong> {selectedBooking.clientId}</Typography>
                                    </Box>

                                    <Typography variant="subtitle1" sx={{ mt: 3, fontWeight: 'bold' }} gutterBottom>
                                        <Spa sx={{ verticalAlign: 'middle', mr: 1 }} />
                                        Service Information
                                    </Typography>
                                    <Box sx={{ pl: 3 }}>
                                        <Typography><strong>Service:</strong> {selectedBooking.serviceName}</Typography>
                                        <Typography><strong>Service ID:</strong> {selectedBooking.serviceId}</Typography>
                                        <Typography><strong>Option:</strong> {selectedBooking.optionName}</Typography>
                                        <Typography><strong>Duration:</strong> {selectedBooking.duration} minutes</Typography>
                                        <Typography><strong>Original Price:</strong> ${parseFloat(selectedBooking.originalPrice).toFixed(2)}</Typography>
                                    </Box>
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                                        <CalendarToday sx={{ verticalAlign: 'middle', mr: 1 }} />
                                        Booking Schedule
                                    </Typography>
                                    <Box sx={{ pl: 3 }}>
                                        <Typography><strong>Date:</strong> {selectedBooking.bookingDate}</Typography>
                                        <Typography><strong>Time:</strong> {selectedBooking.bookingTime} - {selectedBooking.endTime}</Typography>
                                        <Typography><strong>Therapist:</strong>
                                            <Badge
                                                color={selectedBooking.therapistName === 'Not Assigned' ? 'error' : 'success'}
                                                variant="dot"
                                                sx={{ ml: 1 }}
                                            >
                                                {selectedBooking.therapistName}
                                            </Badge>
                                        </Typography>
                                        <Typography><strong>Therapist ID:</strong> {selectedBooking.therapistId || 'N/A'}</Typography>
                                    </Box>

                                    <Typography variant="subtitle1" sx={{ mt: 3, fontWeight: 'bold' }} gutterBottom>
                                        <Receipt sx={{ verticalAlign: 'middle', mr: 1 }} />
                                        Payment Details
                                    </Typography>
                                    <Box sx={{ pl: 3 }}>
                                        <Stack direction="row" alignItems="center" spacing={1}>
                                            <Typography><strong>Status:</strong></Typography>
                                            <StatusChip
                                                label={selectedBooking.status}
                                                status={selectedBooking.status.toLowerCase().replace(/\s+/g, '-')}
                                                color={getStatusChipColor(selectedBooking.status)}
                                            />
                                        </Stack>
                                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
                                            <Typography><strong>Payment:</strong></Typography>
                                            <StatusChip
                                                label={selectedBooking.paymentStatus}
                                                status={selectedBooking.paymentStatus.toLowerCase()}
                                                color={selectedBooking.paymentStatus === 'Paid' ? 'success' : 'warning'}
                                            />
                                        </Stack>
                                        <Typography><strong>Method:</strong> {selectedBooking.paymentMethod}</Typography>
                                        <Typography><strong>Charged Price:</strong> ${parseFloat(selectedBooking.price).toFixed(2)}</Typography>
                                    </Box>
                                </Grid>
                            </Grid>

                            <Divider sx={{ my: 3 }} />

                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                                        <Notes sx={{ verticalAlign: 'middle', mr: 1 }} />
                                        Client Notes
                                    </Typography>
                                    <Paper variant="outlined" sx={{ p: 2, backgroundColor: alpha(theme.palette.info.light, 0.1) }}>
                                        <Typography>
                                            {selectedBooking.clientNotes || 'No client notes provided'}
                                        </Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                                        <Warning sx={{ verticalAlign: 'middle', mr: 1 }} />
                                        Internal Notes
                                    </Typography>
                                    <Paper variant="outlined" sx={{ p: 2, backgroundColor: alpha(theme.palette.warning.light, 0.1) }}>
                                        <Typography>
                                            {selectedBooking.internalNotes || 'No internal notes'}
                                        </Typography>
                                    </Paper>
                                </Grid>
                            </Grid>

                            <Divider sx={{ my: 3 }} />

                            <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        <strong>Created:</strong> {selectedBooking.createdAt}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        <strong>Last Updated:</strong> {selectedBooking.updatedAt}
                                    </Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" color="text.secondary">
                                        <strong>Consent Form:</strong> {selectedBooking.consentFormCompleted ? 'Completed' : 'Not Completed'} |
                                        <strong> Reminder Sent:</strong> {selectedBooking.reminderSent ? 'Yes' : 'No'}
                                    </Typography>
                                </Grid>
                            </Grid>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setViewModalOpen(false)}>Close</Button>
                    <Button
                        variant="contained"
                        onClick={() => {
                            setViewModalOpen(false);
                            handleEditBooking(selectedBooking);
                        }}
                    >
                        Edit Booking
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Cancel Booking Modal */}
            <Dialog open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <CancelIcon color="error" />
                        <Typography variant="h6">Cancel Booking</Typography>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    {selectedBooking && (
                        <Box sx={{ mt: 2 }}>
                            <Typography>
                                Are you sure you want to cancel the booking for <b>{selectedBooking.clientName}</b>?
                            </Typography>
                            <Box sx={{ mt: 2, p: 2, backgroundColor: alpha(theme.palette.error.light, 0.1), borderRadius: 1 }}>
                                <Typography variant="body2">
                                    <strong>Service:</strong> {selectedBooking.serviceName} ({selectedBooking.optionName})
                                </Typography>
                                <Typography variant="body2">
                                    <strong>Date:</strong> {selectedBooking.bookingDate} at {selectedBooking.bookingTime}
                                </Typography>
                                <Typography variant="body2">
                                    <strong>Therapist:</strong> {selectedBooking.therapistName}
                                </Typography>
                                <Typography variant="body2">
                                    <strong>Price:</strong> ${parseFloat(selectedBooking.price).toFixed(2)}
                                </Typography>
                            </Box>
                            <Alert severity="error" sx={{ mt: 2 }}>
                                This action cannot be undone. The client will be notified of the cancellation.
                            </Alert>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteModalOpen(false)}>Keep Booking</Button>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={confirmCancelBooking}
                        startIcon={<CancelIcon />}
                    >
                        Confirm Cancellation
                    </Button>
                </DialogActions>
            </Dialog>
            
            <BookingEditModal
                open={editModalOpen}
                onClose={() => {
                    setEditModalOpen(false);
                    setCurrentBooking(null);
                }}
                booking={currentBooking}
                onSave={handleSaveBooking}
                therapists={therapists || []}
            />
        </Box>
    );
}