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
import { format, parseISO, isToday, isThisWeek, formatDistanceToNow } from 'date-fns';
import apiClient from '../../../services/apiClient';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useAuth } from '../../../hooks/useAuth';
import { isAfter, startOfDay, isBefore, addMinutes, subMinutes } from 'date-fns';

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
    : status === 'overdue'
      ? alpha(theme.palette.error.main, 0.1)
      : status === 'no-show'
        ? alpha(theme.palette.grey[500], 0.1)
        : alpha(theme.palette.warning.main, 0.1),
  color: status === 'ready'
    ? theme.palette.success.main
    : status === 'overdue'
      ? theme.palette.error.main
      : status === 'no-show'
        ? theme.palette.grey[700]
        : theme.palette.warning.main,
  border: `1px solid ${status === 'ready'
    ? alpha(theme.palette.success.main, 0.2)
    : status === 'overdue'
      ? alpha(theme.palette.error.main, 0.2)
      : status === 'no-show'
        ? alpha(theme.palette.grey[500], 0.2)
        : alpha(theme.palette.warning.main, 0.2)}`,
  '& .MuiChip-label': { padding: '0 8px' },
}));

// Styled Analytics Card Container
const AnalyticsCardContainer = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  gap: theme.spacing(3),
  marginBottom: theme.spacing(4),
  [theme.breakpoints.up('sm')]: {
    gridTemplateColumns: 'repeat(2, 1fr)',
  },
  [theme.breakpoints.up('md')]: {
    gridTemplateColumns: 'repeat(4, 1fr)',
  },
}));

const StyledAnalyticsCard = styled(Card)(({ theme }) => ({
  borderRadius: 12,
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
}));

