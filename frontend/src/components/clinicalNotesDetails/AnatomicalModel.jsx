import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  IconButton,
  Switch,
  FormControlLabel,
  Badge,
  Tooltip,
  Chip,
  Stack,
  Card,
  ButtonGroup,
  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material';
import {
  Add,
  Delete,
  Save,
  Close,
  ZoomIn,
  ZoomOut,
  Fullscreen,
  FilterList,
} from '@mui/icons-material';
import { v4 as uuidv4 } from 'uuid';


import frontview from '../../assets/images/frontview.jpg';
import backview from '../../assets/images/backview.jpg';
import leftLateralView from '../../assets/images/left-lateral.jpg';
import rightLateralView from '../../assets/images/right-lateral.jpg';
import skeleton from '../../assets/images/skeleton.jpg';

// Mock images for demonstration
const PLACEHOLDER_IMAGES = {
  anterior: frontview,
  posterior: backview,
  lateral_left: leftLateralView,
  lateral_right: rightLateralView,
  skeletal: skeleton
};

const ANATOMICAL_VIEWS = {
  anterior: {
    name: 'Anterior',
    image: PLACEHOLDER_IMAGES.anterior,
    description: 'Front view of human anatomy'
  },
  posterior: {
    name: 'Posterior',
    image: PLACEHOLDER_IMAGES.posterior,
    description: 'Back view of human anatomy'
  },
  lateral_left: {
    name: 'Left Lateral',
    image: PLACEHOLDER_IMAGES.lateral_left,
    description: 'Left side view'
  },
  lateral_right: {
    name: 'Right Lateral',
    image: PLACEHOLDER_IMAGES.lateral_right,
    description: 'Right side view'
  },
  skeletal: {
    name: 'Skeletal',
    image: PLACEHOLDER_IMAGES.skeletal,
    description: 'Skeletal system view'
  }
};

const MARKING_TYPES = [
  { value: 'pain', label: 'Pain Point', color: '#FF4444', icon: '⚡' },
  { value: 'tension', label: 'Muscle Tension', color: '#FF8C00', icon: '💪' },
  { value: 'injury', label: 'Injury', color: '#8B0000', icon: '🩹' },
  { value: 'treatment', label: 'Treatment Area', color: '#228B22', icon: '🎯' },
  { value: 'improvement', label: 'Improvement', color: '#32CD32', icon: '✅' },
  { value: 'sensitive', label: 'Sensitive Area', color: '#FFD700', icon: '⚠️' },
  { value: 'trigger', label: 'Trigger Point', color: '#DC143C', icon: '🔴' },
  { value: 'note', label: 'General Note', color: '#4169E1', icon: '📝' }
];

const INTENSITY_LEVELS = [
  { value: 1, label: 'Mild', color: '#90EE90' },
  { value: 2, label: 'Moderate', color: '#FFD700' },
  { value: 3, label: 'Severe', color: '#FF6347' },
  { value: 4, label: 'Critical', color: '#FF0000' }
];

const DEFAULT_FORM_DATA = {
  type: 'pain',
  description: '',
  intensity: 2,
  color: '#FF4444',
  size: 16,
  notes: '',
  timestamp: new Date().toISOString()
};

const AnatomicalModel = ({
  clinicalNoteId,
  readOnly = false,
  initialMarkings = {},
  onMarkingsChange = () => { },
  sx = {}
}) => {
  // Core State
  const [markings, setMarkings] = useState({});
  const [currentView, setCurrentView] = useState('anterior');
  const [zoom, setZoom] = useState(1);

  // UI State
  const [showMarkingForm, setShowMarkingForm] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  const [filterByType, setFilterByType] = useState('all');
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Form State
  const [selectedMarking, setSelectedMarking] = useState(null);
  const [formPosition, setFormPosition] = useState({ x: 0, y: 0 });
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);

  // Settings
  const [markingSize, setMarkingSize] = useState(16);

  // Image dimensions and transform state
  const [imageTransform, setImageTransform] = useState({
    naturalWidth: 0,
    naturalHeight: 0,
    displayWidth: 0,
    displayHeight: 0,
    offsetX: 0,
    offsetY: 0,
    scale: 1
  });

  // Refs
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  const markingsLayerRef = useRef(null);

  // Initialize markings
  useEffect(() => {
    // Initialize with empty markings if no clinicalNoteId
    if (!clinicalNoteId) {
      const emptyMarkings = {};
      Object.keys(ANATOMICAL_VIEWS).forEach(view => {
        emptyMarkings[view] = [];
      });
      setMarkings(emptyMarkings);
    }
  }, [clinicalNoteId]);
  // Update the useEffect for initializing markings
