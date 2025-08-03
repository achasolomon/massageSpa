  import React, { useState, useEffect, useRef, useCallback } from 'react';
  import { 
    TextField, 
    CircularProgress, 
    Box, 
    Chip,
    Tooltip,
    IconButton,
    Fade,
    Typography,
    Alert,
    Collapse,
    useTheme,
    useMediaQuery,
    Snackbar
  } from '@mui/material';
  import { 
    CheckCircleOutline, 
    ErrorOutline, 
    Schedule,
    Edit,
    Save,
    Refresh,
    Warning,
    Info
  } from '@mui/icons-material';
  import { styled } from '@mui/material/styles';
  import { debounce } from 'lodash';

  // Enhanced styled components with better visibility
  const StyledTextField = styled(TextField)(({ theme, issaving, haserror, haschanges }) => ({
    '& .MuiOutlinedInput-root': {
      position: 'relative',
      transition: 'all 0.3s ease',
      ...(issaving === 'true' && {
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: theme.palette.primary.main,
          borderWidth: '2px',
        }
      }),
      ...(haserror === 'true' && {
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: theme.palette.error.main,
          borderWidth: '2px',
        }
      }),
      ...(haschanges === 'true' && {
        backgroundColor: theme.palette.action.hover,
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: theme.palette.warning.main,
          borderWidth: '1px',
          borderStyle: 'dashed',
        }
      }),
    },
    '& .MuiInputLabel-root': {
      ...(issaving === 'true' && {
        color: theme.palette.primary.main,
      }),
      ...(haserror === 'true' && {
        color: theme.palette.error.main,
      }),
    }
  }));

  const StatusContainer = styled(Box)(({ theme }) => ({
    position: 'absolute',
    right: 8,
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    zIndex: 10,
    pointerEvents: 'auto', // Changed from 'none' to allow interactions
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.spacing(1),
    padding: theme.spacing(0.5),
    boxShadow: theme.shadows[2],
  }));

  const StatusIndicator = styled(Box)(({ theme, status }) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    padding: theme.spacing(0.5),
    minWidth: 24,
    minHeight: 24,
    cursor: status === 'error' || status === 'pending' ? 'pointer' : 'default',
    transition: 'all 0.2s ease',
    '&:hover': {
      ...(status === 'error' || status === 'pending') && {
        transform: 'scale(1.1)',
      }
    },
    ...(status === 'success' && {
      color: theme.palette.success.main,
      backgroundColor: theme.palette.success.light + '20',
    }),
    ...(status === 'error' && {
      color: theme.palette.error.main,
      backgroundColor: theme.palette.error.light + '20',
    }),
    ...(status === 'saving' && {
      color: theme.palette.primary.main,
      backgroundColor: theme.palette.primary.light + '20',
    }),
    ...(status === 'pending' && {
      color: theme.palette.warning.main,
      backgroundColor: theme.palette.warning.light + '20',
    })
  }));

  const CharacterCounter = styled(Typography)(({ theme, isoverlimit }) => ({
    fontSize: '0.75rem',
    color: isoverlimit ? theme.palette.error.main : theme.palette.text.secondary,
    textAlign: 'right',
    marginTop: theme.spacing(0.5),
    fontWeight: isoverlimit ? 600 : 400,
  }));

  const LastSavedInfo = styled(Typography)(({ theme }) => ({
    fontSize: '0.7rem',
    color: theme.palette.text.secondary,
    fontStyle: 'italic',
    marginTop: theme.spacing(0.5),
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
  }));

  const StatusChip = styled(Chip)(({ theme, status }) => ({
    fontSize: '0.75rem',
    height: 24,
    '& .MuiChip-icon': {
      fontSize: '0.875rem',
    },
    ...(status === 'unsaved' && {
      backgroundColor: theme.palette.warning.light + '30',
      color: theme.palette.warning.dark,
      border: `1px solid ${theme.palette.warning.main}`,
    }),
    ...(status === 'error' && {
      backgroundColor: theme.palette.error.light + '30',
      color: theme.palette.error.dark,
      border: `1px solid ${theme.palette.error.main}`,
    }),
  }));

  const RealTimeTextField = ({
    name,
    value = '',
    onChange,
    onSave,
    isSaving = false,
    disabled = false,
    debounceTime = 1000,
    maxLength,
    showCharacterCount = false,
    showLastSaved = false,
    showSaveStatus = true,
    allowRetry = true,
    validateInput,
    placeholder,
    helperText,
    required = false,
    autoFocus = false,
    ...props
  }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    
    // Core state
    const [localValue, setLocalValue] = useState(value);
    const [saveStatus, setSaveStatus] = useState(null); // 'saving', 'success', 'error', 'pending'
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [lastSavedAt, setLastSavedAt] = useState(null);
    const [validationError, setValidationError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [showSnackbar, setShowSnackbar] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    
    // Refs
    const isFirstRender = useRef(true);
    const lastSavedValue = useRef(value);
    const inputRef = useRef(null);

    // Update local value when prop value changes
    useEffect(() => {
      if (value !== localValue) {
        setLocalValue(value);
        lastSavedValue.current = value;
        setHasUnsavedChanges(false);
        
        // Clear validation error if value is externally updated
        if (validationError) {
          setValidationError(null);
        }
      }
    }, [value, localValue, validationError]);

    // Validation function
    const validateValue = useCallback((val) => {
      if (validateInput && typeof validateInput === 'function') {
        try {
          const result = validateInput(val);
          return result === true ? null : result;
        } catch (error) {
          return error.message || 'Validation error';
        }
      }
      
      // Basic validation
      if (required && (!val || val.trim().length === 0)) {
        return 'This field is required';
      }
      
      if (maxLength && val.length > maxLength) {
        return `Maximum ${maxLength} characters allowed`;
      }
      
      return null;
    }, [validateInput, required, maxLength]);

    // Enhanced save function with retry logic and better feedback
    const performSave = useCallback(async (fieldName, fieldValue, attempt = 1) => {
      try {
        setSaveStatus('saving');
        
        if (onSave) {
          await onSave(fieldName, fieldValue);
        }
        
        setSaveStatus('success');
        setLastSavedAt(new Date());
        setHasUnsavedChanges(false);
        setRetryCount(0);
        lastSavedValue.current = fieldValue;
        
        // Show success feedback
        setSnackbarMessage('Changes saved successfully');
        setShowSnackbar(true);
        
        // Clear success status after delay
        setTimeout(() => {
          setSaveStatus(null);
        }, 2000);
        
      } catch (error) {
        console.error('Save failed:', error);
        setSaveStatus('error');
        
        // Show error feedback
        setSnackbarMessage(`Save failed: ${error.message || 'Unknown error'}`);
        setShowSnackbar(true);
        
        // Retry logic
        if (allowRetry && attempt < 3) {
          setRetryCount(attempt);
          setTimeout(() => {
            performSave(fieldName, fieldValue, attempt + 1);
          }, 1000 * attempt); // Exponential backoff
        } else {
          // Clear error status after longer delay
          setTimeout(() => {
            setSaveStatus(null);
          }, 5000);
        }
      }
    }, [onSave, allowRetry]);

    // Create debounced save function
    const debouncedSave = useRef(
      debounce((fieldName, fieldValue) => {
        // Only save if validation passes
        const validationErr = validateValue(fieldValue);
        if (!validationErr) {
          performSave(fieldName, fieldValue);
        }
      }, debounceTime)
    ).current;

    // Handle input change
    const handleChange = (e) => {
      const newValue = e.target.value;
      
      // Check character limit
      if (maxLength && newValue.length > maxLength) {
        return; // Prevent input beyond max length
      }
      
      setLocalValue(newValue);
      setHasUnsavedChanges(newValue !== lastSavedValue.current);
      
      // Validate input
      const validationErr = validateValue(newValue);
      setValidationError(validationErr);
      
      // Set pending status if no validation errors
      if (!validationErr && newValue !== lastSavedValue.current) {
        setSaveStatus('pending');
      }
      
      // Call parent onChange
      if (onChange) {
        onChange({
          ...e,
          target: {
            ...e.target,
            name,
            value: newValue
          }
        });
      }
      
      // Only trigger save if validation passes
      if (!validationErr) {
        debouncedSave(name, newValue);
      }
    };

    // Manual save function
    const handleManualSave = () => {
      debouncedSave.cancel();
      const validationErr = validateValue(localValue);
      if (!validationErr) {
        performSave(name, localValue);
      }
    };

    // Manual retry function
    const handleRetry = () => {
      setSaveStatus(null);
      handleManualSave();
    };

    // Focus handling
    const handleFocus = () => {
      if (autoFocus && inputRef.current) {
        inputRef.current.focus();
      }
    };

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        debouncedSave.cancel();
      };
    }, [debouncedSave]);

    // Skip auto-save on first render
    useEffect(() => {
      if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
      }
    }, []);

    // Auto-focus effect
    useEffect(() => {
      if (autoFocus && inputRef.current) {
        inputRef.current.focus();
      }
    }, [autoFocus]);

    // Calculate character count info
    const characterCount = localValue.length;
    const isOverLimit = maxLength && characterCount > maxLength;
    const charactersRemaining = maxLength ? maxLength - characterCount : null;

    // Determine effective helper text
    const effectiveHelperText = validationError || helperText;

    // Enhanced status icon component with better visibility
    const StatusIcon = () => {
      if (isSaving || saveStatus === 'saving') {
        return (
          <Tooltip title={retryCount > 0 ? `Saving... (Attempt ${retryCount + 1})` : 'Saving...'}>
            <StatusIndicator status="saving">
              <CircularProgress size={16} />
            </StatusIndicator>
          </Tooltip>
        );
      }

      if (saveStatus === 'success') {
        return (
          <Tooltip title="Saved successfully">
            <StatusIndicator status="success">
              <CheckCircleOutline fontSize="small" />
            </StatusIndicator>
          </Tooltip>
        );
      }

      if (saveStatus === 'error') {
        return (
          <Tooltip title={allowRetry ? 'Save failed - Click to retry' : 'Save failed'}>
            <StatusIndicator 
              status="error" 
              onClick={allowRetry ? handleRetry : undefined}
            >
              <ErrorOutline fontSize="small" />
            </StatusIndicator>
          </Tooltip>
        );
      }

      if (saveStatus === 'pending' && hasUnsavedChanges) {
        return (
          <Tooltip title="Changes pending - Will save automatically">
            <StatusIndicator status="pending">
              <Schedule fontSize="small" />
            </StatusIndicator>
          </Tooltip>
        );
      }

      if (hasUnsavedChanges) {
        return (
          <Tooltip title="Unsaved changes - Click to save now">
            <StatusIndicator 
              status="pending" 
              onClick={handleManualSave}
            >
              <Edit fontSize="small" />
            </StatusIndicator>
          </Tooltip>
        );
      }

      return null;
    };

    return (
      <Box sx={{ position: 'relative', width: '100%' }}>
        <StyledTextField
          inputRef={inputRef}
          name={name}
          value={localValue}
          onChange={handleChange}
          disabled={disabled}
          fullWidth
          error={!!validationError}
          helperText={effectiveHelperText}
          placeholder={placeholder}
          required={required}
          issaving={isSaving || saveStatus === 'saving' ? 'true' : 'false'}
          haserror={validationError ? 'true' : 'false'}
          haschanges={hasUnsavedChanges ? 'true' : 'false'}
          inputProps={{
            maxLength: maxLength,
            'aria-describedby': `${name}-status ${name}-info`,
            style: { paddingRight: showSaveStatus ? '60px' : '12px' } // Make room for status indicators
          }}
          {...props}
        />

        {/* Enhanced status indicators with better positioning */}
        {showSaveStatus && (
          <StatusContainer>
            <Fade in={!!StatusIcon()}>
              <Box>
                <StatusIcon />
              </Box>
            </Fade>
          </StatusContainer>
        )}

        {/* Character counter with better styling */}
        {showCharacterCount && maxLength && (
          <CharacterCounter isoverlimit={isOverLimit}>
            {characterCount}/{maxLength}
            {charactersRemaining !== null && charactersRemaining < 50 && (
              <span> ({charactersRemaining} remaining)</span>
            )}
          </CharacterCounter>
        )}

        {/* Last saved info with icon */}
        {showLastSaved && lastSavedAt && !hasUnsavedChanges && (
          <LastSavedInfo>
            <CheckCircleOutline fontSize="inherit" />
            Last saved: {lastSavedAt.toLocaleTimeString()}
          </LastSavedInfo>
        )}

        {/* Validation error alert with better styling */}
        <Collapse in={!!validationError}>
          <Alert 
            severity="error" 
            sx={{ 
              mt: 1, 
              fontSize: '0.875rem',
              '& .MuiAlert-icon': {
                fontSize: '1rem'
              }
            }}
            action={
              <IconButton
                size="small"
                onClick={() => setValidationError(null)}
                sx={{ color: 'inherit' }}
              >
                <Warning fontSize="small" />
              </IconButton>
            }
          >
            {validationError}
          </Alert>
        </Collapse>

        {/* Save error with retry option */}
        <Collapse in={saveStatus === 'error' && allowRetry}>
          <Alert 
            severity="warning" 
            sx={{ 
              mt: 1, 
              fontSize: '0.875rem',
              '& .MuiAlert-icon': {
                fontSize: '1rem'
              }
            }}
            action={
              <IconButton
                size="small"
                onClick={handleRetry}
                title="Retry save"
                sx={{ color: 'inherit' }}
              >
                <Refresh fontSize="small" />
              </IconButton>
            }
          >
            Save failed. {retryCount > 0 && `Retried ${retryCount} time(s).`} Click to retry.
          </Alert>
        </Collapse>

        {/* Enhanced unsaved changes indicator */}
        {hasUnsavedChanges && saveStatus !== 'saving' && saveStatus !== 'pending' && (
          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <StatusChip
              size="small"
              icon={<Edit />}
              label="Unsaved changes"
              status="unsaved"
              variant="outlined"
              onClick={handleManualSave}
              clickable
            />
          </Box>
        )}

        {/* Snackbar for better user feedback */}
        <Snackbar
          open={showSnackbar}
          autoHideDuration={3000}
          onClose={() => setShowSnackbar(false)}
          message={snackbarMessage}
          anchorOrigin={{ vertical: 'bottom', horizontal: isMobile ? 'center' : 'right' }}
        />
      </Box>
    );
  };

  export default RealTimeTextField;

