import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Paper, CircularProgress, Alert, IconButton, TextField, InputAdornment,
  Avatar, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TablePagination, Checkbox, FormControl,
  InputLabel, Select, Stack, Card, CardContent, Grid, Switch, FormControlLabel, Tooltip, Backdrop, Divider
} from '@mui/material';
import {
  Search, FileDownload, Add, Edit, Delete, Visibility, Person, AdminPanelSettings, Group, Clear
} from '@mui/icons-material';
import { styled, alpha } from '@mui/material/styles';
import apiClient from '../../../services/apiClient';

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  background: '#fff',
  overflow: 'hidden',
  '& .MuiTable-root': { minWidth: 650 },
  '& .MuiTableHead-root': { backgroundColor: alpha(theme.palette.primary.main, 0.03) },
  '& .MuiTableCell-head': {
    fontWeight: 700, fontSize: '0.8rem', color: theme.palette.text.primary,
    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`, padding: '18px 24px',
  },
  '& .MuiTableCell-body': {
    fontSize: '0.75rem', borderBottom: `1px solid ${alpha(theme.palette.divider, 0.04)}`,
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

const RoleChip = styled(Chip)(({ theme, role }) => {
  const getColors = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin': return { bg: alpha(theme.palette.error.main, 0.1), color: theme.palette.error.main, border: alpha(theme.palette.error.main, 0.2) };
      case 'staff': return { bg: alpha(theme.palette.warning.main, 0.1), color: theme.palette.warning.main, border: alpha(theme.palette.warning.main, 0.2) };
      case 'therapist': return { bg: alpha(theme.palette.info.main, 0.1), color: theme.palette.info.main, border: alpha(theme.palette.info.main, 0.2) };
      default: return { bg: alpha(theme.palette.grey[500], 0.08), color: theme.palette.grey[800], border: alpha(theme.palette.grey[500], 0.2) };
    }
  };
  const colors = getColors(role);
  return {
    fontWeight: 300, fontSize: '0.60rem', height: 24,
    backgroundColor: colors.bg, color: colors.color, border: `1px solid ${colors.border}`,
    '& .MuiChip-label': { padding: '0 8px' },
  };
});

export default function EnhancedUserManagement() {
  // State
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);
  const [selected, setSelected] = useState([]);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [specializationInput, setSpecializationInput] = useState('');
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', password: '', roleId: '', isActive: true,
    therapistDetails: { specializations: [], bio: '' }
  });
  const [formError, setFormError] = useState(null);
  const [backdrop, setBackdrop] = useState(false);

  // Fetch roles
  useEffect(() => {
    apiClient.get('/roles').then(res => setRoles(res.data || []));
  }, []);

  // Fetch users with backend pagination/filtering
  const fetchUsers = async () => {
    setLoading(true); setError(null);
    try {
      const params = { page: page + 1, limit: rowsPerPage };
      if (roleFilter !== 'all') params.role = roleFilter;
      if (statusFilter !== 'all') params.isActive = statusFilter === 'active' ? true : false;
      const response = await apiClient.get('/users', { params });
      const usersArray = response.data.users || [];
      setUsers(usersArray.map(user => ({
        ...user,
        roleName: user.Role?.name || 'N/A',
        fullName: `${user.firstName} ${user.lastName}`,
      })));
      setTotalUsers(response.data.totalUsers || 0);
    } catch (err) {
      setError("Failed to load users.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchUsers(); }, [page, rowsPerPage, roleFilter, statusFilter]);

  // Filtered users for search (client-side, for now)
  const filteredUsers = users.filter(user =>
    user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Selection
  const handleSelectAllClick = (event) => {
    setSelected(event.target.checked ? filteredUsers.map(u => u.id) : []);
  };
  const handleSelectClick = (event, id) => {
    setSelected(selected.includes(id) ? selected.filter(i => i !== id) : [...selected, id]);
  };

  // Modal handlers
  const handleViewUser = async (user) => {
    setBackdrop(true);
    try {
      const res = await apiClient.get(`/users/${user.id}`);
      setSelectedUser(res.data);
      setViewModalOpen(true);
    } catch {
      setError('Failed to load user details.');
    }
    setBackdrop(false);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: '',
      roleId: user.roleId,
      isActive: user.isActive,
      therapistDetails: user.Role?.name === 'therapist'
        ? { specializations: user.Therapist?.specialties || [], bio: user.Therapist?.bio || '' }
        : { specializations: [], bio: '' }
    });
    setEditModalOpen(true);
    setFormError(null);
  };

  const handleAddUser = () => {
    setFormData({
      firstName: '', lastName: '', email: '', password: '', roleId: '', isActive: true,
      therapistDetails: { specializations: [], bio: '' }
    });
    setAddModalOpen(true);
    setFormError(null);
  };

  const handleDeleteUser = (user) => {
    setSelectedUser(user);
    setDeleteModalOpen(true);
  };

  // Save user (create or edit)
  const handleSaveUser = async (isEdit = false) => {
    setFormError(null); setBackdrop(true);
    try {
      const payload = {
        firstName: formData.firstName, lastName: formData.lastName, email: formData.email,
        roleId: formData.roleId, isActive: formData.isActive
      };
      if (!isEdit) payload.password = formData.password;
      const selectedRole = roles.find(r => r.id === formData.roleId);
      if (selectedRole?.name === 'therapist') {
        payload.therapistDetails = {
          specializations: formData.therapistDetails.specializations,
          bio: formData.therapistDetails.bio
        };
      }
      if (isEdit) {
        await apiClient.put(`/users/${selectedUser.id}`, payload);
        setEditModalOpen(false);
      } else {
        await apiClient.post('/users', payload);
        setAddModalOpen(false);
      }
      fetchUsers();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save user.');
    }
    setBackdrop(false);
  };

  // Delete user
  const handleConfirmDelete = async () => {
    setBackdrop(true);
    try {
      await apiClient.delete(`/users/${selectedUser.id}`);
      fetchUsers();
      setDeleteModalOpen(false);
    } catch (err) {
      setError('Failed to delete user.');
    }
    setBackdrop(false);
  };

  // Export to CSV
  const exportToCSV = () => {
    if (!filteredUsers.length) return;
    const csvData = filteredUsers.map(user => ({
      Name: user.fullName, Email: user.email, Role: user.roleName,
      Status: user.isActive ? 'Active' : 'Inactive',
      'Created At': new Date(user.createdAt).toLocaleDateString()
    }));
    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'users.csv'; a.click();
  };

  // Pagination
  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => { setRowsPerPage(parseInt(event.target.value, 10)); setPage(0); };

  // Analytics
  const totalActive = users.filter(u => u.isActive).length;
  const totalAdmins = users.filter(u => u.roleName?.toLowerCase() === 'admin').length;
  const totalStaff = users.filter(u => u.roleName?.toLowerCase() === 'staff').length;
  const totalTherapists = users.filter(u => u.roleName?.toLowerCase() === 'therapist').length;

  return (
    <Box sx={{ p: 3, bgcolor: '#fafafa', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a1a', mb: 1 }}>
          User Management
        </Typography>
        <Typography variant="body1" sx={{ color: '#6b7280' }}>
          Manage your team members and their permissions
        </Typography>
      </Box>
      {/* Analytics Cards */}
      <Grid container spacing={3} sx={{ mb: 4, justifyContent: 'space-between'}}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
                  <Group />
                </Avatar>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>{totalUsers}</Typography>
                  <Typography variant="body2" color="text.secondary">Total Users</Typography>
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
                  <Typography variant="body2" color="text.secondary">Active Users</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'error.main', width: 48, height: 48 }}>
                  <AdminPanelSettings />
                </Avatar>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>{totalAdmins}</Typography>
                  <Typography variant="body2" color="text.secondary">Admins</Typography>
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
                  <Group />
                </Avatar>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>{totalTherapists}</Typography>
                  <Typography variant="body2" color="text.secondary">Therapists</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      {/* Search and Filter Bar */}
      <Box sx={{ mb: 3, bgcolor: 'white', p: 3, borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth variant="outlined" size="small"
              placeholder="Search users by name or email..."
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
            <FormControl fullWidth size="small">
              <InputLabel>Role</InputLabel>
              <Select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
                <MenuItem value="all">All</MenuItem>
                {roles.map(role => (
                  <MenuItem key={role.id} value={role.name}>{role.name.charAt(0).toUpperCase() + role.name.slice(1)}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
            <Button variant="contained" startIcon={<Add />} sx={{ mr: 2 }} onClick={handleAddUser}>Add User</Button>
            <Button variant="outlined" startIcon={<FileDownload />} onClick={exportToCSV}>Export CSV</Button>
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
                      indeterminate={selected.length > 0 && selected.length < filteredUsers.length}
                      checked={filteredUsers.length > 0 && selected.length === filteredUsers.length}
                      onChange={handleSelectAllClick}
                    />
                  </TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.map(user => (
                  <TableRow key={user.id} hover selected={selected.includes(user.id)}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        color="primary"
                        checked={selected.includes(user.id)}
                        onChange={e => handleSelectClick(e, user.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        {/* <Avatar sx={{ bgcolor: alpha('#1976d2', 0.15), color: '#1976d2', width: 32, height: 32 }}>
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </Avatar>*/}
                        <Typography>{user.fullName}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <RoleChip label={user.roleName} role={user.roleName} />
                    </TableCell>
                    <TableCell>
                      <StatusChip label={user.isActive ? 'Active' : 'Inactive'} status={user.isActive ? 'active' : 'inactive'} />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View"><IconButton onClick={() => handleViewUser(user)}><Visibility /></IconButton></Tooltip>
                      <Tooltip title="Edit"><IconButton onClick={() => handleEditUser(user)}><Edit /></IconButton></Tooltip>
                      <Tooltip title="Deactivate"><IconButton onClick={() => handleDeleteUser(user)}><Delete /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">No users found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={totalUsers}
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
          return
        }
        setAddModalOpen(false); setEditModalOpen(false);
      }}>
        <DialogTitle>{editModalOpen ? 'Edit User' : 'Add User'}</DialogTitle>
        <DialogContent>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <TextField margin="dense" label="First Name" fullWidth value={formData.firstName}
            onChange={e => setFormData({ ...formData, firstName: e.target.value })} />
          <TextField margin="dense" label="Last Name" fullWidth value={formData.lastName}
            onChange={e => setFormData({ ...formData, lastName: e.target.value })} />
          <TextField margin="dense" label="Email" fullWidth value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })} />
          {!editModalOpen && (
            <TextField margin="dense" label="Password" type="password" fullWidth value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })} />
          )}
          <FormControl fullWidth margin="dense">
            <InputLabel>Role</InputLabel>
            <Select value={formData.roleId} onChange={e => setFormData({ ...formData, roleId: e.target.value })}>
              {roles.map(role => (
                <MenuItem key={role.id} value={role.id}>{role.name.charAt(0).toUpperCase() + role.name.slice(1)}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            control={<Switch checked={formData.isActive} onChange={e => setFormData({ ...formData, isActive: e.target.checked })} />}
            label="Active"
          />
          {/* Therapist fields */}
          {roles.find(r => r.id === formData.roleId)?.name === 'therapist' && (
            <>
              <TextField
                margin="dense"
                label="Specializations (comma separated)"
                fullWidth
                placeholder="e.g., Anxiety, Depression, PTSD, Couples Therapy"
                value={specializationInput}
                onChange={(e) => {
                  setSpecializationInput(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    const trimmed = specializationInput.trim();
                    if (trimmed.length > 0) {
                      setFormData((prev) => ({
                        ...prev,
                        therapistDetails: {
                          ...prev.therapistDetails,
                          specializations: [...prev.therapistDetails.specializations, trimmed]
                        }
                      }));
                    }
                    setSpecializationInput('');
                  }
                }}
                helperText="Type and press comma or Enter to add"
              />

              {/* Show current specializations as chips */}
              {formData.therapistDetails.specializations.length > 0 && (
                <Box sx={{ mt: 1, mb: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    Current specializations:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {formData.therapistDetails.specializations.map((spec, index) => (
                      <Chip
                        key={index}
                        label={spec}
                        size="small"
                        onDelete={() => {
                          const newSpecs = formData.therapistDetails.specializations.filter((_, i) => i !== index);
                          setFormData({
                            ...formData,
                            therapistDetails: {
                              ...formData.therapistDetails,
                              specializations: newSpecs
                            }
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

              <TextField
                margin="dense"
                label="Bio"
                fullWidth
                multiline
                minRows={2}
                value={formData.therapistDetails.bio}
                onChange={e => setFormData({
                  ...formData,
                  therapistDetails: {
                    ...formData.therapistDetails,
                    bio: e.target.value
                  }
                })}
                placeholder="Tell us about your background and therapeutic approach..."
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setAddModalOpen(false); setEditModalOpen(false); }}>Cancel</Button>
          <Button variant="contained" onClick={() => handleSaveUser(editModalOpen)}>
            {editModalOpen ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Modal */}
      <Dialog open={viewModalOpen} onClose={() => setViewModalOpen(false)}>
        <DialogTitle>User Details</DialogTitle>
        <DialogContent>
          {selectedUser ? (
            <Stack spacing={2}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ bgcolor: alpha('#1976d2', 0.15), color: '#1976d2', width: 56, height: 56 }}>
                  {selectedUser.firstName?.[0]}{selectedUser.lastName?.[0]}
                </Avatar>
                <Box>
                  <Typography variant="h6">{selectedUser.firstName} {selectedUser.lastName}</Typography>
                  <Typography color="text.secondary">{selectedUser.email}</Typography>
                </Box>
              </Stack>
              <Divider />
              <Typography><b>Role:</b> {selectedUser.Role?.name}</Typography>
              <Typography><b>Status:</b> {selectedUser.isActive ? 'Active' : 'Inactive'}</Typography>
              {selectedUser.Role?.name === 'therapist' && selectedUser.Therapist && (
                <>
                  <Divider />
                  <Typography variant="subtitle2">Therapist Details</Typography>
                  <Typography><b>Specializations:</b> {selectedUser.Therapist.specialties.join(', ')}</Typography>
                  <Typography><b>Bio:</b> {selectedUser.Therapist.bio}</Typography>
                </>
              )}
              <Divider />
              <Typography variant="caption" color="text.secondary">
                Joined: {new Date(selectedUser.createdAt).toLocaleDateString()}
              </Typography>
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
        <DialogTitle>Deactivate User</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to deactivate <b>{selectedUser?.fullName}</b>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteModalOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleConfirmDelete}>Deactivate</Button>
        </DialogActions>
      </Dialog>

      {/* Backdrop for loading */}
      <Backdrop open={backdrop} sx={{ zIndex: 9999, color: '#fff' }}>
        <CircularProgress color="inherit" />
      </Backdrop>
    </Box >
  );
}
