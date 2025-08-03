import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Typography, Button, Paper, CircularProgress, Alert, Grid,
  IconButton, Breadcrumbs, Link, Card, CardContent, Divider,
  Chip, Stack, Container, Fade, alpha, useTheme, useMediaQuery
} from '@mui/material';
import {
  ArrowBack, Save, CheckCircleOutline, ErrorOutline,
  PlayArrow, History, Assignment, Notes, Person, CalendarToday
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import apiClient from '../../services/apiClient';
import { useAuth } from '../../hooks/useAuth';
import AnatomicalModel from './AnatomicalModel';
import RealTimeTextField from './RealTimeTextField';

// Enhanced styled components with better responsive design
const ModernContainer = styled(Container)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
  minHeight: '100vh',
  paddingTop: theme.spacing(2),
  paddingBottom: theme.spacing(3),
  [theme.breakpoints.up('md')]: {
    paddingTop: theme.spacing(3),
  },
}));

const HeaderCard = styled(Card)(({ theme }) => ({
  borderRadius: theme.spacing(2),
  boxShadow: `0 4px 20px ${alpha(theme.palette.common.black, 0.08)}`,
  background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
  marginBottom: theme.spacing(3),
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  overflow: 'hidden',
}));

const SectionCard = styled(Card)(({ theme }) => ({
  borderRadius: theme.spacing(2),
  boxShadow: `0 2px 12px ${alpha(theme.palette.common.black, 0.06)}`,
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
  background: theme.palette.background.paper,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  '&:hover': {
    boxShadow: `0 8px 24px ${alpha(theme.palette.common.black, 0.12)}`,
    transform: 'translateY(-2px)',
  },
}));

const ActionButton = styled(Button)(({ theme }) => ({
  borderRadius: theme.spacing(3),
  textTransform: 'none',
  fontWeight: 600,
  padding: theme.spacing(1.5, 3),
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.2)}`,
  '&:hover': {
    boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.3)}`,
    transform: 'translateY(-1px)',
  },
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(1, 2),
    fontSize: '0.875rem',
  },
}));

const StatusChip = styled(Chip)(({ theme, status }) => ({
  borderRadius: theme.spacing(2),
  fontWeight: 600,
  padding: theme.spacing(0.5, 1),
  '& .MuiChip-icon': {
    fontSize: '1rem',
  },
  ...(status === 'success' && {
    backgroundColor: alpha(theme.palette.success.main, 0.1),
    color: theme.palette.success.main,
    border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
  }),
  ...(status === 'saving' && {
    backgroundColor: alpha(theme.palette.primary.main, 0.1),
    color: theme.palette.primary.main,
    border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
  }),
  ...(status === 'error' && {
    backgroundColor: alpha(theme.palette.error.main, 0.1),
    color: theme.palette.error.main,
    border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
  }),
}));

const FormSection = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  '& .MuiTypography-h6': {
    fontWeight: 700,
    color: theme.palette.text.primary,
    marginBottom: theme.spacing(2),
    fontSize: '1.1rem',
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    '&::before': {
      content: '""',
      width: 4,
      height: 20,
      backgroundColor: theme.palette.primary.main,
      borderRadius: 2,
      flexShrink: 0,
    },
  },
}));

const BackButton = styled(Button)(({ theme }) => ({
  borderRadius: theme.spacing(1.5),
  textTransform: 'none',
  fontWeight: 500,
  color: theme.palette.text.secondary,
  border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.04),
    borderColor: alpha(theme.palette.primary.main, 0.2),
    color: theme.palette.primary.main,
  },
}));

