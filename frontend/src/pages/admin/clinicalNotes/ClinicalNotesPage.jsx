import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Typography, Button, Paper, CircularProgress, Alert, IconButton, TextField,
  Avatar, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TablePagination, FormControl,
  InputLabel, Select, Stack, Card, CardContent, Grid, Divider, Tabs, Tab,
  List, ListItem, ListItemText, ListItemIcon, Tooltip, Backdrop, InputAdornment
} from '@mui/material';
import {
  Search, Add, Edit, Delete, Clear, CalendarToday, Event, Note, Person,
  ArrowBack, ArrowForward, Warning, CheckCircle, Error, Info, Schedule,
  MoreVert, Close, Replay, Visibility, Lock, LockOpen, AccessTime
} from '@mui/icons-material';
import { styled, alpha } from '@mui/material/styles';
import { format, parseISO, isToday, isThisWeek } from 'date-fns';
import apiClient from '../../../services/apiClient';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useAuth } from '../../../hooks/useAuth';
import { isAfter, startOfDay } from 'date-fns';


// Styled components
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

const NoteStatusChip = styled(Chip)(({ theme, status }) => ({
  fontWeight: 300,
  fontSize: '0.60rem',
  height: 24,
  backgroundColor: status === 'completed'
    ? alpha(theme.palette.success.main, 0.1)
    : status === 'in-progress'
      ? alpha(theme.palette.warning.main, 0.1)
      : alpha(theme.palette.info.main, 0.1),
  color: status === 'completed'
    ? theme.palette.success.main
    : status === 'in-progress'
      ? theme.palette.warning.main
      : theme.palette.info.main,
  border: `1px solid ${status === 'completed'
    ? alpha(theme.palette.success.main, 0.2)
    : status === 'in-progress'
      ? alpha(theme.palette.warning.main, 0.2)
      : alpha(theme.palette.info.main, 0.2)}`,
  '& .MuiChip-label': { padding: '0 8px' },
}));

const SessionStatusChip = styled(Chip)(({ theme, status }) => ({
  fontWeight: 300,
  fontSize: '0.60rem',
  height: 24,
  backgroundColor: status === 'ready'
    ? alpha(theme.palette.success.main, 0.1)
    : alpha(theme.palette.warning.main, 0.1),
  color: status === 'ready'
    ? theme.palette.success.main
    : theme.palette.warning.main,
  border: `1px solid ${status === 'ready'
    ? alpha(theme.palette.success.main, 0.2)
    : alpha(theme.palette.warning.main, 0.2)}`,
  '& .MuiChip-label': { padding: '0 8px' },
}));

