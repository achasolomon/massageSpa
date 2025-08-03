import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Paper, CircularProgress, Alert, IconButton, TextField, InputAdornment,
  Avatar, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TablePagination, Checkbox, FormControl,
  InputLabel, Select, Stack, Card, CardContent, Grid, Switch, FormControlLabel, Tooltip, Backdrop, Divider
} from '@mui/material';
import {
  Search, FileDownload, Add, Edit, Delete, Visibility, Person, Phone, Email, Cake, LocationOn, Clear
} from '@mui/icons-material';
import { styled, alpha } from '@mui/material/styles';
import apiClient from '../../../services/apiClient';
import { format, parseISO } from 'date-fns';

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
    fontSize: '0.70rem', borderBottom: `1px solid ${alpha(theme.palette.divider, 0.04)}`,
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

const ClientStatusChip = styled(Chip)(({ theme, active }) => ({
  fontWeight: 500, fontSize: '0.60rem', height: 24,
  backgroundColor: active
    ? alpha(theme.palette.success.main, 0.1)
    : alpha(theme.palette.error.main, 0.1),
  color: active
    ? theme.palette.success.main
    : theme.palette.error.main,
  border: `1px solid ${active
    ? alpha(theme.palette.success.main, 0.2)
    : alpha(theme.palette.error.main, 0.2)}`,
  '& .MuiChip-label': { padding: '0 8px' },
}));