useEffect(() => {
  // Initialize markings from props or create empty structure
  if (Object.keys(initialMarkings).length > 0) {
    setMarkings(initialMarkings);
  } else {
    const emptyMarkings = {};
    Object.keys(ANATOMICAL_VIEWS).forEach(view => {
      emptyMarkings[view] = [];
    });
    setMarkings(emptyMarkings);
  }
}, [initialMarkings]);

// Ensure markings changes are propagated to parent
useEffect(() => {
  // Only call onMarkingsChange if markings have actual content
  if (Object.keys(markings).length > 0) {
    onMarkingsChange(markings);
  }
}, [markings, onMarkingsChange]);

  // Calculate accurate image transform parameters
  const calculateImageTransform = useCallback(() => {
    const imageElement = imageRef.current;
    const containerElement = containerRef.current;

    if (!imageElement || !containerElement || !imageLoaded) {
      return null;
    }

    // Get natural image dimensions
    const naturalWidth = imageElement.naturalWidth;
    const naturalHeight = imageElement.naturalHeight;

    // Get container dimensions
    const containerRect = containerElement.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;

    // Calculate the scale factor to fit image in container
    const scaleX = containerWidth / naturalWidth;
    const scaleY = containerHeight / naturalHeight;
    const baseScale = Math.min(scaleX, scaleY);

    // Apply zoom to the base scale
    const totalScale = baseScale * zoom;

    // Calculate displayed dimensions
    const displayWidth = naturalWidth * totalScale;
    const displayHeight = naturalHeight * totalScale;

    // Calculate centering offsets
    const offsetX = (containerWidth - displayWidth) / 2;
    const offsetY = (containerHeight - displayHeight) / 2;

    const transform = {
      naturalWidth,
      naturalHeight,
      displayWidth,
      displayHeight,
      offsetX,
      offsetY,
      scale: totalScale,
      baseScale
    };

    setImageTransform(transform);
    return transform;
  }, [imageLoaded, zoom]);

  // Update transform when zoom or image changes
  useEffect(() => {
    if (imageLoaded) {
      calculateImageTransform();
    }
  }, [imageLoaded, zoom, calculateImageTransform]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (imageLoaded) {
        setTimeout(() => calculateImageTransform(), 100);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [imageLoaded, calculateImageTransform]);

  // Convert screen coordinates to normalized image coordinates (0-100%)
  const screenToImageCoordinates = useCallback((screenX, screenY) => {
    const containerElement = containerRef.current;
    if (!containerElement || !imageTransform.displayWidth) {
      return { x: 0, y: 0 };
    }

    const containerRect = containerElement.getBoundingClientRect();

    // Get click position relative to container
    const containerX = screenX - containerRect.left;
    const containerY = screenY - containerRect.top;

    // Adjust for image offset within container
    const imageX = containerX - imageTransform.offsetX;
    const imageY = containerY - imageTransform.offsetY;

    // Convert to percentage of image dimensions
    const percentX = (imageX / imageTransform.displayWidth) * 100;
    const percentY = (imageY / imageTransform.displayHeight) * 100;

    // Clamp to valid range
    const clampedX = Math.max(0, Math.min(100, percentX));
    const clampedY = Math.max(0, Math.min(100, percentY));

    return { x: clampedX, y: clampedY };
  }, [imageTransform]);

  // Convert normalized image coordinates (0-100%) to screen coordinates
  const imageToScreenCoordinates = useCallback((percentX, percentY) => {
    if (!imageTransform.displayWidth) {
      return { x: 0, y: 0 };
    }

    // Convert percentage to pixel position on displayed image
    const imageX = (percentX / 100) * imageTransform.displayWidth;
    const imageY = (percentY / 100) * imageTransform.displayHeight;

    // Add container offset
    const screenX = imageX + imageTransform.offsetX;
    const screenY = imageY + imageTransform.offsetY;

    return { x: screenX, y: screenY };
  }, [imageTransform]);

  // Computed values
  const currentMarkings = useCallback(() => {
    const viewMarkings = markings[currentView] || [];
    return filterByType === 'all'
      ? viewMarkings
      : viewMarkings.filter(marking => marking.type === filterByType);
  }, [markings, currentView, filterByType]);

  const markingCounts = useCallback(() => {
    return Object.keys(ANATOMICAL_VIEWS).reduce((counts, view) => {
      counts[view] = (markings[view] || []).length;
      return counts;
    }, {});
  }, [markings]);

  // Event Handlers
  const handleImageClick = useCallback((event) => {
    if (readOnly || showMarkingForm) return;

    event.stopPropagation();

    const position = screenToImageCoordinates(event.clientX, event.clientY);
    // console.log('Click position (normalized):', position);

    const selectedType = MARKING_TYPES.find(t => t.value === 'pain');

    setFormData({
      ...DEFAULT_FORM_DATA,
      color: selectedType?.color || DEFAULT_FORM_DATA.color,
      size: markingSize
    });

    setFormPosition(position);
    setSelectedMarking(null);
    setShowMarkingForm(true);
  }, [readOnly, showMarkingForm, markingSize, screenToImageCoordinates]);

  const handleMarkingClick = useCallback((marking, event) => {
    event.stopPropagation();
    setSelectedMarking(marking);
    setFormData({
      type: marking.type,
      description: marking.description || '',
      intensity: marking.intensity || 2,
      color: marking.color,
      size: marking.size || markingSize,
      notes: marking.notes || '',
      timestamp: marking.timestamp
    });
    setFormPosition({ x: marking.x, y: marking.y });
    setShowMarkingForm(true);
  }, [markingSize]);

  const handleFormChange = useCallback((field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      if (field === 'type') {
        const selectedType = MARKING_TYPES.find(t => t.value === value);
        newData.color = selectedType?.color || prev.color;
      }
      return newData;
    });
  }, []);

  // In handleSaveMarking callback
