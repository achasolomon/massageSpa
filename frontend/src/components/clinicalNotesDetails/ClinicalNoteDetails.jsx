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

const ClinicalNoteDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const mode = location.state?.mode || (id === 'new' ? 'create' : 'view');
  const isReadOnly = mode === 'view';
  const isNewNote = mode === 'create';

  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [saveFieldName, setSaveFieldName] = useState(null);
  const [markingsLoading, setMarkingsLoading] = useState(false);
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

  // FIXED: Fetch anatomical markings when loading existing note
  const fetchAnatomicalMarkings = useCallback(async (clinicalNoteId) => {
    if (!clinicalNoteId) return;

    setMarkingsLoading(true);
    try {
      console.log('Fetching anatomical markings for note:', clinicalNoteId);
      const response = await apiClient.get(`/anatomical-markings/${clinicalNoteId}`);
      console.log('Fetched markings:', response.data);

      if (response.data && response.data.markings) {
        setAnatomicalMarkings(response.data.markings);
        console.log('Anatomical markings loaded successfully');
      }
    } catch (err) {
      console.error('Failed to load anatomical markings:', err);
      // Don't show error to user for markings, just log it
    } finally {
      setMarkingsLoading(false);
    }
  }, []);

  // Update when markings change
  const handleMarkingsChange = useCallback((newMarkings) => {
    console.log('Markings updated in parent:', newMarkings);
    setAnatomicalMarkings(newMarkings);
  }, []);

  // FIXED: Fetch clinical note details and anatomical markings
  const fetchClinicalNote = useCallback(async () => {
    if (isNewNote) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log('Fetching clinical note:', id);
      const response = await apiClient.get(`/clinical-notes/${id}`);
      const noteData = response.data;

      setNote(noteData);
      setFormData({
        bookingId: noteData.bookingId || '',
        subjective: noteData.subjective || '',
        objective: noteData.objective || '',
        assessment: noteData.assessment || '',
        plan: noteData.plan || '',
        generalNotes: noteData.generalNotes || '',
      });

      // CRITICAL FIX: Fetch anatomical markings for existing notes
      await fetchAnatomicalMarkings(noteData.id);

    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load clinical note.');
    } finally {
      setLoading(false);
    }
  }, [id, isNewNote, fetchAnatomicalMarkings]);

  useEffect(() => {
    fetchClinicalNote();
  }, [fetchClinicalNote]);

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

  // FIXED: Improved save function with better error handling and anatomical markings sync
  const handleManualSave = async () => {
    if (!formData.assessment || formData.assessment.trim().length < 10) {
      setError('Assessment is required and must be at least 10 characters');
      return;
    }

    console.log('Starting save process...');
    setIsSaving(true);
    setSaveStatus('saving');
    setError(null);

    try {
      if (isNewNote) {
        console.log('Creating new completed note...');

        if (!booking?.therapistId || !booking?.clientId) {
          throw new Error('Missing booking information');
        }

        const payload = {
          clinicalNoteData: {
            ...formData,
            therapistId: booking.therapistId,
            clientId: booking.clientId,
            bookingId: bookingId || formData.bookingId,
          },
          anatomicalMarkings
        };

        console.log('Creating note with payload:', payload);
        const response = await apiClient.post('/clinical-notes/complete', payload);
        console.log('Note creation response:', response.data);

        if (response.data.success) {
          console.log('New note created successfully, navigating...');
          // FIXED: Clear states before navigation
          setIsSaving(false);
          setSaveStatus('success');

          // Navigate with replace to prevent back issues
          navigate(`/admin/clinical-notes/${response.data.note.id}`, {
            state: {
              mode: 'view',
              refresh: true,
              successMessage: `Session completed successfully with ${response.data.markingsCreated} anatomical markings`
            },
            replace: true
          });
          return; // Exit early
        }
      } else {
        console.log('Updating and completing existing note...');

        // Step 1: Update clinical note data
        console.log('Updating note fields...');
        await apiClient.put(`/clinical-notes/${note.id}`, formData);
        console.log('Note fields updated');

        // Step 2: Sync anatomical markings
        console.log('Syncing anatomical markings...');
        await apiClient.post(`/anatomical-markings/${note.id}/bulk-sync`, {
          markings: anatomicalMarkings
        });
        console.log('Anatomical markings synced');

        // Step 3: Mark as completed
        console.log('Marking note as completed...');
        const completionResponse = await apiClient.patch(`/clinical-notes/${note.id}/complete`);
        console.log('Completion response:', completionResponse.data);

        if (completionResponse.data.success) {
          console.log('Note completed successfully, navigating...');
          // FIXED: Clear states before navigation
          setIsSaving(false);
          setSaveStatus('success');

          // Navigate to view mode
          navigate(`/admin/clinical-notes/${note.id}`, {
            state: {
              mode: 'view',
              refresh: true,
              successMessage: 'Session completed successfully'
            },
            replace: true
          });
          return; // Exit early
        }
      }
    } catch (err) {
      console.error('Save operation failed:', err);

      // FIXED: Always clear saving state on error
      setIsSaving(false);
      setSaveStatus('error');

      const errorMessage = err.response?.data?.message ||
        err.message ||
        'Failed to complete session';

      console.error('Error message:', errorMessage);
      setError(errorMessage);
    }

    // FIXED: Failsafe - ensure saving state is cleared
    setTimeout(() => {
      if (isSaving) {
        console.log('Failsafe: Clearing stuck saving state');
        setIsSaving(false);
        setSaveStatus(null);
      }
    }, 1000);
  };

  // useEffect to prevent memory leaks and handle component unmount
  useEffect(() => {
    return () => {
      console.log('Component unmounting, clearing states');
      setIsSaving(false);
      setSaveStatus(null);
      setError(null);
    };
  }, []);

  //useEffect to handle navigation state changes
  useEffect(() => {
    // If we have a success message from navigation, show it briefly
    if (location.state?.successMessage) {
      setSaveStatus('success');
      setTimeout(() => {
        setSaveStatus(null);
        // Clear the state to prevent it from showing again
        window.history.replaceState({}, document.title);
      }, 3000);
    }
  }, [location.state]);


  