const PatientInfoCard = styled(Card)(({ theme }) => ({
  borderRadius: theme.spacing(2),
  background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.05)} 0%, ${alpha(theme.palette.info.main, 0.02)} 100%)`,
  border: `1px solid ${alpha(theme.palette.info.main, 0.1)}`,
  marginBottom: theme.spacing(2),
}));

const ResponsiveGrid = styled(Grid)(({ theme }) => ({
  [theme.breakpoints.down('lg')]: {
    '& .MuiGrid-item': {
      paddingLeft: theme.spacing(1),
      paddingRight: theme.spacing(1),
    },
  },
}));

const ClinicalNoteDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));

  const mode = location.state?.mode || (id === 'new' ? 'create' : 'view');
  const isReadOnly = mode === 'view';
  const isNewNote = mode === 'create';

  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [saveFieldName, setSaveFieldName] = useState(null);
  const [bookings, setBookings] = useState([]);
  const { bookingId, booking } = location.state || {};
  const { therapistId, therapist } = location.state || {};
  const [formData, setFormData] = useState({
    therapistId: booking?.therapistId || therapistId,
    bookingId: bookingId,
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    notes: ''
  });

  const [anatomicalMarkings, setAnatomicalMarkings] = useState({
    anterior: [],
    posterior: [],
    lateral_left: [],
    lateral_right: [],
    skeletal: []
  });

  // Update when markings change
  const handleMarkingsChange = (newMarkings) => {
    setAnatomicalMarkings(newMarkings);
    // console.log('Markings updated in parent:', newMarkings); // Debug log
  };

  // Fetch clinical note details
  const fetchClinicalNote = useCallback(async () => {
    if (isNewNote) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(`/clinical-notes/${id}`);
      setNote(response.data);
      setFormData({
        bookingId: response.data.bookingId || '',
        subjective: response.data.subjective || '',
        objective: response.data.objective || '',
        assessment: response.data.assessment || '',
        plan: response.data.plan || '',
        generalNotes: response.data.generalNotes || '',
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load clinical note.');
    } finally {
      setLoading(false);
    }
  }, [id, isNewNote]);

  // Fetch therapist's bookings for note creation
  const fetchTherapistBookings = useCallback(async () => {
    if (!isNewNote || user.role !== 'therapist') return;

    try {
      const response = await apiClient.get(`/bookings/therapist/${user.id}?status=Confirmed`);
      setBookings(response.data.bookings || []);
    } catch (err) {
      console.error("Failed to load therapist bookings:", err);
    }
  }, [isNewNote, user.role, user.id]);

  useEffect(() => {
    fetchClinicalNote();
    fetchTherapistBookings();
  }, [fetchClinicalNote, fetchTherapistBookings]);

  useEffect(() => {
    if (booking?.therapistId && !formData.therapistId) {
      setFormData(prev => ({
        ...prev,
        therapistId: booking.therapistId
      }));
    }
  }, [booking?.therapistId, formData.therapistId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleFieldSave = async (name, value) => {
    if (!note && !isNewNote) return;

    setSaveFieldName(name);
    setIsSaving(true);
    setSaveStatus('saving');

    try {
      if (isNewNote) {
        setFormData(prev => ({ ...prev, [name]: value }));
        setSaveStatus('success');
      } else {
        await apiClient.patch(`/clinical-notes/${note.id}/auto-save`, {
          [name]: value
        });
        setSaveStatus('success');
      }
    } catch (err) {
      console.error('Auto-save failed:', err);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
      setTimeout(() => {
        setSaveStatus(null);
        setSaveFieldName(null);
      }, 2000);
    }
  };

  const handleManualSave = async () => {
    if (!formData.assessment || formData.assessment.trim().length < 10) {
      setError('Assessment is required and must be at least 10 characters');
      return;
    }

    setIsSaving(true);
    setSaveStatus('saving');
    setError(null);

    try {
      if (isNewNote) {
        // console.log('Saving new note with markings:', anatomicalMarkings);
        // console.log('Form data before save:', formData);
        // console.log('User data:', user);
        // console.log('Booking data:', booking);

        // Ensure we have all required data
        if (!booking?.therapistId) {
          throw new Error('Therapist ID is missing from booking data');
        }

        if (!booking?.clientId) {
          throw new Error('Client ID is missing from booking data');
        }

        const payload = {
          clinicalNoteData: {
            ...formData,
            therapistId: booking.therapistId, // Use the therapistId from booking, not current user
            clientId: booking.clientId,
            bookingId: bookingId || formData.bookingId
          },
          anatomicalMarkings
        };

        // console.log('Payload being sent:', payload);

        const response = await apiClient.post('/clinical-notes/complete', payload);

        // console.log('Save response:', response.data);

        if (response.data.success) {
          navigate(`/admin/clinical-notes/${response.data.note.id}`, {
            state: {
              mode: 'view',
              refresh: true,
              successMessage: `Clinical note created successfully with ${response.data.markingsCreated} markings`
            }
          });
        }
      } else {
        // For existing notes - update clinical note first
        await apiClient.put(`/clinical-notes/${note.id}`, formData);

        // Then sync anatomical markings
        const markingsResponse = await apiClient.post(
          `/anatomical-markings/${note.id}/bulk-sync`,
          { markings: anatomicalMarkings }
        );

        setSaveStatus('success');

        // Optional: Refresh data after successful update
        fetchClinicalNote();
      }
    } catch (err) {
      console.error('Save failed:', err);
      setSaveStatus('error');

      // Enhanced error handling
      const errorMessage = err.response?.data?.message ||
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to save clinical note';

      setError(errorMessage);

      // Specific handling for validation errors
      if (err.response?.data?.errors) {
        setError(err.response.data.errors.join(', '));
      }
    } finally {
      setIsSaving(false);

      // Clear status after delay for existing notes
      if (!isNewNote) {
        setTimeout(() => setSaveStatus(null), 2000);
      }
    }
  };
  const handleBack = () => {
    navigate('/admin/clinical-notes', { state: { refresh: true } });
  };

  const canModifyNote = (note) => {
    if (!note || !user) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'staff') return true;
    if (user.role === 'therapist') {
      return note.therapistId === user.id;
    }
    return false;
  };

  if (loading) {
    return (
      <ModernContainer maxWidth="xl">
        <Box sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '60vh',
          flexDirection: 'column',
          gap: 3
        }}>
          <CircularProgress size={48} thickness={4} />
          <Typography variant="h6" color="text.secondary" fontWeight={500}>
            Loading Clinical Note...
          </Typography>
        </Box>
      </ModernContainer>
    );
  }

  if (error && !isNewNote) {
    return (
      <ModernContainer maxWidth="xl">
        <Alert
          severity="error"
          sx={{
            borderRadius: 2,
            boxShadow: `0 2px 12px ${alpha(theme.palette.error.main, 0.15)}`,
          }}
        >
          {error}
        </Alert>
      </ModernContainer>
    );
  }

  return (
    <ModernContainer maxWidth="xl">
      {/* Enhanced Header Section */}
      <HeaderCard>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Box sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2
          }}>
            <Box sx={{ flex: 1 }}>
              <BackButton
                startIcon={<ArrowBack />}
                onClick={handleBack}
                size="small"
                sx={{ mb: 2 }}
              >
                Back to Notes
              </BackButton>
              <Typography variant={isMobile ? "h5" : "h4"} fontWeight={700} color="text.primary">
                {isNewNote ? 'New Clinical Note' : 'Clinical Note'}
              </Typography>
              {note && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Created {new Date(note.createdAt).toLocaleDateString()} •
                  Last updated {new Date(note.updatedAt).toLocaleDateString()}
                </Typography>
              )}
            </Box>

            <Stack
              direction={isMobile ? "column" : "row"}
              spacing={2}
              alignItems="center"
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              {saveStatus === 'saving' && (
                <StatusChip
                  status="saving"
                  icon={<CircularProgress size={16} />}
                  label="Saving..."
                />
              )}
              {saveStatus === 'success' && (
                <StatusChip
                  status="success"
                  icon={<CheckCircleOutline />}
                  label="Saved"
                />
              )}
              {saveStatus === 'error' && (
                <StatusChip
                  status="error"
                  icon={<ErrorOutline />}
                  label="Error"
                />
              )}

              {!isReadOnly && (
                <ActionButton
                  variant="contained"
                  startIcon={<Save />}
                  onClick={handleManualSave}
                  disabled={isSaving}
                  fullWidth={isMobile}
                >
                  Complete Session
                </ActionButton>
              )}
            </Stack>
          </Box>
        </CardContent>
      </HeaderCard>

      {error && (
        <Fade in={!!error}>
          <Alert
            severity="error"
            sx={{
              mb: 3,
              borderRadius: 2,
              boxShadow: `0 2px 12px ${alpha(theme.palette.error.main, 0.15)}`,
            }}
          >
            {error}
          </Alert>
        </Fade>
      )}

      {/* Enhanced Main Content - Improved Responsive Layout */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Anatomical markings */}
        <SectionCard>
          <CardContent sx={{ p: { xs: 2, md: 3 }, flexGrow: 1 }}>
            <Typography variant="h5" fontWeight={700} gutterBottom sx={{ mb: 3 }}>
              Anatomical Markings
            </Typography>

            <Box sx={{
              height: { xs: '400px', md: '600px', lg: '50%' },
              display: 'flex',
              flexDirection: 'column'
            }}>
              <AnatomicalModel
                clinicalNoteId={note?.id}
                readOnly={isReadOnly}
                initialMarkings={anatomicalMarkings}
                onMarkingsChange={handleMarkingsChange}
                sx={{ flexGrow: 1 }}
              />
            </Box>
          </CardContent>
        </SectionCard>
        <SectionCard>
          <CardContent sx={{ p: { xs: 2, md: 3 }, flexGrow: 1 }}>
            <Typography variant="h5" fontWeight={700} gutterBottom sx={{ mb: 3 }}>
              Clinical Assessment
            </Typography>

            {/* Patient Information Card */}
            {note?.patient && (
              <PatientInfoCard>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <Person color="info" />
                    <Typography variant="h6" fontWeight={600}>
                      {note.patient.firstName} {note.patient.lastName}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <CalendarToday fontSize="small" color="info" />
                    <Typography variant="body2" color="text.secondary">
                      Session: {new Date(note.sessionDate).toLocaleDateString()}
                    </Typography>
                  </Box>
                </CardContent>
              </PatientInfoCard>
            )}

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormSection>
                  <Typography variant="h6">
                    <Assignment fontSize="small" />
                    Subjective Findings
                  </Typography>
                  <RealTimeTextField
                    label="Patient's Subjective Report"
                    name="subjective"
                    multiline
                    rows={4}
                    value={formData.subjective}
                    onChange={handleChange}
                    onSave={handleFieldSave}
                    isSaving={isSaving && saveFieldName === 'subjective'}
                    disabled={isReadOnly}
                    placeholder="Document patient's reported symptoms, pain levels, and subjective experiences..."
                    showCharacterCount
                    maxLength={1500}
                    size="small"
                    fullWidth
                  />
                </FormSection>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormSection>
                  <Typography variant="h6">
                    <Assignment fontSize="small" />
                    Objective Findings
                  </Typography>
                  <RealTimeTextField
                    label="Objective Observations"
                    name="objective"
                    multiline
                    rows={4}
                    value={formData.objective}
                    onChange={handleChange}
                    onSave={handleFieldSave}
                    isSaving={isSaving && saveFieldName === 'objective'}
                    disabled={isReadOnly}
                    placeholder="Document objective observations, measurements, and clinical findings..."
                    showCharacterCount
                    maxLength={1500}
                    size="small"
                    fullWidth
                  />
                </FormSection>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormSection>
                  <Typography variant="h6">
                    <Notes fontSize="small" />
                    Assessment
                  </Typography>
                  <RealTimeTextField
                    name="assessment"
                    label="Clinical Assessment"
                    value={formData.assessment}
                    onChange={handleChange}
                    onSave={handleFieldSave}
                    multiline
                    rows={4}
                    maxLength={2000}
                    showCharacterCount
                    showLastSaved
                    required
                    validateInput={(value) => {
                      if (value.length < 10) return "Assessment must be at least 10 characters";
                      return true;
                    }}
                    placeholder="Provide detailed assessment including diagnosis, clinical reasoning, and observations..."
                    helperText="Include diagnosis, clinical reasoning, and key observations"
                    disabled={isReadOnly}
                    size="small"
                    fullWidth
                  />
                </FormSection>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormSection>
                  <Typography variant="h6">
                    <PlayArrow fontSize="small" />
                    Treatment Plan
                  </Typography>
                  <RealTimeTextField
                    label="Treatment Plan & Recommendations"
                    name="plan"
                    multiline
                    rows={4}
                    value={formData.plan}
                    onChange={handleChange}
                    onSave={handleFieldSave}
                    isSaving={isSaving && saveFieldName === 'plan'}
                    disabled={isReadOnly}
                    placeholder="Outline comprehensive treatment plan, interventions, and recommendations..."
                    showCharacterCount
                    maxLength={2000}
                    size="small"
                    fullWidth
                  />
                </FormSection>
              </Grid>

              <Grid item xs={12}>
                <FormSection>
                  <Typography variant="h6">
                    <History fontSize="small" />
                    Add Notes
                  </Typography>
                  <RealTimeTextField
                    label="General Notes & Observations"
                    name="notes"
                    multiline
                    rows={3}
                    value={formData.notes}
                    onChange={handleChange}
                    onSave={handleFieldSave}
                    isSaving={isSaving && saveFieldName === 'notes'}
                    disabled={isReadOnly}
                    placeholder="Add notes, observations, or follow-up requirements..."
                    showCharacterCount
                    maxLength={1500}
                    size="small"
                    fullWidth
                  />
                </FormSection>
              </Grid>
            </Grid>
          </CardContent>
        </SectionCard>
      </Box>
    </ModernContainer>
  );
};

export default ClinicalNoteDetailPage;

