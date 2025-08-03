import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Paper, CircularProgress, Alert, IconButton, TextField, InputAdornment,
    Avatar, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, TablePagination, Checkbox, FormControl,
    InputLabel, Select, Stack, Card, CardContent, Grid, Switch, FormControlLabel, Tooltip, Backdrop, Divider, Autocomplete
} from '@mui/material';
import {
    Search, FileDownload, Add, Edit, Delete, Visibility, Person, AdminPanelSettings, Group, Clear
} from '@mui/icons-material';
import { styled, alpha } from '@mui/material/styles';
import apiClient from '../../../services/apiClient';

// Styled components (same as UserListPage for consistent design)
const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
    background: '#fff',
    overflow: 'hidden',
    '& .MuiTable-root': { minWidth: 650 },
    '& .MuiTableHead-root': { backgroundColor: alpha(theme.palette.primary.main, 0.03) },
    '& .MuiTableCell-head': {
        fontWeight: 500, fontSize: '0.8rem', color: theme.palette.text.primary,
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`, padding: '18px 24px',
    },
    '& .MuiTableCell-body': {
        fontSize: '0.7rem', borderBottom: `1px solid ${alpha(theme.palette.divider, 0.04)}`,
        padding: '16px 24px', color: theme.palette.text.secondary,
    },
    '& .MuiTableRow-root:hover': {
        backgroundColor: alpha(theme.palette.primary.main, 0.07),
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)', transition: 'background 0.2s, box-shadow 0.2s',
    },
    '& .MuiTableRow-root:nth-of-type(even)': {
        backgroundColor: alpha(theme.palette.primary.main, 0.015),
    },
}));

const StatusChip = styled(Chip)(({ theme, status }) => ({
    fontWeight: 300, fontSize: '0.60rem', height: 24,
    backgroundColor: status === 'active'
        ? alpha(theme.palette.success.main, 0.1)
        : alpha(theme.palette.error.main, 0.1),
    color: status === 'active'
        ? theme.palette.success.main
        : theme.palette.error.main,
    border: `1px solid ${status === 'active'
        ? alpha(theme.palette.success.main, 0.2)
        : alpha(theme.palette.error.main, 0.2)}`,
    '& .MuiChip-label': { padding: '0 8px' },
}));

export default function TherapistListPage() {
    // State
    const [therapists, setTherapists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [serviceFilter, setServiceFilter] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalTherapists, setTotalTherapists] = useState(0);
    const [selected, setSelected] = useState([]);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [selectedTherapist, setSelectedTherapist] = useState(null);
    const [specializationInput, setSpecializationInput] = useState('');

    // Additional state for users and services
    const [users, setUsers] = useState([]);
    const [services, setServices] = useState([]);
    const [availableUsers, setAvailableUsers] = useState([]);

    const [formData, setFormData] = useState({
        userId: '',
        selectedUser: null,
        bio: '',
        specialties: [],
        yearsOfExperience: '',
        profilePictureUrl: '',
        isActive: true,
        serviceIds: []
    });
    const [formError, setFormError] = useState(null);
    const [backdrop, setBackdrop] = useState(false);

    // Fetch users for the dropdown (only therapist role users)
    const fetchUsers = async () => {
        try {
            const response = await apiClient.get('/users', {
                params: { role: 'therapist', isActive: true }
            });
            if (response.status === 200) {
                // Filter users who don't already have therapist profiles
                const existingTherapistUserIds = therapists.map(t => t.userId);
                const availableUsersList = response.data.users?.filter(user =>
                    !existingTherapistUserIds.includes(user.id)
                ) || [];
                setUsers(response.data.users || []);
                setAvailableUsers(availableUsersList);
            }
        } catch (err) {
            console.error("Error fetching users:", err);
        }
    };

    // Fetch services for the dropdown
    const fetchServices = async () => {
        try {
            const response = await apiClient.get('/services', {
                params: { isActive: true }
            });
            // console.log("All Services", response.data);
            if (response.status === 200) {
                // Handle both response.data.services and response.data directly
                const servicesData = response.data.services || response.data || [];
                setServices(Array.isArray(servicesData) ? servicesData : []);
            }
        } catch (err) {
            console.error("Error fetching services:", err);
            setServices([]); // Set empty array on error
        }
    };

    // Fetch therapists with backend pagination/filtering
    const fetchTherapists = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                page: page + 1,
                limit: rowsPerPage
            };
            if (statusFilter !== 'all') params.isActive = statusFilter === 'active';
            if (serviceFilter) params.serviceId = serviceFilter;

            const response = await apiClient.get('/therapists', { params });
            // console.log("Therapist response:", response.data);

            if (response.status === 200) {
                const { totalTherapists, totalPages, currentPage, therapists } = response.data;
                setTotalTherapists(totalTherapists);
                setTherapists(therapists.map(therapist => ({
                    ...therapist,
                    fullName: `${therapist.User?.firstName || ''} ${therapist.User?.lastName || ''}`.trim(),
                    email: therapist.User?.email || 'N/A',
                    // Handle specialties array properly
                    specialtiesDisplay: (() => {
                        try {
                            const parsed = JSON.parse(therapist.specialties);
                            return Array.isArray(parsed) ? parsed.join(', ') : 'No specialties listed';
                        } catch {
                            return 'No specialties listed';
                        }
                    })(),
                    // Handle services array
                    servicesDisplay: therapist.Services?.map(s => s.name).join(', ') || 'No services assigned'
                })));
            } else {
                throw new Error("Failed to fetch therapists");
            }
        } catch (err) {
            console.error("Error fetching therapists:", err);
            setError(err.response?.data?.message || "Failed to load therapists. You may not have permission.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTherapists();
    }, [page, rowsPerPage, statusFilter, serviceFilter]);

    useEffect(() => {
        fetchUsers();
        fetchServices();
    }, []);

    // Update available users when therapists change
    useEffect(() => {
        if (users.length > 0 && therapists.length > 0) {
            const existingTherapistUserIds = therapists.map(t => t.userId);
            const availableUsersList = users.filter(user =>
                !existingTherapistUserIds.includes(user.id)
            );
            setAvailableUsers(availableUsersList);
        }
    }, [users, therapists]);

    // Filter therapists for search (client-side)
    const filteredTherapists = therapists.filter(therapist =>
        therapist.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        therapist.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        therapist.specialtiesDisplay.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Modal handlers
    const handleViewTherapist = (therapist) => {
        setSelectedTherapist(therapist);
        setViewModalOpen(true);
    };

    const handleEditTherapist = (therapist) => {
        setSelectedTherapist(therapist);
        setFormData({
            userId: therapist.userId,
            selectedUser: users.find(u => u.id === therapist.userId) || null,
            bio: therapist.bio || '',
            specialties: (() => {
                try {
                    const parsed = JSON.parse(therapist.specialties);
                    return Array.isArray(parsed) ? parsed : [];
                } catch {
                    return [];
                }
            })(), yearsOfExperience: therapist.yearsOfExperience || '',
            profilePictureUrl: therapist.profilePictureUrl || '',
            isActive: therapist.isActive,
            serviceIds: therapist.Services?.map(s => s.id) || []
        });
        setSpecializationInput('');
        setEditModalOpen(true);
        setFormError(null);
    };

    const handleAddTherapist = () => {
        setFormData({
            userId: '',
            selectedUser: null,
            bio: '',
            specialties: [],
            yearsOfExperience: '',
            profilePictureUrl: '',
            isActive: true,
            serviceIds: []
        });
        setSpecializationInput('');
        setAddModalOpen(true);
        setFormError(null);
    };

    const handleDeleteTherapist = (therapist) => {
        setSelectedTherapist(therapist);
        setDeleteModalOpen(true);
    };

    // Handle specialties input change
    const handleSpecialtiesChange = (e) => {
        const value = e.target.value;
        const specialtiesArray = value.split(',').map(s => s.trim()).filter(s => s !== '');
        setFormData({ ...formData, specialties: specialtiesArray });
    };

    // Handle user selection
    const handleUserChange = (event, value) => {
        setFormData({
            ...formData,
            selectedUser: value,
            userId: value ? value.id : ''
        });
    };

    // Save therapist (create or edit)
    const handleSaveTherapist = async (isEdit = false) => {
        setFormError(null);
        setBackdrop(true);

        // Validation
        if (!formData.userId) {
            setFormError("Please select a user");
            setBackdrop(false);
            return;
        }

        try {
            const payload = {
                userId: formData.userId,
                bio: formData.bio,
                specialties: formData.specialties,
                yearsOfExperience: parseInt(formData.yearsOfExperience) || 0,
                profilePictureUrl: formData.profilePictureUrl,
                isActive: formData.isActive,
                serviceIds: formData.serviceIds
            };

            if (isEdit) {
                await apiClient.put(`/therapists/${selectedTherapist.id}`, payload);
            } else {
                await apiClient.post('/therapists', payload);
            }

            fetchTherapists();
            fetchUsers(); // Refresh available users
            setAddModalOpen(false);
            setEditModalOpen(false);
            setSpecializationInput('');
        } catch (err) {
            console.error("Error saving therapist:", err);
            setFormError(err.response?.data?.message || "Failed to save therapist.");
        }
        setBackdrop(false);
    };

    // Delete therapist
    const handleConfirmDelete = async () => {
        setBackdrop(true);
        try {
            await apiClient.delete(`/therapists/${selectedTherapist.id}`);
            fetchTherapists();
            fetchUsers(); // Refresh available users
            setDeleteModalOpen(false);
        } catch (err) {
            console.error("Error deleting therapist:", err);
            setError(err.response?.data?.message || "Failed to delete therapist.");
        }
        setBackdrop(false);
    };

    // Export to CSV
    const exportToCSV = () => {
        if (!filteredTherapists.length) return;
        const csvData = filteredTherapists.map(therapist => ({
            Name: therapist.fullName,
            Email: therapist.email,
            Specialties: therapist.specialtiesDisplay,
            Services: therapist.servicesDisplay,
            'Years of Experience': therapist.yearsOfExperience || 0,
            Status: therapist.isActive ? 'Active' : 'Inactive',
            'Created At': new Date(therapist.createdAt).toLocaleDateString()
        }));
        const csv = [
            Object.keys(csvData[0]).join(','),
            ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
        ].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'therapists.csv'; a.click();
        window.URL.revokeObjectURL(url);
    };

    // Pagination
    const handleChangePage = (event, newPage) => setPage(newPage);
    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    // Toggle all select handlers
    const handleSelectAllClick = (event) => {
        setSelected(event.target.checked ? filteredTherapists.map(u => u.id) : []);
    };

    // Individual select handlers
    const handleSelectClick = (event, id) => {
        setSelected(selected.includes(id) ? selected.filter(i => i !== id) : [...selected, id]);
    };

    // Analytics
    const totalActive = therapists.filter(u => u.isActive).length;

    // Get service name by ID for filter display
    const getServiceNameById = (serviceId) => {
        const service = services.find(s => s.id === serviceId);
        return service ? service.name : 'Unknown Service';
    };

    return (
        <Box sx={{ p: 3, bgcolor: '#fafafa', minHeight: '100vh' }}>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a1a', mb: 1 }}>
                    Therapist Management
                </Typography>
                <Typography variant="body1" sx={{ color: '#6b7280' }}>
                    Manage therapist profiles and their status.
                </Typography>
            </Box>

            {/* Analytics Cards */}
            <Grid container spacing={3} sx={{ mb: 4, justifyContent: 'space-between' }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ borderRadius: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
                                    <Group />
                                </Avatar>
                                <Box>
                                    <Typography variant="h5" sx={{ fontWeight: 700 }}>{totalTherapists}</Typography>
                                    <Typography variant="body2" color="text.secondary">Total Therapists</Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ borderRadius: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Avatar sx={{ bgcolor: 'success.main', width: 48, height: 48 }}>
                                    <Person />
                                </Avatar>
                                <Box>
                                    <Typography variant="h5" sx={{ fontWeight: 700 }}>{totalActive}</Typography>
                                    <Typography variant="body2" color="text.secondary">Active Therapists</Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ borderRadius: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Avatar sx={{ bgcolor: 'info.main', width: 48, height: 48 }}>
                                    <AdminPanelSettings />
                                </Avatar>
                                <Box>
                                    <Typography variant="h5" sx={{ fontWeight: 700 }}>{services.length}</Typography>
                                    <Typography variant="body2" color="text.secondary">Available Services</Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Search and Filter Bar */}
            <Box sx={{
                mb: 3,
                bgcolor: 'white',
                p: 3,
                borderRadius: 2,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                width: '100%'
            }}>
                <Grid container spacing={2} alignItems="flex-end">
                    {/* Search Field */}
                    <Grid item xs={12} md={4} lg={4}>
                        <TextField
                            fullWidth
                            variant="outlined"
                            size="small"
                            placeholder="Search therapists..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search size={20} />
                                    </InputAdornment>
                                ),
                                endAdornment: searchTerm && (
                                    <InputAdornment position="end">
                                        <IconButton size="small" onClick={() => setSearchTerm('')}>
                                            <Clear size={16} />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '8px',
                                }
                            }}
                        />
                    </Grid>

                    {/* Status Filter */}
                    <Grid item xs={6} md={3} lg={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel shrink>Status</InputLabel>
                            <Select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                                sx={{
                                    '& .MuiSelect-select': {
                                        display: 'flex',
                                        alignItems: 'center',
                                        minHeight: 'auto',
                                        paddingTop: '12px',
                                        paddingBottom: '12px',
                                    }
                                }}
                            >
                                <MenuItem value="all">All</MenuItem>
                                <MenuItem value="active">Active</MenuItem>
                                <MenuItem value="inactive">Inactive</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    {/* Service Filter */}
                    <Grid item xs={6} md={3} lg={3}>
                        <FormControl fullWidth size="small">
                            <InputLabel shrink>Service</InputLabel>
                            <Select
                                value={serviceFilter}
                                onChange={e => setServiceFilter(e.target.value)}
                                sx={{
                                    '& .MuiSelect-select': {
                                        display: 'flex',
                                        alignItems: 'center',
                                        minHeight: 'auto',
                                        paddingTop: '12px',
                                        paddingBottom: '12px',
                                    }
                                }}
                            >
                                <MenuItem value="">All Services</MenuItem>
                                {services.map(service => (
                                    <MenuItem
                                        key={service.id}
                                        value={service.id}
                                        sx={{
                                            whiteSpace: 'normal',
                                            wordBreak: 'break-word'
                                        }}
                                    >
                                        {service.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    {/* Action Buttons */}
                    <Grid item xs={12} md={2} lg={3} sx={{
                        textAlign: { xs: 'left', md: 'right' },
                        alignSelf: 'center'
                    }}>
                        <Button
                            variant="outlined"
                            startIcon={<FileDownload />}
                            onClick={exportToCSV}
                            sx={{
                                whiteSpace: 'nowrap',
                                width: { xs: '100%', md: 'auto' }
                            }}
                        >
                            Export CSV
                        </Button>
                    </Grid>
                </Grid>

                {/* Active Filters Display */}
                {(statusFilter !== 'all' || serviceFilter) && (
                    <Box sx={{
                        mt: 2,
                        display: 'flex',
                        gap: 1,
                        flexWrap: 'wrap',
                        alignItems: 'center'
                    }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            Active filters:
                        </Typography>
                        {statusFilter !== 'all' && (
                            <Chip
                                label={`Status: ${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}`}
                                size="small"
                                onDelete={() => setStatusFilter('all')}
                                color="primary"
                                variant="outlined"
                                sx={{ ml: 1 }}
                            />
                        )}
                        {serviceFilter && (
                            <Chip
                                label={`Service: ${getServiceNameById(serviceFilter)}`}
                                size="small"
                                onDelete={() => setServiceFilter('')}
                                color="primary"
                                variant="outlined"
                                sx={{ ml: 1 }}
                            />
                        )}
                    </Box>
                )}
            </Box>

            {/* Table */}
            <StyledTableContainer>
                {loading ? (
                    <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
                ) : error ? (
                    <Alert severity="error">{error}</Alert>
                ) : (
                    <>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            color="primary"
                                            indeterminate={selected.length > 0 && selected.length < filteredTherapists.length}
                                            checked={filteredTherapists.length > 0 && selected.length === filteredTherapists.length}
                                            onChange={handleSelectAllClick}
                                        />
                                    </TableCell>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Specialties</TableCell>
                                    <TableCell>Services</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>                                {filteredTherapists.map(therapist => (
                                <TableRow key={therapist.id} hover selected={selected.includes(therapist.id)}>
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            color="primary"
                                            checked={selected.includes(therapist.id)}
                                            onChange={e => handleSelectClick(e, therapist.id)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Stack direction="row" alignItems="center" spacing={1}>
                                            {therapist.profilePictureUrl && (
                                                <Avatar
                                                    src={therapist.profilePictureUrl}
                                                    sx={{ width: 32, height: 32 }}
                                                />
                                            )}
                                            <Typography>{therapist.fullName}</Typography>
                                        </Stack>
                                    </TableCell>
                                    <TableCell>
                                        {(() => {
                                            let specialties = [];
                                            try {
                                                const parsed = JSON.parse(therapist.specialties);
                                                specialties = Array.isArray(parsed) ? parsed : [];
                                            } catch {
                                                specialties = [];
                                            }

                                            return specialties.length > 0 ? (
                                                <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                                    {specialties.slice(0, 2).map((specialty, index) => (
                                                        <Chip
                                                            key={index}
                                                            label={specialty}
                                                            size="small"
                                                            sx={{ mb: 0.5, fontSize: '0.60rem' }}
                                                        />
                                                    ))}
                                                    {specialties.length > 2 && (
                                                        <Chip
                                                            label={`+${specialties.length - 2}`}
                                                            size="small"
                                                            variant="outlined"
                                                            sx={{ mb: 0.5, fontSize: '0.60rem' }}
                                                        />
                                                    )}
                                                </Stack>
                                            ) : (
                                                <Typography variant="body2" color="text.secondary">
                                                    No specialties
                                                </Typography>
                                            );
                                        })()}
                                    </TableCell>
                                    <TableCell>
                                        {therapist.Services && therapist.Services.length > 0 ? (
                                            <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                                {therapist.Services.slice(0, 2).map((service, index) => (
                                                    <Chip
                                                        key={index}
                                                        label={service.name}
                                                        size="small"
                                                        color="primary"
                                                        variant="outlined"
                                                        sx={{ mb: 0.5, fontSize: '0.60rem' }}
                                                    />
                                                ))}
                                                {therapist.Services.length > 2 && (
                                                    <Chip
                                                        label={`+${therapist.Services.length - 2}`}
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{ mb: 0.5, fontSize: '0.60rem' }}
                                                    />
                                                )}
                                            </Stack>
                                        ) : (
                                            <Typography variant="body2" color="text.secondary">
                                                No services
                                            </Typography>
                                        )}
                                    </TableCell>

                                    <TableCell>
                                        <StatusChip
                                            label={therapist.isActive ? 'Active' : 'Inactive'}
                                            status={therapist.isActive ? 'active' : 'inactive'}
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="View">
                                            <IconButton onClick={() => handleViewTherapist(therapist)}>
                                                <Visibility />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Edit">
                                            <IconButton onClick={() => handleEditTherapist(therapist)}>
                                                <Edit />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title={therapist.isActive ? "Deactivate" : "Activate"}>
                                            <IconButton onClick={() => handleDeleteTherapist(therapist)}>
                                                <Delete />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))}
                                {filteredTherapists.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center">
                                            No therapists found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                        <TablePagination
                            component="div"
                            count={totalTherapists}
                            page={page}
                            onPageChange={handleChangePage}
                            rowsPerPage={rowsPerPage}
                            onRowsPerPageChange={handleChangeRowsPerPage}
                            rowsPerPageOptions={[5, 10, 25, 50]}
                        />
                    </>
                )}
            </StyledTableContainer>

            {/* View Modal */}
            <Dialog open={viewModalOpen} onClose={() => setViewModalOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Therapist Details</DialogTitle>
                <DialogContent>
                    {selectedTherapist ? (
                        <Stack spacing={3}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                {selectedTherapist.profilePictureUrl && (
                                    <Avatar
                                        src={selectedTherapist.profilePictureUrl}
                                        sx={{ width: 80, height: 80 }}
                                    />
                                )}
                                <Box>
                                    <Typography variant="h6">{selectedTherapist.fullName}</Typography>
                                    <Typography color="text.secondary">{selectedTherapist.email}</Typography>
                                </Box>
                            </Box>

                            <Divider />

                            <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Bio</Typography>
                                <Typography>{selectedTherapist.bio || 'No bio provided'}</Typography>
                            </Box>

                            <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Specialties</Typography>
                                {(() => {
                                    let specialties = [];
                                    try {
                                        const parsed = JSON.parse(selectedTherapist.specialties);
                                        specialties = Array.isArray(parsed) ? parsed : [];
                                    } catch {
                                        specialties = [];
                                    }

                                    return specialties.length > 0 ? (
                                        <Stack direction="row" spacing={1} flexWrap="wrap">
                                            {specialties.map((specialty, index) => (
                                                <Chip key={index} label={specialty} size="small" />))}
                                        </Stack>
                                    ) : (
                                        <Typography color="text.secondary">No specialties listed</Typography>
                                    );
                                })()}
                            </Box>

                            <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Services</Typography>
                                {selectedTherapist.Services && selectedTherapist.Services.length > 0 ? (
                                    <Stack direction="row" spacing={1} flexWrap="wrap">
                                        {selectedTherapist.Services.map((service, index) => (
                                            <Chip
                                                key={index}
                                                label={service.name}
                                                size="small"
                                                color="primary"
                                                variant="outlined"
                                            />
                                        ))}
                                    </Stack>
                                ) : (
                                    <Typography color="text.secondary">No services assigned</Typography>
                                )}
                            </Box>

                            <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Years of Experience</Typography>
                                <Typography>{selectedTherapist.yearsOfExperience || 'Not specified'} years</Typography>
                            </Box>

                            <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Status</Typography>
                                <StatusChip
                                    label={selectedTherapist.isActive ? 'Active' : 'Inactive'}
                                    status={selectedTherapist.isActive ? 'active' : 'inactive'}
                                />
                            </Box>

                            <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Profile Created</Typography>
                                <Typography>{new Date(selectedTherapist.createdAt).toLocaleDateString()}</Typography>
                            </Box>
                        </Stack>
                    ) : null}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setViewModalOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Add/Edit Modal */}
            <Dialog open={addModalOpen || editModalOpen} onClose={() => { setAddModalOpen(false); setEditModalOpen(false); }} maxWidth="md" fullWidth>
                <DialogTitle>{editModalOpen ? 'Edit Therapist' : 'Add New Therapist'}</DialogTitle>
                <DialogContent>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        {formError && <Alert severity="error">{formError}</Alert>}

                        {/* User Selection */}
                        <Autocomplete
                            value={formData.selectedUser}
                            onChange={handleUserChange}
                            options={editModalOpen ? [formData.selectedUser, ...availableUsers].filter(Boolean) : availableUsers}
                            getOptionLabel={(option) => option ? `${option.firstName} ${option.lastName} (${option.email})` : ''}
                            disabled={editModalOpen}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Select User *"
                                    fullWidth
                                    variant="outlined"
                                    error={!formData.userId}
                                    helperText={!formData.userId ? 'Please select a user' : ''}
                                />
                            )}
                        />

                        {/* Bio */}
                        <TextField
                            label="Bio"
                            multiline
                            rows={4}
                            fullWidth
                            variant="outlined"
                            value={formData.bio}
                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                            placeholder="Enter therapist's bio..."
                        />

                        {/* Specialties */}
                        <TextField
                            margin="dense"
                            label="Specializations (comma separated)"
                            fullWidth
                            placeholder="e.g., Anxiety, Depression, PTSD, Couples Therapy"
                            value={specializationInput}
                            onChange={(e) => setSpecializationInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ',') {
                                    e.preventDefault();
                                    const trimmed = specializationInput.trim();
                                    if (trimmed.length > 0) {
                                        setFormData((prev) => ({
                                            ...prev,
                                            specialties: [...prev.specialties, trimmed]
                                        }));
                                        setSpecializationInput('');
                                    }
                                }
                            }}
                            helperText="Type and press comma or Enter to add"
                        />

                        {/* Show current specializations as chips */}
                        {formData.specialties.length > 0 && (
                            <Box sx={{ mt: 1, mb: 1 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                    Current specializations:
                                </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {formData.specialties.map((spec, index) => (
                                        <Chip
                                            key={index}
                                            label={spec}
                                            size="small"
                                            onDelete={() => {
                                                const newSpecs = formData.specialties.filter((_, i) => i !== index);
                                                setFormData({
                                                    ...formData,
                                                    specialties: newSpecs
                                                });
                                            }}
                                            sx={{
                                                backgroundColor: alpha('#1976d2', 0.1),
                                                color: '#1976d2',
                                                '& .MuiChip-deleteIcon': {
                                                    color: '#1976d2'
                                                }
                                            }}
                                        />
                                    ))}
                                </Box>
                            </Box>
                        )}
                        {/* Years of Experience */}
                        <TextField
                            label="Years of Experience"
                            type="number"
                            fullWidth
                            variant="outlined"
                            value={formData.yearsOfExperience}
                            onChange={(e) => setFormData({ ...formData, yearsOfExperience: e.target.value })}
                            inputProps={{ min: 0, max: 50 }}
                        />

                        {/* Profile Picture URL */}
                        <TextField
                            label="Profile Picture URL"
                            fullWidth
                            variant="outlined"
                            value={formData.profilePictureUrl}
                            onChange={(e) => setFormData({ ...formData, profilePictureUrl: e.target.value })}
                            placeholder="https://example.com/profile-picture.jpg"
                        />

                        {/* Services */}
                        <FormControl fullWidth>
                            <InputLabel>Services</InputLabel>
                            <Select
                                multiple
                                value={formData.serviceIds}
                                onChange={(e) => setFormData({ ...formData, serviceIds: e.target.value })}
                                renderValue={(selected) => (
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {selected.map((value) => {
                                            const service = services.find(s => s.id === value);
                                            return (
                                                <Chip
                                                    key={value}
                                                    label={service ? service.name : 'Unknown'}
                                                    size="small"
                                                />
                                            );
                                        })}
                                    </Box>
                                )}
                            >
                                {services.map((service) => (
                                    <MenuItem key={service.id} value={service.id}>
                                        <Checkbox checked={formData.serviceIds.includes(service.id)} />
                                        {service.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {/* Active Status */}
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                />
                            }
                            label="Active Status"
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setAddModalOpen(false); setEditModalOpen(false); setSpecializationInput(''); }}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => handleSaveTherapist(editModalOpen)}
                        disabled={!formData.userId}
                    >
                        {editModalOpen ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
                <DialogTitle>Confirm Action</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to {selectedTherapist?.isActive ? 'deactivate' : 'activate'} this therapist?
                        This will {selectedTherapist?.isActive ? 'hide' : 'show'} them from active listings.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteModalOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        color={selectedTherapist?.isActive ? 'error' : 'success'}
                        onClick={handleConfirmDelete}
                    >
                        {selectedTherapist?.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Loading Backdrop */}
            <Backdrop open={backdrop} sx={{ color: '#fff', zIndex: theme => theme.zIndex.drawer + 1 }}>
                <CircularProgress color="inherit" />
            </Backdrop>
        </Box>
    );
}