export default function ClinicalNotesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // State
  const [notes, setNotes] = useState([]);
  const [sessions, setSessions] = useState([]); // For ready sessions
  const [loading, setLoading] = useState(true);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [therapists, setTherapists] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedTherapist, setSelectedTherapist] = useState(user.role === 'therapist' ? user.therapistId : 'all');
  const [selectedClient, setSelectedClient] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalNotes, setTotalNotes] = useState(0);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [backdrop, setBackdrop] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  // Check if we need to refresh data
  useEffect(() => {
    if (location.state?.refresh) {
      fetchData();
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Fetch ready sessions (bookings that need clinical notes)
  const fetchReadySessions = async () => {
    if (user.role !== 'therapist' && user.role !== 'admin' && user.role !== 'staff') return;

    setSessionsLoading(true);
    try {
      let endpoint;
      let params = {
        status: 'confirmed',
        paymentStatus: 'paid',
        limit: 100
      };

      if (user.role === 'therapist') {
        // Therapist sees only their assigned sessions
        endpoint = '/bookings/ready-for-notes';
        params.therapistId = user.therapistId;
      } else {
        // Admin/Staff can see all ready sessions or filter by therapist
        endpoint = '/bookings/ready-for-notes';
        if (selectedTherapist !== 'all') {
          params.therapistId = selectedTherapist;
        }
      }

      const response = await apiClient.get(endpoint, { params });
      // console.log("available session", response);
      setSessions(response.data.bookings || []);
    } catch (err) {
      console.error("Failed to load ready sessions:", err);
      // Don't show error to user for sessions, just log it
    } finally {
      setSessionsLoading(false);
    }
  };

  // Fetch clinical notes
  const fetchClinicalNotes = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        search: searchTerm || undefined,
        completed: tabValue === 2 ? true : tabValue === 1 ? false : undefined
      };

      // Add filters based on role and selection
      if (user.role === 'therapist') {
        params.therapistId = user.therapistId;
      } else {
        if (selectedTherapist !== 'all') {
          params.therapistId = selectedTherapist;
        }
        if (selectedClient !== 'all') {
          params.clientId = selectedClient;
        }
      }

      const endpoint = user.role === 'therapist' ? '/clinical-notes/my-notes' : '/clinical-notes';
      const response = await apiClient.get(endpoint, { params });
      setNotes(response.data.notes || []);
      setTotalNotes(response.data.total || 0);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load clinical notes.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch therapists and clients (for admin/staff)
  const fetchTherapistsAndClients = async () => {
    if (user.role === 'therapist') return;

    try {
      const [therapistsRes, clientsRes] = await Promise.all([
        apiClient.get('/therapists'),
        apiClient.get('/clients')
      ]);
      setTherapists(therapistsRes.data.therapists || []);
      setClients(clientsRes.data.clients || []);
    } catch (err) {
      console.error("Failed to load therapists/clients:", err);
    }
  };

  // Combined fetch function
  const fetchData = () => {
    fetchClinicalNotes();
    fetchTherapistsAndClients();
    if (tabValue === 0) {
      fetchReadySessions();
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, rowsPerPage, selectedTherapist, selectedClient, searchTerm, tabValue]);

  // Navigation handlers
  const handleViewNote = (note) => {
    navigate(`/admin/clinical-notes/${note.id}`, { state: { mode: 'view' } });
  };

  const handleEditNote = (note) => {
    navigate(`/admin/clinical-notes/${note.id}`, { state: { mode: 'edit' } });
  };

  const handleStartSession = (booking) => {
    // Navigate to create note for this booking
    navigate(`/admin/clinical-notes/new`, {
      state: {
        mode: 'create',
        bookingId: booking.id,
        booking: booking
      }
    });
  };

  const handleContinueNote = (booking) => {
    // Navigate to edit existing note
    navigate(`/admin/clinical-notes/${booking.ClinicalNote.id}`, {
      state: {
        mode: 'edit',
        bookingId: booking.id
      }
    });
  };

  const handleDeleteNote = (note) => {
    setSelectedNote(note);
    setDeleteModalOpen(true);
  };

  // Delete note
  const handleConfirmDelete = async () => {
    setBackdrop(true);
    try {
      await apiClient.delete(`/clinical-notes/${selectedNote.id}`);
      fetchClinicalNotes();
      setDeleteModalOpen(false);
    } catch (err) {
      setError('Failed to delete clinical note.');
    }
    setBackdrop(false);
  };

  // Pagination
  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setPage(0); // Reset to first page when changing tabs
  };

  //  helper function after your existing helper functions
  const isSessionDue = (sessionDateTime) => {
    const sessionDate = startOfDay(parseISO(sessionDateTime));
    const currentDate = startOfDay(new Date());

    // Session is due if it's today or in the past
    return !isAfter(sessionDate, currentDate);
  };

  // Check permissions
  const canModifyNote = (note) => {
    if (!note || !user) return false;

    if (user.role === 'admin') return true;
    if (user.role === 'staff') return true;
    if (user.role === 'therapist') {
      return note.therapistId === user.therapistId && !note.completed;
    }
    return false;
  };

  const canDeleteNote = (note) => {
    return user.role === 'admin';
  };

  // Get session status
  const getSessionStatus = (booking) => {
    if (booking.ClinicalNote) {
      return booking.ClinicalNote.completed ? 'completed' : 'in-progress';
    }
    return 'ready';
  };

  // Filter sessions for today and this week
  const todaySessions = sessions.filter(session =>
    isToday(parseISO(session.bookingStartTime))
  );

  const thisWeekSessions = sessions.filter(session =>
    isThisWeek(parseISO(session.bookingStartTime))
  );

  // Analytics
  const totalNotesDraft = notes.filter(n => !n.completed).length;
  const totalNotesCompleted = notes.filter(n => n.completed).length;
  const totalSOAPNotes = notes.filter(n => n.subjective || n.objective || n.assessment || n.plan).length;

  return (
    <Box sx={{ p: 3, bgcolor: '#fafafa', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1a1a1a', mb: 1 }}>
          {user.role === 'therapist' ? 'My Sessions & Notes' : 'Clinical Sessions & Notes'}
        </Typography>
        <Typography variant="body1" sx={{ color: '#6b7280' }}>
          {user.role === 'therapist'
            ? 'Manage your therapy sessions and clinical documentation'
            : 'Oversee all clinical sessions and notes'
          }
        </Typography>
      </Box>

      {/* Tabs */}
      <Box sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          sx={{
            bgcolor: 'white',
            borderRadius: 1,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            '& .MuiTabs-indicator': { height: 3 }
          }}
        >
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Schedule />
                Ready Sessions
                {sessions.length > 0 && (
                  <Chip
                    label={sessions.length}
                    size="small"
                    color="primary"
                  />
                )}
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Edit />
                In Progress
                {totalNotesDraft > 0 && (
                  <Chip
                    label={totalNotesDraft}
                    size="small"
                    color="warning"
                  />
                )}
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircle />
                Completed
                {totalNotesCompleted > 0 && (
                  <Chip
                    label={totalNotesCompleted}
                    size="small"
                    color="success"
                  />
                )}
              </Box>
            }
          />
        </Tabs>
      </Box>

      {/* Analytics Cards */}
      <Grid container spacing={3} sx={{ mb: 4, justifyContent: 'space-between' }}>
        <Grid item xs={12} sm={12} md={3}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'info.main', width: 48, height: 48 }}>
                  <Schedule />
                </Avatar>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {tabValue === 0 ? sessions.length : totalNotes}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {tabValue === 0 ? 'Ready Sessions' : 'Total Notes'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={12} md={3}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'warning.main', width: 48, height: 48 }}>
                  <AccessTime />
                </Avatar>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {tabValue === 0 ? todaySessions.length : totalNotesDraft}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {tabValue === 0 ? 'Today\'s Sessions' : 'Draft Notes'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={12} md={3}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'success.main', width: 48, height: 48 }}>
                  <CheckCircle />
                </Avatar>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {tabValue === 0 ? thisWeekSessions.length : totalNotesCompleted}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {tabValue === 0 ? 'This Week' : 'Completed'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={12} md={3}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
                  <Note />
                </Avatar>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {totalSOAPNotes}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">SOAP Notes</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filter Bar */}
      {tabValue > 0 && (
        <Box sx={{ mb: 3, bgcolor: 'white', p: 3, borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <Grid container spacing={2} alignItems="center">
            {user.role !== 'therapist' && (
              <>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Therapist</InputLabel>
                    <Select
                      value={selectedTherapist}
                      onChange={e => setSelectedTherapist(e.target.value)}
                    >
                      <MenuItem value="all">All Therapists</MenuItem>
                      {therapists.map(therapist => (
                        <MenuItem key={therapist.id} value={therapist.id}>
                          {therapist.user?.firstName} {therapist.user?.lastName}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Client</InputLabel>
                    <Select
                      value={selectedClient}
                      onChange={e => setSelectedClient(e.target.value)}
                    >
                      <MenuItem value="all">All Clients</MenuItem>
                      {clients.map(client => (
                        <MenuItem key={client.id} value={client.id}>
                          {client.user?.firstName} {client.user?.lastName}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}
            <Grid item xs={12} md={user.role === 'therapist' ? 12 : 6}>
              <TextField
                fullWidth
                size="small"
                label="Search notes"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm && (
                    <IconButton onClick={() => setSearchTerm('')}>
                      <Clear />
                    </IconButton>
                  )
                }}
              />
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Content based on selected tab */}
      {tabValue === 0 ? (
        /* Ready Sessions Tab */
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Sessions Ready for Clinical Notes
          </Typography>
          <StyledTableContainer component={Paper}>
            {sessionsLoading ? (
              <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
            ) : sessions.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  No sessions ready for clinical notes at this time.
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Sessions appear here when they are confirmed, paid, and assigned to a therapist.
                </Typography>
              </Box>
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Client</TableCell>
                    {user.role !== 'therapist' && <TableCell>Therapist</TableCell>}
                    <TableCell>Date & Time</TableCell>
                    <TableCell>Service</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sessions.map(session => (
                    <TableRow key={session.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {session.Client?.firstName} {session.Client?.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {session.Client?.User?.email}
                          </Typography>
                        </Box>
                      </TableCell>
                      {user.role !== 'therapist' && (
                        <TableCell>
                          {session.Therapist?.User?.firstName} {session.Therapist?.User?.lastName}
                        </TableCell>
                      )}
                      <TableCell>
                        <Box>
                          <Typography variant="body2">
                            {format(parseISO(session.bookingStartTime), 'MMM d, yyyy')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {format(parseISO(session.bookingStartTime), 'h:mm a')} - {format(parseISO(session.bookingEndTime), 'h:mm a')}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {session.ServiceOption?.Service?.name || 'General Session'}
                      </TableCell>
                      <TableCell>
                        <SessionStatusChip
                          label={session.ClinicalNote ? 'In Progress' : 'Ready'}
                          status={session.ClinicalNote ? 'in-progress' : 'ready'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {session.ClinicalNote ? (
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleContinueNote(session)}
                            startIcon={<Edit />}
                          >
                            Continue Note
                          </Button>
                        ) : (
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => handleStartSession(session)}
                            startIcon={<Add />}
                            disabled={!isSessionDue(session.bookingStartTime)}
                            sx={{
                              ...(isSessionDue(session.bookingStartTime) ? {} : {
                                bgcolor: 'grey.300',
                                color: 'grey.600',
                                fontSize: '.2rem',
                                '&:hover': {
                                  bgcolor: 'grey.400'
                                }
                              })
                            }}
                          >
                            Start Session
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </StyledTableContainer>
        </Box>
      ) : (
        /* Clinical Notes Tabs */
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {tabValue === 1 ? 'In Progress Notes' : 'Completed Notes'}
          </Typography>
          <StyledTableContainer component={Paper}>
            {loading ? (
              <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
            ) : error ? (
              <Alert severity="error">{error}</Alert>
            ) : (
              <>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Client</TableCell>
                      {user.role !== 'therapist' && <TableCell>Therapist</TableCell>}
                      <TableCell>Date</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {notes.map(note => (
                      <TableRow key={note.id} hover>
                        <TableCell>
                          {note.client?.user?.firstName} {note.client?.user?.lastName}
                        </TableCell>
                        {user.role !== 'therapist' && (
                          <TableCell>
                            {note.therapist?.user?.firstName} {note.therapist?.user?.lastName}
                          </TableCell>
                        )}
                        <TableCell>
                          {format(parseISO(note.createdAt), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={note.subjective ? 'SOAP Note' : 'General Note'}
                            color={note.subjective ? 'primary' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <NoteStatusChip
                            label={note.completed ? 'Completed' : 'Draft'}
                            status={note.completed ? 'completed' : 'in-progress'}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="View">
                            <IconButton onClick={() => handleViewNote(note)}>
                              <Visibility />
                            </IconButton>
                          </Tooltip>
                          {canModifyNote(note) && (
                            <Tooltip title="Edit">
                              <IconButton onClick={() => handleEditNote(note)}>
                                <Edit />
                              </IconButton>
                            </Tooltip>
                          )}
                          {canDeleteNote(note) && (
                            <Tooltip title="Delete">
                              <IconButton onClick={() => handleDeleteNote(note)}>
                                <Delete />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {notes.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={user.role === 'therapist' ? 5 : 6} align="center">
                          <Box sx={{ py: 2 }}>
                            <Typography variant="body1" color="text.secondary">
                              {tabValue === 1 ? 'No in-progress notes found.' : 'No completed notes found.'}
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                <TablePagination
                  component="div"
                  count={totalNotes}
                  page={page}
                  onPageChange={handleChangePage}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  rowsPerPageOptions={[5, 10, 25, 50]}
                />
              </>
            )}
          </StyledTableContainer>
        </Box>
      )}

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} maxWidth="xs">
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this clinical note? This action cannot be undone.
          </Typography>
          {selectedNote && (
            <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="subtitle2">
                Note for {selectedNote.client?.user?.firstName} {selectedNote.client?.user?.lastName}
              </Typography>
              <Typography variant="body2">
                Created: {format(parseISO(selectedNote.createdAt), 'MMM d, yyyy')}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteModalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDelete}
            startIcon={<Delete />}
          >
            Delete Note
          </Button>
        </DialogActions>
      </Dialog>
      {/* Loading Backdrop */}
      <Backdrop open={backdrop} sx={{ zIndex: theme => theme.zIndex.drawer + 1 }}>
        <CircularProgress color="inherit" />
      </Backdrop>
    </Box>
  );
}