const handleSaveMarking = useCallback(() => {
  try {
    const currentViewMarkings = markings[currentView] || [];
    let updatedMarkings;

    if (selectedMarking) {
      updatedMarkings = currentViewMarkings.map(m =>
        m.id === selectedMarking.id
          ? { ...m, ...formData, lastUpdated: new Date().toISOString() }
          : m
      );
    } else {
      const newMarking = {
        id: uuidv4(),
        x: formPosition.x,
        y: formPosition.y,
        view: currentView,
        ...formData
      };
      updatedMarkings = [...currentViewMarkings, newMarking];
    }

    const newMarkings = {
      ...markings,
      [currentView]: updatedMarkings
    };

    setMarkings(newMarkings);
    // This will trigger the useEffect that calls onMarkingsChange
    handleCloseForm();
  } catch (error) {
    console.error('Error saving marking:', error);
  }
}, [markings, currentView, selectedMarking, formData, formPosition]);

  const handleDeleteMarking = useCallback(() => {
    if (!selectedMarking) return;

    try {
      const currentViewMarkings = markings[currentView] || [];
      const updatedMarkings = currentViewMarkings.filter(m => m.id !== selectedMarking.id);

      const newMarkings = {
        ...markings,
        [currentView]: updatedMarkings
      };

      setMarkings(newMarkings);
      onMarkingsChange(newMarkings);
      handleCloseForm();
    } catch (error) {
      console.error('Error deleting marking:', error);
    }
  }, [markings, currentView, selectedMarking, onMarkingsChange]);

  const handleCloseForm = useCallback(() => {
    setShowMarkingForm(false);
    setSelectedMarking(null);
    setFormData(DEFAULT_FORM_DATA);
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(3, prev + 0.2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(0.5, prev - 0.2));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
  }, []);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    setImageError(false);
    // Recalculate transform after image loads
    setTimeout(() => calculateImageTransform(), 50);
  }, [calculateImageTransform]);

  const handleImageError = useCallback(() => {
    setImageError(true);
    setImageLoaded(false);
  }, []);

  const counts = markingCounts();

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      p: 2,
      gap: 2,
      backgroundColor: '#f5f5f5',
      ...sx
    }}>
      {/* Top Controls */}
      <Card sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Filter</InputLabel>
            <Select
              value={filterByType}
              onChange={(e) => setFilterByType(e.target.value)}
              label="Filter"
            >
              <MenuItem value="all">All Types</MenuItem>
              {MARKING_TYPES.map(type => (
                <MenuItem key={type.value} value={type.value}>
                  {type.icon} {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <ButtonGroup size="small" variant="outlined">
            <IconButton size="small" onClick={handleZoomOut} disabled={zoom <= 0.5}>
              <ZoomOut />
            </IconButton>
            <Button onClick={handleResetZoom} sx={{ minWidth: 60 }}>
              {Math.round(zoom * 100)}%
            </Button>
            <IconButton size="small" onClick={handleZoomIn} disabled={zoom >= 3}>
              <ZoomIn />
            </IconButton>
          </ButtonGroup>

          <Box sx={{ flexGrow: 1 }} />

          <FormControlLabel
            control={
              <Switch
                checked={showLegend}
                onChange={(e) => setShowLegend(e.target.checked)}
                size="small"
              />
            }
            label="Legend"
          />

          <IconButton onClick={() => setShowFullscreen(true)}>
            <Fullscreen />
          </IconButton>
        </Box>
      </Card>

      {/* View Selector */}
      <Card sx={{ p: 2 }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
          Anatomical Views
        </Typography>
        <Box sx={{
          display: 'flex',
          gap: 1,
          overflowX: 'auto',
          pb: 1
        }}>
          {Object.entries(ANATOMICAL_VIEWS).map(([key, view]) => (
            <Box
              key={key}
              sx={{
                position: 'relative',
                minWidth: '100px',
                height: '80px',
                borderRadius: 1,
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: currentView === key ? '3px solid #1976d2' : '1px solid #ddd',
                transform: currentView === key ? 'scale(1.05)' : 'scale(1)',
              }}
              onClick={() => setCurrentView(key)}
            >
              <img
                src={view.image}
                alt={view.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain'
                }}
              />
              <Box sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'rgba(0,0,0,0.7)',
                color: 'white',
                p: 0.5,
                textAlign: 'center',
              }}>
                <Typography variant="caption">
                  {view.name}
                </Typography>
                {counts[key] > 0 && (
                  <Badge
                    badgeContent={counts[key]}
                    color="primary"
                    sx={{ ml: 1 }}
                  />
                )}
              </Box>
            </Box>
          ))}
        </Box>
      </Card>

      {/* Main Content Area */}
      <Box sx={{ display: 'flex', gap: 2, flexGrow: 1, minHeight: 0 }}>
        {/* Image Container */}
        <Box sx={{ flex: '0 0 70%', position: 'relative' }}>
          <Card sx={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 2,
            position: 'relative',
            overflow: 'hidden'
          }}>
            <Box
              ref={containerRef}
              sx={{
                position: 'relative',
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                borderRadius: 1,
              }}
            >
              {/* Image */}
              <img
                ref={imageRef}
                src={ANATOMICAL_VIEWS[currentView].image}
                alt={ANATOMICAL_VIEWS[currentView].description}
                onClick={handleImageClick}
                onLoad={handleImageLoad}
                onError={handleImageError}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  userSelect: 'none',
                  cursor: readOnly ? 'default' : 'crosshair',
                  transform: `scale(${zoom})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.2s ease',
                  display: 'block'
                }}
                draggable={false}
              />

              {/* Markings Layer - Positioned absolutely over the image */}
              <Box
                ref={markingsLayerRef}
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none', // Allow clicks to pass through to image
                  zIndex: 10
                }}
              >
                {imageLoaded && imageTransform.displayWidth > 0 && currentMarkings().map(marking => {
                  const screenPos = imageToScreenCoordinates(marking.x, marking.y);
                  const shouldShow = filterByType === 'all' || marking.type === filterByType;

                  if (!shouldShow) return null;

                  return (
                    <Tooltip
                      key={marking.id}
                      title={`${MARKING_TYPES.find(t => t.value === marking.type)?.label || marking.type}: ${marking.description || ''}`}
                      placement="top"
                    >
                      <Box
                        onClick={(e) => handleMarkingClick(marking, e)}
                        sx={{
                          position: 'absolute',
                          left: screenPos.x,
                          top: screenPos.y,
                          transform: 'translate(-50%, -50%)',
                          width: (marking.size || markingSize),
                          height: (marking.size || markingSize),
                          borderRadius: '50%',
                          backgroundColor: marking.color,
                          border: selectedMarking?.id === marking.id ? '3px solid #000' : '2px solid rgba(255,255,255,0.8)',
                          cursor: readOnly ? 'default' : 'pointer',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                          zIndex: selectedMarking?.id === marking.id ? 1000 : 100,
                          transition: 'all 0.2s ease',
                          pointerEvents: 'auto', // Enable clicks only on the marking itself
                          '&:hover': !readOnly ? {
                            transform: 'translate(-50%, -50%) scale(1.2)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                          } : {}
                        }}
                      />
                    </Tooltip>
                  );
                })}
              </Box>

              {/* Debug information */}
              {!readOnly && (
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 10,
                    left: 10,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    p: 1,
                    borderRadius: 1,
                    fontSize: '0.8rem',
                    pointerEvents: 'none',
                    zIndex: 1000
                  }}
                >
                  Click to mark • Zoom: {Math.round(zoom * 100)}% • Markings: {currentMarkings().length}
                </Box>
              )}
            </Box>
          </Card>
        </Box>

        {/* Marking Form and Legend */}
        <Box sx={{ flex: '0 0 30%', overflowY: 'auto', maxHeight: '100%' }}>
          {showMarkingForm && (
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                {selectedMarking ? 'Edit Marking' : 'Add Marking'}
              </Typography>
              <FormControl fullWidth margin="normal">
                <InputLabel>Type</InputLabel>
                <Select
                  value={formData.type}
                  label="Type"
                  onChange={(e) => handleFormChange('type', e.target.value)}
                >
                  {MARKING_TYPES.map(type => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Description"
                fullWidth
                multiline
                minRows={2}
                value={formData.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
                margin="normal"
              />

              <FormControl fullWidth margin="normal">
                <InputLabel>Intensity</InputLabel>
                <Select
                  value={formData.intensity}
                  label="Intensity"
                  onChange={(e) => handleFormChange('intensity', e.target.value)}
                >
                  {INTENSITY_LEVELS.map(level => (
                    <MenuItem key={level.value} value={level.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 20, height: 20, backgroundColor: level.color, borderRadius: '50%' }} />
                        {level.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Notes"
                fullWidth
                multiline
                minRows={2}
                value={formData.notes}
                onChange={(e) => handleFormChange('notes', e.target.value)}
                margin="normal"
              />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                {!readOnly && (
                  <>
                    <Button variant="contained" color="primary" onClick={handleSaveMarking}>
                      Save
                    </Button>
                    {selectedMarking && (
                      <Button variant="outlined" color="error" onClick={handleDeleteMarking}>
                        Delete
                      </Button>
                    )}
                  </>
                )}
                <Button variant="text" onClick={handleCloseForm}>
                  Cancel
                </Button>
              </Box>
            </Paper>
          )}

          {showLegend && (
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Legend
              </Typography>
              <Stack spacing={1}>
                {MARKING_TYPES.map(type => (
                  <Chip
                    key={type.value}
                    label={`${type.icon} ${type.label}`}
                    sx={{
                      backgroundColor: type.color,
                      color: '#fff',
                      '& .MuiChip-label': {
                        fontWeight: 500
                      }
                    }}
                  />
                ))}
              </Stack>
            </Paper>
          )}
        </Box>
      </Box>

      {/* Fullscreen Dialog */}
      <Dialog
        fullScreen
        open={showFullscreen}
        onClose={() => setShowFullscreen(false)}
      >
        <DialogTitle>
          Anatomical Model - Fullscreen
          <IconButton
            edge="end"
            color="inherit"
            onClick={() => setShowFullscreen(false)}
            aria-label="close"
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <Box sx={{ height: '100vh', p: 2 }}>
            <Box sx={{ position: 'relative', height: '100%', width: '100%' }}>
              <img
                src={ANATOMICAL_VIEWS[currentView].image}
                alt={ANATOMICAL_VIEWS[currentView].description}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  userSelect: 'none',
                  cursor: readOnly ? 'default' : 'crosshair',
                  transform: `scale(${zoom})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.2s ease'
                }}
                draggable={false}
              />
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default AnatomicalModel;