// FIXED: Better button state management
const getButtonProps = () => {
  if (note?.completed) {
    return {
      text: 'Session Completed',
      disabled: true,
      color: 'success',
      icon: <CheckCircleOutline />
    };
  }
  
  if (isSaving) {
    return {
      text: 'Completing Session...',
      disabled: true,
      color: 'primary',
      icon: <CircularProgress size={16} />
    };
  }
  
  const hasValidAssessment = formData.assessment && formData.assessment.trim().length >= 10;
  
  return {
    text: 'Complete Session',
    disabled: !hasValidAssessment,
    color: 'primary',
    icon: <Save />
  };
};

// In your JSX, update the button:
const buttonProps = getButtonProps();

{!isReadOnly && (
  <ActionButton
    variant="contained"
    startIcon={buttonProps.icon}
    onClick={handleManualSave}
    disabled={buttonProps.disabled}
    color={buttonProps.color}
    fullWidth={isMobile}
  >
    {buttonProps.text}
  </ActionButton>
)}

  // FIXED: Update the button text and disabled state logic
  const getButtonText = () => {
    if (isSaving) return 'Completing...';
    if (isNewNote) return 'Complete Session';
    if (note?.completed) return 'Session Completed';
    return 'Complete Session';
  };

  const isButtonDisabled = () => {
    if (isSaving) return true;
    if (note?.completed) return true;
    if (!formData.assessment || formData.assessment.trim().length < 10) return true;
    return false;
  };

  // In the JSX, update the button:
  {
    !isReadOnly && (
      <ActionButton
        variant="contained"
        startIcon={isSaving ? <CircularProgress size={16} /> : <Save />}
        onClick={handleManualSave}
        disabled={isButtonDisabled()}
        fullWidth={isMobile}
        color={note?.completed ? 'success' : 'primary'}
      >
        {getButtonText()}
      </ActionButton>
    )
  }

  const handleBack = () => {
    navigate('/admin/clinical-notes', { state: { refresh: true } });
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
          {markingsLoading && (
            <Typography variant="body2" color="text.secondary">
              Loading anatomical markings...
            </Typography>
          )}
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
              {markingsLoading && (
                <CircularProgress size={20} sx={{ ml: 2 }} />
              )}
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