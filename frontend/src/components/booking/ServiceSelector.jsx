import React, { useEffect, useState } from 'react';
import {
  Grid,
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButtonGroup,
  ToggleButton,
  Skeleton,
  Fade,
  Slide,
  Zoom,
  useTheme,
  alpha,
  Paper
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import VisibilityIcon from '@mui/icons-material/Visibility';
import StarIcon from '@mui/icons-material/Star';
import apiClient from '../../services/apiClient';

export default function ServiceSelector({ selectedServiceId, onServiceSelect }) {
  const theme = useTheme();

  // State management
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [serviceDetailDialog, setServiceDetailDialog] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [animationDelay, setAnimationDelay] = useState(0);

  // Data fetching
  useEffect(() => {
    async function fetchServices() {
      try {
        setLoading(true);
        const response = await apiClient.get('/services', {
          params: {
            isActive: true,
            includeOptions: true,
            includeAvailability: false,
          },
        });

        // console.log('API Response:', response.data);
        // console.log('Response length:', response.data?.length);

        setServices(response.data);
      } catch (err) {
        setError('Failed to load services.');
        console.error('API Error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchServices();
  }, []);

  // Group services by category
  const groupedServices = services.reduce((acc, service) => {
    const category = service.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(service);
    return acc;
  }, {});

  const categories = Object.keys(groupedServices);
  const filteredServices = selectedCategory === 'all'
    ? services
    : groupedServices[selectedCategory] || [];

  // Event handlers
  const handleViewDetails = (service) => {
    setServiceDetailDialog(service);
    const defaultOption = service.ServiceOptions?.find(opt => opt.isActive) || null;
    setSelectedOption(defaultOption);
  };

  const closeServiceDetail = () => {
    setServiceDetailDialog(null);
  };

  const handleSelectService = (service, option = null) => {
    const selectedOption = option || service.ServiceOptions?.find(opt => opt.isActive) || null;

    if (selectedServiceId === service.id) {
      onServiceSelect(null, null);
      setSelectedOption(null);
    } else {
      setSelectedOption(selectedOption);
      onServiceSelect(service, selectedOption);
    }
  };

  const handleOptionChange = (event) => {
    const optionId = event.target.value;
    if (!serviceDetailDialog) return;

    const option = serviceDetailDialog.ServiceOptions.find(opt => opt.id === optionId);
    setSelectedOption(option);
  };

  const toggleCategoryExpansion = (category) => {
    setExpandedCategory(expandedCategory === category ? null : category);
  };

  // Price formatting utility
  const formatPrice = (price) => {
    if (price === undefined || price === null) return '0.00';
    const num = typeof price === 'string' ? parseFloat(price) : price;
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  // Service Card Component
  const ServiceCard = ({ service, index }) => {
    const isSelected = selectedServiceId === service.id;
    const isHovered = hoveredCard === service.id;
    const activeOption = service.ServiceOptions?.find(opt => opt.isActive);

    return (
      <Fade in timeout={100 + (index * 100)}>
        <Grid item xs={12} sm={6} md={4} lg={3} sx={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0
        }}>
          <Card
            // onClick={() => setHoveredCard(service.id)}
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              minHeight: { xs: 400, sm: 450 },
              position: 'relative',
              overflow: 'hidden',
              background: isSelected
                ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.light, 0.05)} 100%)`
                : 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)',
              border: isSelected ? `2px solid ${theme.palette.primary.main}` : '1px solid rgba(0,0,0,0.08)',
              borderRadius: 3,
              cursor: 'pointer',
              filter: isHovered ? 'brightness(1.02) contrast(1.05)' : 'brightness(1) contrast(1)',
              transform: 'translateZ(0)',
              boxShadow: isHovered
                ? `0 20px 40px ${alpha(theme.palette.primary.main, 0.25)}, 0 10px 20px ${alpha('#000', 0.15)}`
                : isSelected
                  ? `0 8px 24px ${alpha(theme.palette.primary.main, 0.2)}`
                  : '0 2px 8px rgba(0,0,0,0.04)',
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              '&:hover': {
                borderColor: alpha(theme.palette.primary.main, 0.6),
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  inset: -2,
                  borderRadius: 'inherit',
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  zIndex: -1,
                  opacity: 0.1,
                }
              },
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: isSelected
                  ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, transparent 50%)`
                  : isHovered
                    ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.03)} 0%, transparent 50%)`
                    : 'transparent',
                zIndex: 1,
                transition: 'all 0.3s ease'
              },
              '@media (max-width: 600px)': {
                minHeight: 400,
                '& .MuiCardContent-root': {
                  px: 2,
                },
                '& .MuiCardActions-root': {
                  px: 2,
                }
              }
            }}
          >
            {/* Premium Badge */}
            {isSelected && (
              <Zoom in timeout={300}>
                <Box sx={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  zIndex: 3,
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                  color: 'white',
                  borderRadius: '50%',
                  p: 1,
                  boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.4)}`,
                  '@keyframes pulse': {
                    '0%': { transform: 'scale(1)' },
                    '50%': { transform: 'scale(1.05)' },
                    '100%': { transform: 'scale(1)' }
                  },
                  animation: 'pulse 2s infinite'
                }}>
                  <CheckCircleIcon fontSize="small" />
                </Box>
              </Zoom>
            )}

            {/* Image Section */}
            <Box sx={{
              position: 'relative',
              height: 200,
              overflow: 'hidden',
              background: service.imageUrl ? 'transparent' : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.secondary.main, 0.1)})`,
            }}>
              {service.imageUrl ? (
                <Box
                  component="img"
                  src={service.imageUrl}
                  alt={service.name}
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: isHovered ? 'scale(1.08)' : 'scale(1)',
                    transition: 'transform 0.5s cubic-bezier(0.4, 0.0, 0.2, 1)',
                    filter: isSelected ? 'brightness(1.1) saturate(1.2)' : 'brightness(1)',
                  }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '';
                  }}
                />
              ) : (
                <Box sx={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.secondary.main, 0.1)})`,
                }}>
                  <Avatar
                    sx={{
                      width: 80,
                      height: 80,
                      fontSize: 32,
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main,
                      border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                      transform: isHovered ? 'rotate(5deg) scale(1.05)' : 'rotate(0) scale(1)',
                      transition: 'transform 0.3s ease'
                    }}
                  >
                    {service.name?.[0]?.toUpperCase() || 'S'}
                  </Avatar>
                </Box>
              )}

              {/* Gradient Overlay */}
              <Box sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '40%',
                background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
                opacity: isHovered ? 1 : 0,
                transition: 'opacity 0.3s ease'
              }} />
            </Box>

            <CardContent sx={{
              flexGrow: 1,
              p: 3,
              position: 'relative',
              zIndex: 2,
              overflow: 'hidden',
              // Add these to ensure proper width constraints
              minWidth: 0, // Critical for flex items
              maxWidth: '100%',
              width: '100%',
              // Optional: set a specific max-width for desktop
              '@media (min-width: 768px)': {
                maxWidth: '350px',
              }

            }}>
              {/* Category Chip */}
              {service.category && (
                <Chip
                  label={service.category}
                  size="small"
                  sx={{
                    mb: 2,
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.2),
                      transform: 'scale(1.02)'
                    }
                  }}
                />
              )}

              {/* Service Name */}
              <Typography
                variant="h6"
                component="h3"
                sx={{
                  fontWeight: 700,
                  lineHeight: 1.3,
                  mb: 2,
                  color: theme.palette.text.primary,
                  fontSize: '1.1rem',
                  transition: 'color 0.2s ease',
                  wordBreak: 'break-word',
                  whiteSpace: 'normal',
                  ...(isHovered && {
                    color: theme.palette.primary.main,
                  })
                }}
              >
                {service.name}
              </Typography>

              {/* Description */}
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mb: 3,
                  height: '3em',
                  lineHeight: '1.5em',
                  overflow: 'hidden',
                  fontSize: '0.68rem',
                  wordBreak: 'break-word',
                  whiteSpace: 'normal',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    right: 0,
                    bottom: 0,
                    width: '20px',
                    height: '1.5em',
                    background: 'linear-gradient(to right, transparent, white)',
                    display: 'block'
                  },
                  // Mobile specific adjustments
                  '@media (max-width: 600px)': {
                    fontSize: '0.7rem',
                    width: '90%',
                    textAlign: 'center',
                    lineHeight: '1.4em',
                    height: '2.8em',
                    WebkitLineClamp: 2,
                  }
                }}
              >
                {service.description?.length > 50
                  ? `${service.description.substring(0, 50)}...`
                  : service.description || 'Premium service with excellent quality and care'}
              </Typography>


              {/* Price and Duration */}
              {activeOption && (
                <Box sx={{
                  width: { xs: '80%', sm: '77%' },
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' }, // Stack on mobile
                  justifyContent: 'space-between',
                  alignItems: { xs: 'stretch', sm: 'center' },
                  gap: { xs: 1, sm: 2 },
                  p: { xs: 1.5, sm: 2 },
                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                  transition: 'all 0.2s ease',
                  ...(isHovered && {
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    borderColor: alpha(theme.palette.primary.main, 0.2)
                  })
                }}>
                  <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    justifyContent: { xs: 'center', sm: 'flex-start' }
                  }}>
                    <AttachMoneyIcon sx={{
                      fontSize: { xs: 14, sm: 16 },
                      color: theme.palette.success.main,
                      transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                      transition: 'transform 0.2s ease'
                    }} />
                    <Typography variant="h6" sx={{
                      fontWeight: 700,
                      color: theme.palette.success.main,
                      fontSize: { xs: '0.9rem', sm: '1rem' }
                    }}>
                      {formatPrice(activeOption.price)}
                    </Typography>
                  </Box>
                  <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    justifyContent: { xs: 'center', sm: 'flex-end' }
                  }}>
                    <AccessTimeIcon sx={{
                      fontSize: { xs: 14, sm: 16 },
                      color: theme.palette.text.secondary,
                      transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                      transition: 'transform 0.2s ease'
                    }} />
                    <Typography variant="body2" color="text.secondary" sx={{
                      fontWeight: 500,
                      fontSize: { xs: '0.8rem', sm: '0.875rem' }
                    }}>
                      {activeOption.duration}min
                    </Typography>
                  </Box>
                </Box>
              )}
            </CardContent>

            <CardActions sx={{
              p: { xs: 2, sm: 3 },
              pt: 0,
              gap: { xs: 1, sm: 1.5 },
              position: 'relative',
              zIndex: 2,
              flexDirection: { xs: 'column', sm: 'row' }, // Stack buttons on mobile
              alignItems: 'stretch'
            }}>
              <Button
                size="medium"
                variant="text"
                startIcon={<VisibilityIcon sx={{ fontSize: { xs: 16, sm: 20 } }} />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewDetails(service);
                }}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: { xs: '0.8rem', sm: '0.875rem' },
                  py: { xs: 1, sm: 0.75 },
                  color: theme.palette.text.primary,
                  transition: 'all 0.2s ease',
                  minHeight: { xs: 40, sm: 'auto' },
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main,
                    transform: 'scale(1.02)'
                  }
                }}
              >
                Details
              </Button>

              <Button
                size="medium"
                variant={isSelected ? 'contained' : 'outlined'}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectService(service);
                }}
                sx={{
                  ml: { xs: 0, sm: 'auto' }, 
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: { xs: '0.8rem', sm: '0.875rem' },
                  px: { xs: 2, sm: 3 },
                  py: { xs: 1.2, sm: 0.75 },
                  minHeight: { xs: 44, sm: 'auto' },
                  borderRadius: 2,
                  background: isSelected
                    ? `linear-gradient(45deg, ${theme.palette.error.main}, ${theme.palette.error.dark})`
                    : 'transparent',
                  border: isSelected ? 'none' : `2px solid ${theme.palette.primary.main}`,
                  color: isSelected ? 'white' : theme.palette.primary.main,
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    background: isSelected
                      ? 'red'
                      : alpha(theme.palette.primary.main, 0.1),
                    transform: 'scale(1.02)',
                    boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.3)}`
                  }
                }}
              >
                {isSelected ? '✓ Remove' : 'Select Service'}
              </Button>
            </CardActions>

          </Card>
        </Grid>
      </Fade>
    );
  };

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorDisplay error={error} />;

  return (
    <Box sx={{
      maxWidth: 1400,
      mx: 'auto',
      px: { xs: 2, sm: 3, md: 4 },
      py: 4
    }}>
      {/* Header Section */}
      <Fade in timeout={800}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 800,
              background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 2,
              fontSize: { xs: '2rem', md: '3rem' }
            }}
          >
            Choose Your Perfect Service
          </Typography>
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{
              fontWeight: 400,
              maxWidth: 600,
              mx: 'auto',
              lineHeight: 1.6
            }}
          >
            Discover premium services tailored to your needs with expert care and attention
          </Typography>
        </Box>
      </Fade>

      {/* Category Filter */}
      <Slide in direction="up" timeout={1000}>
        <Paper
          elevation={0}
          sx={{
            mb: 6,
            p: 2,
            borderRadius: 3,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(theme.palette.secondary.main, 0.02)} 100%)`,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
          }}
        >
          {/* Mobile: Dropdown Select */}
          <Box sx={{ display: { xs: 'block', sm: 'none' }, mb: 2 }}>
            <FormControl fullWidth>
              <InputLabel id="category-select-label">Select Category</InputLabel>
              <Select
                labelId="category-select-label"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                label="Select Category"
                sx={{
                  borderRadius: 2,
                  '& .MuiSelect-select': {
                    py: 1,
                    fontWeight: 600
                  }
                }}
              >
                <MenuItem value="all">
                  All Services ({services.length})
                </MenuItem>
                {categories.map(category => (
                  <MenuItem key={category} value={category}>
                    {category} ({groupedServices[category].length})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Desktop: Toggle Buttons */}
          <ToggleButtonGroup
            value={selectedCategory}
            exclusive
            onChange={(e, newCategory) => setSelectedCategory(newCategory || 'all')}
            aria-label="service categories"
            sx={{
              display: { xs: 'none', sm: 'flex' }, // Hide on mobile, show on desktop
              flexWrap: 'wrap',
              gap: 1,
              justifyContent: 'center',
              '& .MuiToggleButton-root': {
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                py: 1,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                color: theme.palette.text.primary,
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  transform: 'translateY(-2px)',
                },
                '&.Mui-selected': {
                  bgcolor: theme.palette.primary.main,
                  color: 'white',
                  '&:hover': {
                    bgcolor: theme.palette.primary.dark,
                  }
                }
              }
            }}
          >
            <ToggleButton value="all">
              All Services ({services.length})
            </ToggleButton>
            {categories.map(category => (
              <ToggleButton key={category} value={category}>
                {category} ({groupedServices[category].length})
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Paper>
      </Slide>

      {/* Services Grid */}
      {selectedCategory === 'all' ? (
        categories.map((category, categoryIndex) => (
          <Fade in timeout={1200 + (categoryIndex * 200)} key={category}>
            <Box sx={{ mb: 8 }}>
              <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 4
              }}>
                <Typography
                  variant="h4"
                  component="h2"
                  sx={{
                    fontWeight: 700,
                    color: theme.palette.text.primary,
                    position: 'relative',
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      bottom: -8,
                      left: 0,
                      width: 60,
                      height: 4,
                      bgcolor: theme.palette.primary.main,
                      borderRadius: 2
                    }
                  }}
                >
                  {category}
                </Typography>
                {groupedServices[category].length > 3 && (
                  <Button
                    onClick={() => {
                      setSelectedCategory(category);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    variant="outlined"
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                      borderRadius: 2,
                      '&:hover': {
                        transform: 'scale(1.02)',
                        boxShadow: `0 8px 25px ${alpha(theme.palette.primary.main, 0.15)}`,
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                      }
                    }}
                  >
                    View All ({groupedServices[category].length})
                  </Button>
                )}
              </Box>

              <Grid container spacing={4}>
                {groupedServices[category]
                  .slice(0, expandedCategory === category ? undefined : 3)
                  .map((service, index) => (
                    <ServiceCard key={service.id} service={service} index={index} />
                  ))}
              </Grid>

              {groupedServices[category].length > 3 && expandedCategory !== category && (
                <Fade in timeout={800}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                    <Button
                      onClick={() => toggleCategoryExpansion(category)}
                      variant="text"
                      size="large"
                      sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                        '&:hover': {
                          transform: 'scale(1.02)',
                          boxShadow: `0 8px 25px ${alpha(theme.palette.primary.main, 0.15)}`,
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }
                      }}
                    >
                      Show More Services
                    </Button>
                  </Box>
                </Fade>
              )}
            </Box>
          </Fade>
        ))
      ) : (
        <Grid container spacing={4}>
          {filteredServices.map((service, index) => (
            <ServiceCard key={service.id} service={service} index={index} />
          ))}
        </Grid>
      )}

      {/* Enhanced Service Detail Dialog */}
      <Dialog
        open={!!serviceDetailDialog}
        onClose={closeServiceDetail}
        maxWidth="md"
        fullWidth
        TransitionComponent={Fade}
        TransitionProps={{ timeout: 400 }}
        PaperProps={{
          sx: {
            borderRadius: 4,
            background: 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)',
            boxShadow: `0 24px 48px ${alpha('#000', 0.15)}`,
            overflow: 'hidden'
          }
        }}
      >
        {serviceDetailDialog && (
          <>
            {/* Hero Image Header */}
            <Box sx={{ position: 'relative', height: 200, overflow: 'hidden' }}>
              {serviceDetailDialog.imageUrl ? (
                <Box
                  component="img"
                  src={serviceDetailDialog.imageUrl}
                  alt={serviceDetailDialog.name}
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center'
                  }}
                />
              ) : (
                <Box sx={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.2)}, ${alpha(theme.palette.secondary.main, 0.2)})`,
                }}>
                  <Avatar
                    sx={{
                      width: 80,
                      height: 80,
                      fontSize: 32,
                      bgcolor: alpha(theme.palette.primary.main, 0.2),
                      color: theme.palette.primary.main,
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    {serviceDetailDialog.name?.[0]?.toUpperCase() || 'S'}
                  </Avatar>
                </Box>
              )}

              {/* Gradient Overlay */}
              <Box sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.4) 100%)'
              }} />

              {/* Close Button Overlay */}
              <IconButton
                onClick={closeServiceDetail} // Fixed: was using undefined function
                sx={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  bgcolor: alpha('#fff', 0.9),
                  color: theme.palette.error.main,
                  zIndex: 10, // Added higher z-index to ensure it's clickable
                  '&:hover': {
                    bgcolor: '#fff',
                    transform: 'rotate(90deg)',
                    boxShadow: `0 4px 12px ${alpha('#000', 0.2)}`
                  },
                  transition: 'all 0.3s ease',
                  backdropFilter: 'blur(10px)',
                  // Make sure it's accessible on mobile
                  minWidth: { xs: 44, sm: 40 },
                  minHeight: { xs: 44, sm: 40 },
                  '&:focus': {
                    outline: `2px solid ${theme.palette.primary.main}`,
                    outlineOffset: 2
                  }
                }}
              >
                <CloseIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
              </IconButton>

              {/* Title Overlay */}
              <Box sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                p: 3,
                background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.7) 100%)'
              }}>
                <Typography variant="h4" component="div" sx={{
                  fontWeight: { xs: 500, sm: 700 },
                  fontSize: { xs: '0.950rem' },
                  color: '#fff',
                  textShadow: '0 2px 8px rgba(0,0,0,0.5)'
                }}>
                  {serviceDetailDialog.name}
                </Typography>
                {serviceDetailDialog.category && (
                  <Chip
                    label={serviceDetailDialog.category}
                    size="small"
                    sx={{
                      mt: 1,
                      bgcolor: alpha('#fff', 0.2),
                      color: '#fff',
                      fontWeight: { xs: 300, sm: 400 },
                      fontSize: { xs: '0.6rem' },
                      backdropFilter: 'blur(10px)',
                      border: `1px solid ${alpha('#fff', 0.3)}`
                    }}
                  />
                )}
              </Box>
            </Box>

            <DialogContent sx={{ p: 4 }}>
              <Box>
                {/* Description */}
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, fontFamily: { xs: '0.5rem' } }}>
                  About This Service
                </Typography>
                <Typography
                  variant="body1"
                  paragraph
                  sx={{
                    lineHeight: 1.7,
                    mb: 4,
                    textAlign: 'justify',
                    textJustify: 'inter-word',
                    fontSize: { xs: '0.750rem' },
                    hyphens: 'auto'
                  }}
                >
                  {serviceDetailDialog.description || 'Experience our premium service with exceptional quality, professional care, and attention to detail that exceeds expectations.'}
                </Typography>

                <Divider sx={{ my: 3 }} />

                {/* Service Options */}
                <Typography variant="h6" sx={{
                  fontWeight: 600,
                  fontSize: { xs: '0.8rem' },
                  mb: 3,
                  textAlign: { xs: 'center', sm: 'left' } // Center on mobile
                }}>
                  Choose Your Package
                </Typography>

                {/* Package Selection Dropdown */}
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel id="package-select-label" sx={{
                    fontSize: { xs: '0.875rem', sm: '1rem' } // Smaller label on mobile
                  }}>
                    Select Package Option
                  </InputLabel>
                  <Select
                    labelId="package-select-label"
                    value={selectedOption?.id || ''}
                    onChange={handleOptionChange}
                    label="Select Package Option"
                    sx={{
                      borderRadius: 2,
                      '& .MuiSelect-select': {
                        py: { xs: 1, sm: 1.5 },
                        fontSize: { xs: '0.875rem', sm: '1rem' }
                      }
                    }}
                  >
                    {serviceDetailDialog.ServiceOptions?.map((opt) => (
                      <MenuItem key={opt.id} value={opt.id} sx={{ py: { xs: 1, sm: 1.5 } }}>
                        <Box sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          width: '100%',
                          flexDirection: { xs: 'column', sm: 'row' },
                          gap: { xs: 0.5, sm: 0 },
                          textAlign: { xs: 'center', sm: 'left' }
                        }}>
                          <Typography
                            variant="subtitle1"
                            sx={{
                              fontWeight: 600,
                              width: { xs: '100%', sm: 'auto' },
                              fontSize: { xs: '0.875rem', sm: '1rem' } // Smaller text
                            }}
                          >
                            {opt.optionName || 'Standard Package'}
                          </Typography>
                          <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: { xs: 0.5, sm: 2 },
                            flexWrap: 'wrap',
                            justifyContent: { xs: 'center', sm: 'flex-end' }
                          }}>
                            <Typography
                              variant="h6"
                              color="primary"
                              sx={{
                                fontWeight: 700,
                                minWidth: 'fit-content',
                                fontSize: { xs: '0.875rem', sm: '1.25rem' } // Smaller price
                              }}
                            >
                              ${formatPrice(opt.price)}
                            </Typography>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                minWidth: 'fit-content',
                                fontSize: { xs: '0.75rem', sm: '0.875rem' } // Smaller duration
                              }}
                            >
                              {opt.duration} min
                            </Typography>
                          </Box>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Selected Option Details*/}
                {selectedOption && (
                  <Paper sx={{
                    p: { xs: 1.5, sm: 3 },
                    bgcolor: alpha(theme.palette.success.main, 0.05),
                    border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                    borderRadius: 2,
                    textAlign: { xs: 'center', sm: 'left' },
                    mb: { xs: 1, sm: 2 }
                  }}>
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: 600,
                        mb: { xs: 1, sm: 2 },
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: { xs: 'center', sm: 'flex-start' },
                        gap: 1,
                        fontSize: { xs: '0.875rem', sm: '1rem' } // Smaller text
                      }}
                    >
                      <CheckCircleIcon color="success" fontSize="small" />
                      Selected: {selectedOption.optionName || 'Standard Package'}
                    </Typography>

                    <Box sx={{
                      display: 'flex',
                      gap: { xs: 1, sm: 3 }, // Smaller gap
                      flexDirection: { xs: 'column', sm: 'row' },
                      alignItems: 'center',
                      justifyContent: { xs: 'center', sm: 'flex-start' }
                    }}>
                      <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5
                      }}>
                        <AttachMoneyIcon fontSize="small" color="success" />
                        <Typography
                          variant="h6"
                          color="success.main"
                          sx={{
                            fontWeight: 700,
                            fontSize: { xs: '0.875rem', sm: '1.25rem' } // Smaller text
                          }}
                        >
                          ${formatPrice(selectedOption.price)}
                        </Typography>
                      </Box>

                      <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5 // Tighter spacing
                      }}>
                        <AccessTimeIcon fontSize="small" color="action" />
                        <Typography variant="body1" sx={{
                          fontWeight: 500,
                          fontSize: { xs: '0.875rem', sm: '1rem' } // Smaller text
                        }}>
                          {selectedOption.duration} min
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                )}
              </Box>
            </DialogContent>

            <DialogActions sx={{
              p: { xs: 2, sm: 3 },
              bgcolor: alpha(theme.palette.primary.main, 0.02),
              gap: { xs: 1, sm: 2 },
              flexDirection: { xs: 'column-reverse', sm: 'row' }, // Stack on mobile
              alignItems: 'stretch'
            }}>
              <Button
                onClick={closeServiceDetail}
                variant="outlined"
                size="medium"
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  px: { xs: 2, sm: 4 },
                  py: { xs: 1, sm: 1 },
                  fontSize: { xs: '0.rem', sm: '1rem' },
                  minHeight: { xs: 48, sm: 'auto' }
                }}
              >
                Close
              </Button>
              <Button
                variant="contained"
                size="large"
                onClick={() => {
                  handleSelectService(serviceDetailDialog, selectedOption);
                  closeServiceDialog();
                }}
                disabled={!selectedOption}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  px: { xs: 2, sm: 4 },
                  py: { xs: 1, sm: 1 },
                  fontSize: { xs: '0.9rem', sm: '1rem' },
                  minHeight: { xs: 38, sm: 'auto' },
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                  '&:hover': {
                    background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
                    transform: 'translateY(-2px)',
                    boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.4)}`
                  }
                }}
              >
                Select This Service
              </Button>
            </DialogActions>

          </>
        )}
      </Dialog>

      {/* Custom Styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
      @keyframes pulse {
        0% {
          transform: scale(1);
          opacity: 1;
        }
        50% {
          transform: scale(1.05);
          opacity: 0.8;
        }
        100% {
          transform: scale(1);
          opacity: 1;
        }
      }

      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .service-card {
        animation: fadeInUp 0.6s ease-out;
      }
    `,
        }}
      />

    </Box>
  );
}

// Enhanced Loading Skeleton Component
function LoadingSkeleton() {
  const theme = useTheme();

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, py: 4 }}>
      {/* Header Skeleton */}
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Skeleton
          variant="text"
          width="60%"
          height={80}
          sx={{ mx: 'auto', mb: 2 }}
        />
        <Skeleton
          variant="text"
          width="40%"
          height={40}
          sx={{ mx: 'auto' }}
        />
      </Box>

      {/* Category Filter Skeleton */}
      <Paper sx={{ mb: 6, p: 2, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[...Array(5)].map((_, index) => (
            <Skeleton
              key={index}
              variant="rounded"
              width={120}
              height={40}
              sx={{ borderRadius: 2 }}
            />
          ))}
        </Box>
      </Paper>

      {/* Cards Skeleton */}
      <Grid container spacing={4}>
        {[...Array(8)].map((_, index) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
            <Card sx={{
              height: '100%',
              borderRadius: 3,
              overflow: 'hidden'
            }}>
              <Skeleton variant="rectangular" height={200} />
              <CardContent sx={{ p: 3 }}>
                <Skeleton variant="rounded" width={80} height={24} sx={{ mb: 2 }} />
                <Skeleton variant="text" height={32} sx={{ mb: 1 }} />
                <Skeleton variant="text" height={60} sx={{ mb: 3 }} />
                <Paper sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Skeleton variant="text" width={60} height={28} />
                    <Skeleton variant="text" width={60} height={28} />
                  </Box>
                </Paper>
              </CardContent>
              <CardActions sx={{ p: 3, pt: 0, gap: 1.5 }}>
                <Skeleton variant="rounded" width={80} height={36} />
                <Skeleton variant="rounded" width={120} height={36} sx={{ ml: 'auto' }} />
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

// Enhanced Error Display Component
function ErrorDisplay({ error }) {
  const theme = useTheme();

  return (
    <Fade in timeout={600}>
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 400,
        textAlign: 'center',
        p: 4,
        maxWidth: 600,
        mx: 'auto'
      }}>
        <Box sx={{
          width: 120,
          height: 120,
          borderRadius: '50%',
          bgcolor: alpha(theme.palette.error.main, 0.1),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 3
        }}>
          <Typography variant="h1" sx={{
            fontSize: '3rem',
            color: theme.palette.error.main
          }}>
            ⚠️
          </Typography>
        </Box>

        <Typography variant="h4" sx={{
          fontWeight: 700,
          color: theme.palette.error.main,
          mb: 2
        }}>
          Oops! Something went wrong
        </Typography>

        <Typography variant="body1" sx={{
          mb: 4,
          lineHeight: 1.6,
          color: theme.palette.text.secondary
        }}>
          {error || 'We encountered an issue loading the services. Please try again.'}
        </Typography>

        <Button
          variant="contained"
          size="large"
          onClick={() => window.location.reload()}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            px: 4,
            py: 1.5,
            borderRadius: 2,
            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
            '&:hover': {
              background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
              transform: 'translateY(-2px)',
              boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.4)}`
            }
          }}
        >
          Try Again
        </Button>
      </Box>
    </Fade>
  );
}