export default function ClientManagement() {
  // State
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalClients, setTotalClients] = useState(0);
  const [selected, setSelected] = useState([]);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '', address: '', dateOfBirth: '', notes: ''
  });
  const [formError, setFormError] = useState(null);
  const [backdrop, setBackdrop] = useState(false);

  // Fetch clients with backend pagination/filtering
  const fetchClients = async () => {
    setLoading(true); setError(null);
    try {
      const params = { page: page + 1, limit: rowsPerPage };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.isActive = statusFilter === 'active';

      const response = await apiClient.get('/clients', { params });
      setClients(response.data.clients || []);
      setTotalClients(response.data.totalClients || 0);
    } catch (err) {
      setError("Failed to load clients.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchClients(); }, [page, rowsPerPage, statusFilter, searchTerm]);

  // Selection
  const handleSelectAllClick = (event) => {
    setSelected(event.target.checked ? clients.map(c => c.id) : []);
  };
  const handleSelectClick = (event, id) => {
    setSelected(selected.includes(id) ? selected.filter(i => i !== id) : [...selected, id]);
  };

  // Modal handlers
  const handleViewClient = async (client) => {
    setBackdrop(true);
    try {
      const res = await apiClient.get(`/clients/${client.id}`);
      setSelectedClient(res.data);
      setViewModalOpen(true);
    } catch {
      setError('Failed to load client details.');
    }
    setBackdrop(false);
  };

  const handleEditClient = (client) => {
    setSelectedClient(client);
    setFormData({
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      phone: client.phone,
      address: client.address || '',
      dateOfBirth: client.dateOfBirth || '',
      notes: client.notes || ''
    });
    setEditModalOpen(true);
    setFormError(null);
  };

  const handleAddClient = () => {
    setFormData({
      firstName: '', lastName: '', email: '', phone: '', address: '', dateOfBirth: '', notes: ''
    });
    setAddModalOpen(true);
    setFormError(null);
  };

  const handleDeleteClient = (client) => {
    setSelectedClient(client);
    setDeleteModalOpen(true);
  };

  // Save client (create or edit)
  const handleSaveClient = async (isEdit = false) => {
    setFormError(null); setBackdrop(true);
    try {
      if (isEdit) {
        await apiClient.put(`/clients/${selectedClient.id}`, formData);
        setEditModalOpen(false);
      } else {
        await apiClient.post('/clients', formData);
        setAddModalOpen(false);
      }
      fetchClients();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save client.');
    }
    setBackdrop(false);
  };

  // Delete client
  const handleConfirmDelete = async () => {
    setBackdrop(true);
    try {
      await apiClient.delete(`/clients/${selectedClient.id}`);
      fetchClients();
      setDeleteModalOpen(false);
    } catch (err) {
      setError('Failed to delete client.');
    }
    setBackdrop(false);
  };

  // Export to CSV
  const exportToCSV = () => {
    if (!clients.length) return;
    const csvData = clients.map(client => ({
      Name: `${client.firstName} ${client.lastName}`,
      Email: client.email,
      Phone: client.phone,
      Status: client.isActive ? 'Active' : 'Inactive',
      'Created At': format(parseISO(client.createdAt), 'MM/dd/yyyy')
    }));
    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'clients.csv'; a.click();
  };

  // Pagination
  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => { setRowsPerPage(parseInt(event.target.value, 10)); setPage(0); };

  // Analytics
  const totalActive = clients.filter(c => c.isActive).length;
  const totalWithBookings = 0; // Would need to fetch this from backend
  const recentClients = clients.slice(0, 5); // For the recent clients card

  return (
    <Box sx={{ p: 3, bgcolor: '#fafafa', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a1a', mb: 1 }}>
          Client Management
        </Typography>
        <Typography variant="body1" sx={{ color: '#6b7280' }}>
          Manage your therapy clients and their information
        </Typography>
      </Box>

      {/* Analytics Cards */}
      <Grid container spacing={3} sx={{ mb: 4, justifyContent: 'space-between' }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
                  <Person />
                </Avatar>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>{totalClients}</Typography>
                  <Typography variant="body2" color="text.secondary">Total Clients</Typography>
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
                  <Typography variant="body2" color="text.secondary">Active Clients</Typography>
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
                  <Person />
                </Avatar>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>{totalWithBookings}</Typography>
                  <Typography variant="body2" color="text.secondary">With Bookings</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'warning.main', width: 48, height: 48 }}>
                  <Person />
                </Avatar>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>{recentClients.length}</Typography>
                  <Typography variant="body2" color="text.secondary">Recent Clients</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filter Bar */}
      <Box sx={{ mb: 3, bgcolor: 'white', p: 3, borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth variant="outlined" size="small"
              placeholder="Search clients by name, email or phone..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (<InputAdornment position="start"><Search size={20} /></InputAdornment>),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchTerm('')}>
                      <Clear size={16} />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <Button variant="outlined" fullWidth startIcon={<FileDownload />} onClick={exportToCSV}>
              Export
            </Button>
          </Grid>
          <Grid item xs={12} md={2} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
            <Button variant="contained" startIcon={<Add />} onClick={handleAddClient}>
              Add Client
            </Button>
          </Grid>
        </Grid>
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
                      indeterminate={selected.length > 0 && selected.length < clients.length}
                      checked={clients.length > 0 && selected.length === clients.length}
                      onChange={handleSelectAllClick}
                    />
                  </TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {clients.map(client => (
                  <TableRow key={client.id} hover selected={selected.includes(client.id)}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        color="primary"
                        checked={selected.includes(client.id)}
                        onChange={e => handleSelectClick(e, client.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        {/* <Avatar sx={{ bgcolor: alpha('#1976d2', 0.15), color: '#1976d2', width: 32, height: 32 }}>
                          {client.firstName?.[0]}{client.lastName?.[0]}
                        </Avatar> */}
                        <Typography>{client.firstName} {client.lastName}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Email fontSize="small" color="action" /> {client.email}
                        </Typography>
                        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Phone fontSize="small" color="action" /> {client.phone}
                        </Typography>
                      </Stack>
                    </TableCell>
                    
                    <TableCell>
                      {format(parseISO(client.createdAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View"><IconButton onClick={() => handleViewClient(client)}><Visibility /></IconButton></Tooltip>
                      <Tooltip title="Edit"><IconButton onClick={() => handleEditClient(client)}><Edit /></IconButton></Tooltip>
                      <Tooltip title="Delete"><IconButton onClick={() => handleDeleteClient(client)}><Delete /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {clients.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">No clients found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={totalClients}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
          </>
        )}
      </StyledTableContainer>

      {/* Add/Edit Modal */}
      <Dialog open={addModalOpen || editModalOpen} onClose={(event, reason) => {
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
          return;
        } setAddModalOpen(false); setEditModalOpen(false);
      }} maxWidth="sm" fullWidth>

        <DialogTitle>{editModalOpen ? 'Edit Client' : 'Add New Client'}</DialogTitle>
        <DialogContent>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                value={formData.firstName}
                onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={formData.lastName}
                onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Phone"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocationOn color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Date of Birth"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={formData.dateOfBirth}
                onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Cake color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setAddModalOpen(false); setEditModalOpen(false); }}>Cancel</Button>
          <Button variant="contained" onClick={() => handleSaveClient(editModalOpen)}>
            {editModalOpen ? 'Update Client' : 'Add Client'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Modal */}
      <Dialog open={viewModalOpen} onClose={() => setViewModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Client Details</DialogTitle>
        <DialogContent>
          {selectedClient ? (
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{
                  bgcolor: alpha('#1976d2', 0.15),
                  color: '#1976d2',
                  width: 56,
                  height: 56,
                  fontSize: '1.5rem'
                }}>
                  {selectedClient.firstName?.[0]}{selectedClient.lastName?.[0]}
                </Avatar>
                <Box>
                  <Typography variant="h5">{selectedClient.firstName} {selectedClient.lastName}</Typography>
                  <ClientStatusChip
                    label={selectedClient.isActive ? 'Active' : 'Inactive'}
                    active={selectedClient.isActive}
                    sx={{ mt: 1 }}
                  />
                </Box>
              </Stack>

              <Divider />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Email</Typography>
                  <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Email fontSize="small" color="action" /> {selectedClient.email}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Phone</Typography>
                  <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Phone fontSize="small" color="action" /> {selectedClient.phone}
                  </Typography>
                </Grid>
                {selectedClient.address && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">Address</Typography>
                    <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocationOn fontSize="small" color="action" /> {selectedClient.address}
                    </Typography>
                  </Grid>
                )}
                {selectedClient.dateOfBirth && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">Date of Birth</Typography>
                    <Typography sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Cake fontSize="small" color="action" />
                      {format(parseISO(selectedClient.dateOfBirth), 'MMMM d, yyyy')}
                    </Typography>
                  </Grid>
                )}
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">Member Since</Typography>
                  <Typography>
                    {format(parseISO(selectedClient.createdAt), 'MMMM d, yyyy')}
                  </Typography>
                </Grid>
                {selectedClient.notes && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">Notes</Typography>
                    <Typography sx={{ whiteSpace: 'pre-line' }}>{selectedClient.notes}</Typography>
                  </Grid>
                )}
              </Grid>
            </Stack>
          ) : (
            <Box sx={{ p: 2, textAlign: 'center' }}><CircularProgress /></Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewModalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
        <DialogTitle>Delete Client</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <b>{selectedClient?.firstName} {selectedClient?.lastName}</b>? This action cannot be undone.
          </Typography>
          {selectedClient?.isActive && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              This client is currently marked as active. Consider deactivating instead of deleting.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteModalOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleConfirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Backdrop for loading */}
      <Backdrop open={backdrop} sx={{ zIndex: 9999, color: '#fff' }}>
        <CircularProgress color="inherit" />
      </Backdrop>
    </Box>
  );
}