export default function ClinicalNotesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // State
  const [notes, setNotes] = useState([]);
  const [sessions, setSessions] = useState([]);
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

  // New state for no-show handling
  const [sessionsNeedingAttention, setSessionsNeedingAttention] = useState([]);
  const [noShowModalOpen, setNoShowModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [noShowReason, setNoShowReason] = useState('');
  const [markingNoShow, setMarkingNoShow] = useState(false);

  // Check if we need to refresh data
  useEffect(() => {
    if (location.state?.refresh) {
      fetchData();
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // FIXED: Updated session timing logic
  const canStartSession = (sessionDateTime) => {
    const sessionTime = new Date(sessionDateTime);
    const now = new Date();
    const sessionStart = subMinutes(sessionTime, 15); // Allow 15 minutes early
    const sessionEnd = addMinutes(sessionTime, 60); // Allow starting up to 1 hour after scheduled time

    return now >= sessionStart && now <= sessionEnd;
  };

  const isSessionOverdue = (sessionDateTime) => {
    const sessionTime = new Date(sessionDateTime);
    const now = new Date();
    const gracePeriod = addMinutes(sessionTime, 30); // 30 minutes grace period

    return now > gracePeriod;
  };

  const getSessionTimeStatus = (sessionDateTime) => {
    const sessionTime = new Date(sessionDateTime);
    const now = new Date();

    if (now < subMinutes(sessionTime, 15)) {
      return 'early'; // Too early to start
    } else if (canStartSession(sessionDateTime)) {
      return 'ready'; // Can start now
    } else if (isSessionOverdue(sessionDateTime)) {
      return 'overdue'; // Past due
    } else {
      return 'scheduled'; // Normal scheduled
    }
  };

  // FIXED: Updated fetch ready sessions function
  const fetchReadySessions = async () => {
    if (user.role !== 'therapist' && user.role !== 'admin' && user.role !== 'staff') return;

    setSessionsLoading(true);
    try {
      let params = {
        limit: 100
      };

      // FIXED: Get therapist ID properly for therapist users
      if (user.role === 'therapist') {
        try {
          const therapistProfile = await apiClient.get('/therapists/profile');
          params.therapistId = therapistProfile.data.id;
        } catch (err) {
          console.error('Failed to get therapist profile:', err);
          // Fallback to user.therapistId if available
          if (user.therapistId) {
            params.therapistId = user.therapistId;
          }
        }
      } else if (selectedTherapist !== 'all') {
        params.therapistId = selectedTherapist;
      }

      console.log('Fetching ready sessions with params:', params);

      // Use the new session management endpoint if available, fallback to old one
      let response;
      try {
        response = await apiClient.get('/session-management/ready', { params });
        setSessions(response.data.sessions || []);
      } catch (err) {
        console.log('New endpoint not available, using fallback');
        // Fallback to old endpoint
        const fallbackParams = {
          status: 'confirmed',
          paymentStatus: 'paid',
          ...params
        };
        response = await apiClient.get('/bookings/ready-for-notes', { params: fallbackParams });
        setSessions(response.data.bookings || []);
      }

      console.log('Fetched sessions:', response.data);
    } catch (err) {
      console.error("Failed to load ready sessions:", err);
      setError('Failed to load ready sessions');
    } finally {
      setSessionsLoading(false);
    }
  };

  // NEW: Fetch sessions needing attention
  const fetchSessionsNeedingAttention = async () => {
    try {
      let params = {
        page: 1,
        limit: 50
      };

      if (user.role === 'therapist') {
        try {
          const therapistProfile = await apiClient.get('/therapists/profile');
          params.therapistId = therapistProfile.data.id;
        } catch (err) {
          console.error('Failed to get therapist profile for attention sessions:', err);
        }
      } else if (selectedTherapist !== 'all') {
        params.therapistId = selectedTherapist;
      }

      console.log('Fetching sessions needing attention with params:', params);

      try {
        const response = await apiClient.get('/session-management/needing-attention', { params });
        setSessionsNeedingAttention(response.data.sessions || []);
        console.log('Sessions needing attention:', response.data.sessions);
      } catch (err) {
        console.error('Session management endpoint not available:', err);
        // Fallback: filter from regular sessions
        const overdueFromSessions = sessions.filter(session =>
          isSessionOverdue(session.bookingStartTime) && !session.ClinicalNote
        );
        setSessionsNeedingAttention(overdueFromSessions);
      }
    } catch (err) {
      console.error("Failed to load sessions needing attention:", err);
      setSessionsNeedingAttention([]);
    }
  };

  // FIXED: Updated fetch clinical notes function
  const fetchClinicalNotes = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        search: searchTerm || undefined,
        // FIXED: Proper tab filtering
        completed: tabValue === 3 ? true : tabValue === 2 ? false : undefined
      };

      // Add filters based on role and selection
      if (user.role === 'therapist') {
        // For therapists, we need to get their therapist ID
        try {
          const therapistProfile = await apiClient.get('/therapists/profile');
          params.therapistId = therapistProfile.data.id;
        } catch (err) {
          console.error('Failed to get therapist profile:', err);
          if (user.therapistId) {
            params.therapistId = user.therapistId;
          }
        }
      } else {
        if (selectedTherapist !== 'all') {
          params.therapistId = selectedTherapist;
        }
        if (selectedClient !== 'all') {
          params.clientId = selectedClient;
        }
      }

      console.log('Fetching clinical notes with params:', params);

      const endpoint = user.role === 'therapist' ? '/clinical-notes/my-notes' : '/clinical-notes';
      const response = await apiClient.get(endpoint, { params });

      console.log('Clinical notes response:', response.data);

      setNotes(response.data.notes || []);
      setTotalNotes(response.data.total || 0);
    } catch (err) {
      console.error('Error fetching clinical notes:', err);
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
    if (tabValue === 0) {
      fetchReadySessions();
    } else if (tabValue === 1) {
      fetchSessionsNeedingAttention();
    } else {
      fetchClinicalNotes();
    }
    fetchTherapistsAndClients();
  };

  useEffect(() => {
    fetchData();
  }, [page, rowsPerPage, selectedTherapist, selectedClient, searchTerm, tabValue]);

  // Also fetch sessions needing attention when ready sessions are fetched
  useEffect(() => {
    if (tabValue === 1) {
      fetchSessionsNeedingAttention();
    }
  }, [sessions, tabValue]);

  // Navigation handlers
  const handleViewNote = (note) => {
    navigate(`/admin/clinical-notes/${note.id}`, { state: { mode: 'view' } });
  };

  const handleEditNote = (note) => {
    navigate(`/admin/clinical-notes/${note.id}`, { state: { mode: 'edit' } });
  };

  const handleStartSession = (booking) => {
    // Check if session can be started
    if (!canStartSession(booking.bookingStartTime)) {
      const sessionTime = new Date(booking.bookingStartTime);
      const now = new Date();

      if (now < subMinutes(sessionTime, 15)) {
        setError(`Session cannot be started yet. You can start 15 minutes before scheduled time (${format(subMinutes(sessionTime, 15), 'h:mm a')})`);
      } else {
        setError('Session time has passed the allowed window. Please mark as no-show if client did not attend.');
      }
      return;
    }

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

  // NEW: No-show handlers
  const handleMarkNoShow = (session) => {
    setSelectedSession(session);
    setNoShowModalOpen(true);
  };

  const handleConfirmNoShow = async () => {
    if (!selectedSession) return;

    setMarkingNoShow(true);
    try {
      await apiClient.patch(`/session-management/${selectedSession.id}/no-show`, {
        reason: noShowReason.trim() || 'Client did not attend the session'
      });

      // Refresh the data
      fetchReadySessions();
      fetchSessionsNeedingAttention();
      setNoShowModalOpen(false);
      setNoShowReason('');
      setSelectedSession(null);

      // Clear any existing errors
      setError(null);
    } catch (err) {
      console.error('Failed to mark session as no-show:', err);
      setError(err.response?.data?.message || 'Failed to mark session as no-show');
    } finally {
      setMarkingNoShow(false);
    }
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
    setError(null); // Clear any errors when switching tabs
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

  // Get session status for display
  const getSessionDisplayStatus = (session) => {
    // Check if session is marked as no-show
    if (session.sessionStatus === 'no-show') return 'no-show';

    // FIXED: Check if session is completed (status or clinical note completion)
    if (session.status === 'Completed') return 'completed';

    // Check clinical note status
    if (session.ClinicalNote) {
      return session.ClinicalNote.completed ? 'completed' : 'in-progress';
    }

    // No clinical note exists yet, check timing
    const timeStatus = getSessionTimeStatus(session.bookingStartTime);
    if (timeStatus === 'overdue') return 'overdue';
    return 'ready';
  };

  const isSessionCompleted = (session) => {
    return session.status === 'Completed' ||
      (session.ClinicalNote && session.ClinicalNote.completed);
  };

  // Filter sessions for analytics
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

  // Render functions for different tabs
  const renderReadySessions = () => (
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
              {sessions.map(session => {
                const displayStatus = getSessionDisplayStatus(session);
                const canStart = canStartSession(session.bookingStartTime);
                const timeStatus = getSessionTimeStatus(session.bookingStartTime);

                // FIXED: Use the helper function to check completion
                const isCompleted = isSessionCompleted(session);

                return (
                  <TableRow key={session.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {session.Client?.firstName || session.Client?.User?.firstName} {session.Client?.lastName || session.Client?.User?.lastName}
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
                        {timeStatus === 'early' && (
                          <Typography variant="caption" color="primary" display="block">
                            Can start at {format(subMinutes(parseISO(session.bookingStartTime), 15), 'h:mm a')}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {session.ServiceOption?.Service?.name || 'General Session'}
                    </TableCell>
                    <TableCell>
                      <SessionStatusChip
                        label={
                          displayStatus === 'in-progress' ? 'In Progress' :
                            displayStatus === 'completed' ? 'Completed' :
                              displayStatus === 'overdue' ? 'Overdue' :
                                displayStatus === 'no-show' ? 'No Show' :
                                  'Ready'
                        }
                        status={displayStatus}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1}>
                        {/* FIXED: Show completed status for completed sessions */}
                        {isCompleted ? (
                          <Button
                            variant="outlined"
                            size="small"
                            color="success"
                            startIcon={<CheckCircle />}
                            disabled
                            sx={{
                              borderColor: 'success.main',
                              color: 'success.main',
                              '&.Mui-disabled': {
                                borderColor: 'success.main',
                                color: 'success.main',
                                opacity: 0.8
                              }
                            }}
                          >
                             Completed
                          </Button>
                        ) : session.ClinicalNote && !session.ClinicalNote.completed ? (
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleContinueNote(session)}
                            startIcon={<Edit />}
                          >
                            Continue Note
                          </Button>
                        ) : session.sessionStatus === 'no-show' ? (
                          <Chip label="No Show" color="default" size="small" />
                        ) : (
                          <>
                            <Button
                              variant="contained"
                              size="small"
                              onClick={() => handleStartSession(session)}
                              startIcon={<Add />}
                              disabled={!canStart}
                              sx={{
                                ...(canStart ? {} : {
                                  bgcolor: 'grey.300',
                                  color: 'grey.600',
                                  '&:hover': {
                                    bgcolor: 'grey.400'
                                  }
                                })
                              }}
                            >
                              {timeStatus === 'early' ? 'Too Early' :
                                timeStatus === 'overdue' ? 'Start Late' : 'Start Session'}
                            </Button>
                            {isSessionOverdue(session.bookingStartTime) && (
                              <Button
                                variant="outlined"
                                size="small"
                                color="error"
                                onClick={() => handleMarkNoShow(session)}
                                startIcon={<Warning />}
                              >
                                Mark No-Show
                              </Button>
                            )}
                          </>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </StyledTableContainer>
    </Box>
  );

  const renderSessionsNeedingAttention = () => (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Sessions Needing Attention
      </Typography>
      <StyledTableContainer component={Paper}>
        {sessionsNeedingAttention.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              No sessions need attention at this time.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Past due sessions and overdue appointments will appear here.
            </Typography>
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Client</TableCell>
                {user.role !== 'therapist' && <TableCell>Therapist</TableCell>}
                <TableCell>Scheduled Time</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Time Since</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sessionsNeedingAttention.map(session => (
                <TableRow key={session.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {session.Client?.User?.firstName || session.Client?.firstName} {session.Client?.User?.lastName || session.Client?.lastName}
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
                        {format(parseISO(session.bookingStartTime), 'h:mm a')}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={session.sessionStatus === 'scheduled' ? 'Overdue' : session.sessionStatus}
                      color={session.sessionStatus === 'scheduled' ? 'error' : 'warning'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {formatDistanceToNow(parseISO(session.bookingStartTime), { addSuffix: true })}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1}>
                      {session.sessionStatus !== 'no-show' && (
                        <Button
                          variant="outlined"
                          size="small"
                          color="error"
                          onClick={() => handleMarkNoShow(session)}
                          startIcon={<Warning />}
                        >
                          Mark No-Show
                        </Button>
                      )}
                      {session.sessionStatus === 'scheduled' && (
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => handleStartSession(session)}
                          startIcon={<Add />}
                        >
                          Start Late
                        </Button>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </StyledTableContainer>
    </Box>
  );

const renderClinicalNotesTable = () => (
  <Box>
    <Typography variant="h6" sx={{ mb: 2 }}>
      {tabValue === 2 ? 'In Progress Notes' : 'Completed Notes'}
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
                    {/* FIXED: Use correct property names with capital letters */}
                    {note.Client?.User?.firstName || note.Client?.firstName} {note.Client?.User?.lastName || note.Client?.lastName}
                  </TableCell>
                  {user.role !== 'therapist' && (
                    <TableCell>
                      {/* FIXED: Use correct property names with capital letters */}
                      {note.Therapist?.User?.firstName || note.Therapist?.firstName} {note.Therapist?.User?.lastName || note.Therapist?.lastName}
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
                      label={note.completed ? 'Completed' : 'In Progress'}
                      status={note.completed ? 'completed' : 'in-progress'}
                    />
                    {note.completedAt && (
                      <Typography variant="caption" display="block" color="text.secondary">
                        Completed: {format(parseISO(note.completedAt), 'MMM d, h:mm a')}
                      </Typography>
                    )}
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
                        {tabValue === 2 ? 'No in-progress notes found.' : 'No completed notes found.'}
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
);

  // Main render function that determines which content to show
  const renderTabContent = () => {
    if (tabValue === 0) {
      return renderReadySessions();
    } else if (tabValue === 1) {
      return renderSessionsNeedingAttention();
    } else {
      return renderClinicalNotesTable();
    }
  };

  // No-Show Confirmation Modal
  const NoShowModal = () => (
    <Dialog open={noShowModalOpen} onClose={() => setNoShowModalOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Mark Session as No-Show</DialogTitle>
      <DialogContent>
        {selectedSession && (
          <Box>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Are you sure you want to mark this session as a no-show?
            </Typography>
            <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1, mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Session Details:
              </Typography>
              <Typography variant="body2">
                Client: {selectedSession.Client?.User?.firstName || selectedSession.Client?.firstName} {selectedSession.Client?.User?.lastName || selectedSession.Client?.lastName}
              </Typography>
              <Typography variant="body2">
                Date: {format(parseISO(selectedSession.bookingStartTime), 'MMM d, yyyy h:mm a')}
              </Typography>
              <Typography variant="body2">
                Therapist: {selectedSession.Therapist?.User?.firstName} {selectedSession.Therapist?.User?.lastName}
              </Typography>
            </Box>
            <TextField
              fullWidth
              label="Reason (optional)"
              multiline
              rows={3}
              value={noShowReason}
              onChange={(e) => setNoShowReason(e.target.value)}
              placeholder="e.g., Client did not attend, no prior notice given..."
              sx={{ mb: 2 }}
            />
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Note:</strong> Marking as no-show will:
              </Typography>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                <li>Remove this session from the ready sessions list</li>
                <li>Update the session status to "no-show"</li>
                <li>Record the timestamp and reason</li>
                <li>This action can be reversed by administrators if needed</li>
              </ul>
            </Alert>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setNoShowModalOpen(false)} disabled={markingNoShow}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleConfirmNoShow}
          disabled={markingNoShow}
          startIcon={markingNoShow ? <CircularProgress size={16} /> : <Warning />}
        >
          {markingNoShow ? 'Marking...' : 'Mark as No-Show'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Updated tabs with 4 tabs including sessions needing attention
  const updatedTabs = (
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
              <Chip label={sessions.length} size="small" color="primary" />
            )}
          </Box>
        }
      />
      <Tab
        label={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Warning />
            Need Attention
            {sessionsNeedingAttention.length > 0 && (
              <Chip label={sessionsNeedingAttention.length} size="small" color="warning" />
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
              <Chip label={totalNotesDraft} size="small" color="warning" />
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
              <Chip label={totalNotesCompleted} size="small" color="success" />
            )}
          </Box>
        }
      />
    </Tabs>
  );

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

      {/* Display any errors */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Updated Tabs */}
      <Box sx={{ mb: 3 }}>
        {updatedTabs}
      </Box>

      {/* Analytics Cards - Fixed Layout */}
      <AnalyticsCardContainer>
        <StyledAnalyticsCard>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'info.main', width: 48, height: 48 }}>
                <Schedule />
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                  {tabValue === 0 ? sessions.length :
                    tabValue === 1 ? sessionsNeedingAttention.length : totalNotes}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                  {tabValue === 0 ? 'Ready Sessions' :
                    tabValue === 1 ? 'Need Attention' : 'Total Notes'}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </StyledAnalyticsCard>

        <StyledAnalyticsCard>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'warning.main', width: 48, height: 48 }}>
                <AccessTime />
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                  {tabValue === 0 ? todaySessions.length : totalNotesDraft}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                  {tabValue === 0 ? "Today's Sessions" : 'Draft Notes'}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </StyledAnalyticsCard>

        <StyledAnalyticsCard>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'success.main', width: 48, height: 48 }}>
                <CheckCircle />
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                  {tabValue === 0 ? thisWeekSessions.length : totalNotesCompleted}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                  {tabValue === 0 ? 'This Week' : 'Completed'}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </StyledAnalyticsCard>

        <StyledAnalyticsCard>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
                <Note />
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                  {totalSOAPNotes}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                  SOAP Notes
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </StyledAnalyticsCard>
      </AnalyticsCardContainer>

      {/* Search and Filter Bar - Only show for notes tabs */}
      {tabValue > 1 && (
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

      {/* Main Content */}
      {renderTabContent()}

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

      {/* No-Show Modal */}
      <NoShowModal />

      {/* Loading Backdrop */}
      <Backdrop open={backdrop} sx={{ zIndex: theme => theme.zIndex.drawer + 1 }}>
        <CircularProgress color="inherit" />
      </Backdrop>
    </Box>
  );
}