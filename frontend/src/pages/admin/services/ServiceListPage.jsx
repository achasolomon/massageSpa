import React, { useState, useEffect, useRef } from "react";
import {
  Box, Typography, Button, Paper, CircularProgress, Alert, IconButton, TextField,
  InputAdornment, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination,
  FormControl, InputLabel, Select, Stack, Grid, Switch, FormControlLabel, Tooltip,
  Checkbox, Divider, Avatar, Card, CardContent, CardHeader, Accordion, AccordionSummary,
  AccordionDetails
} from "@mui/material";
import { v4 as uuidv4 } from 'uuid';
import { useDropzone } from 'react-dropzone';
import {
  Search, Add, Delete as DeleteIcon, Visibility, Clear, ExpandMore, Schedule, AccessTime, Edit as EditIcon
} from "@mui/icons-material";
import { styled, alpha } from "@mui/material/styles";
import apiClient from "../../../services/apiClient";
import useAuth from '../../../hooks/useAuth';


const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  background: "#fff",
  overflow: "hidden",
  "& .MuiTable-root": { minWidth: 900 },
  "& .MuiTableHead-root": { backgroundColor: alpha(theme.palette.primary.main, 0.03) },
  "& .MuiTableCell-head": {
    fontWeight: 500,
    fontSize: "0.8rem",
    color: theme.palette.text.primary,
    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
    padding: "18px 24px",
  },
  "& .MuiTableCell-body": {
    fontSize: "0.75rem",
    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.04)}`,
    padding: "16px 24px",
    color: theme.palette.text.secondary,
  },
  "& .MuiTableRow-root:hover": {
    backgroundColor: alpha(theme.palette.primary.main, 0.07),
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    transition: "background 0.2s, box-shadow 0.2s",
  },
  "& .MuiTableRow-root:nth-of-type(even)": {
    backgroundColor: alpha(theme.palette.primary.main, 0.015),
  },
}));

const StatusChip = styled(Chip)(({ theme, status }) => ({
  fontWeight: 300,
  fontSize: "0.60rem",
  height: 24,
  backgroundColor:
    status === "active"
      ? alpha(theme.palette.success.main, 0.1)
      : alpha(theme.palette.error.main, 0.1),
  color: status === "active" ? theme.palette.success.main : theme.palette.error.main,
  border: `1px solid ${status === "active"
    ? alpha(theme.palette.success.main, 0.2)
    : alpha(theme.palette.error.main, 0.2)
    }`,
  "& .MuiChip-label": { padding: "0 8px" },
}));

export default function ServiceListPage() {
  // States
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalServices, setTotalServices] = useState(0);
  const { user } = useAuth();
  const [selectedService, setSelectedService] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);


  // Enhanced form data structure
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    isActive: true,
    imageUrl: "",
    imagePublicId: "",
    serviceOptions: [{
      id: uuidv4(),
      duration: 60,
      price: 100,
      optionName: "Standard Session"
    }],
    availabilitySettings: {
      operatingHours: {
        start: "09:00",
        end: "18:00"
      },
      selectedDays: [],
      globalBookingLimit: 3,
      autoGenerate: true
    },
    availabilityRules: [] // Will be auto-generated based on options and settings
  });


  const [formError, setFormError] = useState(null);
  const fileInputRef = useRef(null);

  // Utility function to generate time slots based on duration
  const generateTimeSlots = (startTime, endTime, duration) => {
    const slots = [];
    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);

    let current = new Date(start);

    while (current < end) {
      const timeString = current.toTimeString().slice(0, 5);
      slots.push(timeString);
      current.setMinutes(current.getMinutes() + duration);
    }

    return slots;
  };
  const handleEditService = (service) => {
    // Populate formData with service details
    setFormData({
      name: service.name,
      description: service.description,
      category: service.category,
      isActive: service.isActive,
      imageUrl: service.imageUrl,
      imagePublicId: service.imagePublicId,
      serviceOptions: service.ServiceOptions?.map(opt => ({
        id: opt.id,
        duration: opt.duration,
        price: opt.price,
        optionName: opt.optionName
      })) || [],
      availabilitySettings: {
        operatingHours: {
          start: service.ServiceAvailabilities?.[0]?.startTime?.slice(0, 5) || "09:00",
          end: service.ServiceAvailabilities?.[service.ServiceAvailabilities.length - 1]?.startTime?.slice(0, 5) || "18:00"
        },
        selectedDays: [...new Set(service.ServiceAvailabilities?.map(a => a.dayOfWeek) || [])],
        globalBookingLimit: service.ServiceAvailabilities?.[0]?.bookingLimit || 3,
        autoGenerate: true
      },
      availabilityRules: [] // You may want to reconstruct this if needed
    });
    setSelectedService(service);
    setIsEditMode(true);
    setAddModalOpen(true);
  };
  // Auto-generate availability rules when options or settings change
  useEffect(() => {
    if (formData.availabilitySettings.autoGenerate && formData.serviceOptions.length > 0) {
      const newRules = [];

      formData.availabilitySettings.selectedDays.forEach(dayIdx => {
        formData.serviceOptions.forEach(option => {
          const timeSlots = generateTimeSlots(
            formData.availabilitySettings.operatingHours.start,
            formData.availabilitySettings.operatingHours.end,
            option.duration
          );

          const availabilityRule = {
            id: uuidv4(),
            dayOfWeek: dayIdx,
            serviceOptionId: option.id,
            duration: option.duration,
            timeSlots: timeSlots.map(time => ({
              time,
              bookingLimit: formData.availabilitySettings.globalBookingLimit,
              isActive: true
            })),
            isActive: true
          };

          newRules.push(availabilityRule);
        });
      });

      setFormData(prev => ({
        ...prev,
        availabilityRules: newRules
      }));
    }
  }, [
    formData.serviceOptions,
    formData.availabilitySettings.selectedDays,
    formData.availabilitySettings.operatingHours,
    formData.availabilitySettings.globalBookingLimit,
    formData.availabilitySettings.autoGenerate
  ]);

  // Fetch services with options and availability
  const fetchServices = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        includeOptions: true,
        includeAvailability: true,
        isActive: statusFilter === "all" ? undefined : statusFilter === "active",
      };
      const response = await apiClient.get("/services", { params });
      setServices(response.data || []);
      setTotalServices((response.data || []).length);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load services.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [statusFilter]);

  // Filter services client-side by search term
  const filteredServices = services.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Pagination handlers
  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Modal handlers
  const openViewModal = (service) => {
    setSelectedService(service);
    setViewModalOpen(true);
  };

  const openAddModal = () => {
    setFormData({
      name: "",
      description: "",
      category: "",
      isActive: true,
      imageUrl: "",
      imagePublicId: "",
      serviceOptions: [{
        id: uuidv4(),
        duration: 60,
        price: 100,
        optionName: "Standard Session"
      }],
      availabilitySettings: {
        operatingHours: {
          start: "09:00",
          end: "18:00"
        },
        selectedDays: [],
        globalBookingLimit: 3,
        autoGenerate: true
      },
      availabilityRules: []
    });
    setFormError(null);
    setAddModalOpen(true);
  };

  // Service option handlers
  const handleOptionChange = (index, field, value) => {
    const newOptions = [...formData.serviceOptions];
    newOptions[index][field] = value;
    setFormData({ ...formData, serviceOptions: newOptions });
  };

  const handleAddOption = () => {
    setFormData(prev => ({
      ...prev,
      serviceOptions: [...prev.serviceOptions, {
        id: uuidv4(),
        duration: 60,
        price: 100,
        optionName: ""
      }],
    }));
  };

  const handleRemoveOption = (index) => {
    if (formData.serviceOptions.length > 1) {
      const newOptions = [...formData.serviceOptions];
      newOptions.splice(index, 1);
      setFormData({ ...formData, serviceOptions: newOptions });
    }
  };

  // Availability settings handlers
  const handleAvailabilitySettingChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      availabilitySettings: {
        ...prev.availabilitySettings,
        [field]: value
      }
    }));
  };

  const handleOperatingHoursChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      availabilitySettings: {
        ...prev.availabilitySettings,
        operatingHours: {
          ...prev.availabilitySettings.operatingHours,
          [field]: value
        }
      }
    }));
  };

  const handleDaySelection = (dayIdx) => {
    const selectedDays = formData.availabilitySettings.selectedDays;
    const newSelectedDays = selectedDays.includes(dayIdx)
      ? selectedDays.filter(d => d !== dayIdx)
      : [...selectedDays, dayIdx];

    handleAvailabilitySettingChange('selectedDays', newSelectedDays);
  };

  // Manual availability rule handlers
  const handleTimeSlotChange = (ruleId, slotIdx, field, value) => {
    setFormData(prev => ({
      ...prev,
      availabilityRules: prev.availabilityRules.map(rule =>
        rule.id === ruleId
          ? {
            ...rule,
            timeSlots: rule.timeSlots.map((slot, idx) =>
              idx === slotIdx ? { ...slot, [field]: value } : slot
            )
          }
          : rule
      )
    }));
  };

  const handleAddTimeSlot = (ruleId) => {
    setFormData(prev => ({
      ...prev,
      availabilityRules: prev.availabilityRules.map(rule =>
        rule.id === ruleId
          ? {
            ...rule,
            timeSlots: [...rule.timeSlots, {
              time: '09:00',
              bookingLimit: formData.availabilitySettings.globalBookingLimit,
              isActive: true
            }]
          }
          : rule
      )
    }));
  };

  const handleRemoveTimeSlot = (ruleId, slotIdx) => {
    setFormData(prev => ({
      ...prev,
      availabilityRules: prev.availabilityRules.map(rule =>
        rule.id === ruleId
          ? {
            ...rule,
            timeSlots: rule.timeSlots.filter((_, idx) => idx !== slotIdx)
          }
          : rule
      )
    }));
  };

  // Image upload
  const onDrop = async (acceptedFiles) => {
    if (!acceptedFiles.length) return;
    const file = acceptedFiles[0];
    try {
      const uploadData = new FormData();
      uploadData.append('file', file);
      const res = await apiClient.post('/upload/image', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // Ensure imageUrl is absolute
      // const baseUrl = "http://localhost:5001";
      const baseUrl = "https://spa-api.algosoftwarelabs.com";

      setFormData(prev => ({
        ...prev,
        imageUrl: res.data.url.startsWith('http')
          ? res.data.url
          : baseUrl + res.data.url,
        imagePublicId: res.data.publicId,
      }));
    } catch {
      setFormError('Image upload failed.');
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'image/*': [] } });



  // Add Service submit
  const handleAddService = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFormError(null);

    try {
      if (isEditMode && selectedService) {
        // 1. Update main service
        const servicePayload = {
          name: formData.name,
          description: formData.description,
          category: formData.category,
          isActive: formData.isActive,
          imageUrl: formData.imageUrl,
          imagePublicId: formData.imagePublicId,
        };
        await apiClient.put(`/services/${selectedService.id}`, servicePayload);

        // 2. Sync Service Options
        const existingOptions = selectedService.ServiceOptions || [];
        const newOptions = formData.serviceOptions;

        // Update or create options
        for (const opt of newOptions) {
          if (opt.id && existingOptions.some(o => o.id === opt.id)) {
            // Update existing option
            await apiClient.put(`/services/options/${opt.id}`, {
              duration: parseInt(opt.duration),
              price: parseFloat(opt.price),
              optionName: opt.optionName,
            });
          } else {
            // Create new option
            await apiClient.post(`/services/${selectedService.id}/options`, {
              duration: parseInt(opt.duration),
              price: parseFloat(opt.price),
              optionName: opt.optionName,
            });
          }
        }
        // Delete removed options
        for (const oldOpt of existingOptions) {
          if (!newOptions.some(opt => opt.id === oldOpt.id)) {
            await apiClient.delete(`/services/options/${oldOpt.id}`);
          }
        }

        // 3. Sync Availabilities
        const existingAvail = selectedService.ServiceAvailabilities || [];
        // Flatten new availabilities from formData.availabilityRules
        const newAvailFlat = [];
        for (const rule of formData.availabilityRules) {
          for (const slot of rule.timeSlots) {
            if (slot.isActive) {
              newAvailFlat.push({
                id: slot.id, // If you store id in slot, otherwise match by fields
                serviceOptionId: rule.serviceOptionId,
                dayOfWeek: rule.dayOfWeek,
                startTime: slot.time,
                bookingLimit: parseInt(slot.bookingLimit),
                isActive: true,
              });
            }
          }
        }
        // Update or create availabilities
        for (const avail of newAvailFlat) {
          // Try to find a matching existing availability
          const match = existingAvail.find(a =>
            a.serviceOptionId === avail.serviceOptionId &&
            a.dayOfWeek === avail.dayOfWeek &&
            a.startTime.slice(0, 5) === avail.startTime
          );
          if (match) {
            // Update
            await apiClient.put(`/services/availability/${match.id}`, avail);
          } else {
            // Create
            await apiClient.post(`/services/${selectedService.id}/availability`, avail);
          }
        }
        // Delete removed availabilities
        for (const oldAvail of existingAvail) {
          const stillExists = newAvailFlat.some(avail =>
            avail.serviceOptionId === oldAvail.serviceOptionId &&
            avail.dayOfWeek === oldAvail.dayOfWeek &&
            avail.startTime === oldAvail.startTime.slice(0, 5)
          );
          if (!stillExists) {
            await apiClient.delete(`/services/availability/${oldAvail.id}`);
          }
        }
      } else {
        // --- ADD SERVICE LOGIC (unchanged) ---
        const servicePayload = {
          name: formData.name,
          description: formData.description,
          category: formData.category,
          isActive: formData.isActive,
          imageUrl: formData.imageUrl,
          imagePublicId: formData.imagePublicId,
        };
        const serviceRes = await apiClient.post('/services', servicePayload);
        const serviceId = serviceRes.data.id;

        // 2. Create service options
        const createdOptions = [];
        for (const opt of formData.serviceOptions) {
          const optionRes = await apiClient.post(`/services/${serviceId}/options`, {
            duration: parseInt(opt.duration),
            price: parseFloat(opt.price),
            optionName: opt.optionName,
          });
          createdOptions.push({
            ...opt,
            id: optionRes.data.id
          });
        }
        // --- FIX: Map old option IDs to new DB IDs ---
        const optionIdMap = {};
        formData.serviceOptions.forEach((opt, idx) => {
          optionIdMap[opt.id] = createdOptions[idx].id;
        });
        const updatedRules = formData.availabilityRules.map(rule => ({
          ...rule,
          serviceOptionId: optionIdMap[rule.serviceOptionId] || rule.serviceOptionId,
        }));
        // 3. Create availability rules
        for (const rule of updatedRules) {
          const matchingOption = createdOptions.find(opt => opt.id === rule.serviceOptionId);
          if (matchingOption) {
            for (const slot of rule.timeSlots) {
              if (slot.isActive) {
                await apiClient.post(`/services/${serviceId}/availability`, {
                  serviceOptionId: matchingOption.id,
                  dayOfWeek: rule.dayOfWeek,
                  startTime: slot.time,
                  bookingLimit: parseInt(slot.bookingLimit),
                  isActive: true,
                });
              }
            }
          }
        }
      }
      fetchServices();
      setAddModalOpen(false);
      setIsEditMode(false);
      setSelectedService(null);
    } catch (err) {
      if (err.response?.status === 409) {
        setFormError("A service with this name already exists.");
      } else {
        setFormError("Failed to save service.");
      }
    }
  };
  // Delete service
  const handleConfirmDelete = async () => {
    try {
      await apiClient.delete(`/services/${selectedService.id}`);
      fetchServices();
      setDeleteModalOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete service.");
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Services</Typography>
      <Stack direction="row" spacing={2} alignItems="center" mb={2}>
        <TextField
          size="small"
          placeholder="Search services..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
            endAdornment: searchTerm && (
              <IconButton onClick={() => setSearchTerm("")}><Clear /></IconButton>
            )
          }}
        />
        <FormControl size="small">
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={e => setStatusFilter(e.target.value)}
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </Select>
        </FormControl>
        {user?.role !== 'therapist' && (
          <Button startIcon={<Add />} variant="contained" onClick={openAddModal}>
            Add Service
          </Button>
        )}

      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box sx={{ width: '100%', overflowX: 'auto' }}>

        <StyledTableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Options</TableCell>
                <TableCell>Availability</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : filteredServices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No services found.
                  </TableCell>
                </TableRow>
              ) : filteredServices.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(service => (
                <TableRow key={service.id}>

                  <TableCell>{service.name}</TableCell>
                  <TableCell sx={{ textAlign: 'justify' }}>
                    {service.description.length > 50
                      ? `${service.description.substring(0, 50)}...`
                      : service.description
                    }
                  </TableCell>                  <TableCell>{service.category}</TableCell>
                  <TableCell>
                    {service.ServiceOptions?.map(opt =>
                      <Chip
                        key={opt.id}
                        label={`${opt.duration}min / $${opt.price}`}
                        size="small"
                        sx={{ mr: 0.5, mb: 0.5, fontSize: '0.60rem' }}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {service.ServiceAvailabilities?.length > 0
                      ? <Tooltip title={
                        service.ServiceAvailabilities.map(a =>
                          `${DAYS_OF_WEEK[a.dayOfWeek]} ${a.startTime?.slice(0, 5)}`
                        ).join(", ")
                      }>
                        <span>{service.ServiceAvailabilities.length} slots</span>
                      </Tooltip>
                      : <span>-</span>
                    }
                  </TableCell>
                  <TableCell>
                    <StatusChip
                      label={service.isActive ? "active" : "inactive"}
                      status={service.isActive ? "active" : "inactive"}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="View"><IconButton onClick={() => openViewModal(service)}><Visibility /></IconButton></Tooltip>
                    {user?.role !== 'therapist' && (
                      <>
                        <Tooltip title="Edit">
                          <IconButton color="primary" onClick={() => handleEditService(service)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Delete"><IconButton color="error" onClick={() => { setSelectedService(service); setDeleteModalOpen(true); }}><DeleteIcon /></IconButton></Tooltip>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={filteredServices.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </StyledTableContainer>
      </Box>
      {/* Enhanced Add Service Modal */}
      <Dialog
        open={addModalOpen}
        onClose={(event, reason) => {
          if (reason === "backdropClick" || reason === "escapeKeyDown") {
            return;
          }
          setAddModalOpen(false);
          setIsEditMode(false);
          setSelectedService(null);
        }} maxWidth="md"
        fullWidth
        disableEscapeKeyDown
      >
        <DialogTitle>Add New Service</DialogTitle>
        <DialogContent>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Box component="form" onSubmit={handleAddService} sx={{ mt: 1 }}>
            {/* Basic Service Information */}
            <Card sx={{ mb: 3 }}>
              <CardHeader title="Basic Information" />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Service Name"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      required fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Category"
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Description"
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      multiline rows={3} fullWidth
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Box
                      {...getRootProps()}
                      sx={{
                        border: '2px dashed #aaa',
                        borderRadius: 2,
                        p: 2,
                        textAlign: 'center',
                        cursor: 'pointer',
                        bgcolor: isDragActive ? 'action.hover' : 'background.paper'
                      }}
                    >
                      <input {...getInputProps()} />
                      {isDragActive
                        ? <Typography>Drop the image here ...</Typography>
                        : <Typography>Drag & drop an image here, or click to select</Typography>
                      }
                      {formData.imageUrl && (
                        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <img src={formData.imageUrl} alt="Service" style={{ maxWidth: '200px', borderRadius: '8px', marginRight: 8 }} />
                          <IconButton color="error" onClick={e => { e.stopPropagation(); setFormData(prev => ({ ...prev, imageUrl: '', imagePublicId: '' })); }}>
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      )}
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.isActive}
                          onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                        />
                      }
                      label="Active"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Service Options */}
            <Card sx={{ mb: 3 }}>
              <CardHeader
                title="Service Options"
                subheader="Define different duration options with their respective prices"
                action={
                  <Button startIcon={<Add />} onClick={handleAddOption}>
                    Add Option
                  </Button>
                }
              />
              <CardContent>
                {formData.serviceOptions.map((opt, idx) => (
                  <Card key={opt.id} variant="outlined" sx={{ mb: 2 }}>
                    <CardContent>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={3}>
                          <TextField
                            label="Duration (minutes)"
                            type="number"
                            value={opt.duration}
                            onChange={e => handleOptionChange(idx, 'duration', parseInt(e.target.value))}
                            fullWidth
                            required
                            inputProps={{ min: 15, step: 15 }}
                          />
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <TextField
                            label="Price ($)"
                            type="number"
                            value={opt.price}
                            onChange={e => handleOptionChange(idx, 'price', parseFloat(e.target.value))}
                            fullWidth
                            required
                            inputProps={{ min: 0, step: 0.01 }}
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <TextField
                            label="Option Name"
                            value={opt.optionName}
                            onChange={e => handleOptionChange(idx, 'optionName', e.target.value)}
                            fullWidth
                            placeholder={`${opt.duration}min Session`}
                          />
                        </Grid>
                        <Grid item xs={12} md={2}>
                          {formData.serviceOptions.length > 1 && (
                            <IconButton onClick={() => handleRemoveOption(idx)} color="error">
                              <DeleteIcon />
                            </IconButton>
                          )}
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>

            {/* Availability Settings */}
            <Card sx={{ mb: 3 }}>
              <CardHeader title="Availability Settings" />
              <CardContent>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" gutterBottom>Operating Hours</Typography>
                    <Stack direction="row" spacing={2}>
                      <TextField
                        label="Start Time"
                        type="time"
                        value={formData.availabilitySettings.operatingHours.start}
                        onChange={e => handleOperatingHoursChange('start', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{ width: 150 }}
                      />
                      <TextField
                        label="End Time"
                        type="time"
                        value={formData.availabilitySettings.operatingHours.end}
                        onChange={e => handleOperatingHoursChange('end', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{ width: 150 }}
                      />
                    </Stack>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="subtitle1" gutterBottom>Operating Days</Typography>
                    <Grid container spacing={1}>
                      {DAYS_OF_WEEK.map((day, idx) => (
                        <Grid item key={day}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={formData.availabilitySettings.selectedDays.includes(idx)}
                                onChange={() => handleDaySelection(idx)}
                              />
                            }
                            label={day}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Default Booking Limit per Slot"
                      type="number"
                      value={formData.availabilitySettings.globalBookingLimit}
                      onChange={e => handleAvailabilitySettingChange('globalBookingLimit', parseInt(e.target.value))}
                      fullWidth
                      inputProps={{ min: 1 }}
                      helperText="Maximum number of bookings per time slot"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.availabilitySettings.autoGenerate}
                          onChange={e => handleAvailabilitySettingChange('autoGenerate', e.target.checked)}
                        />
                      }
                      label="Auto-generate time slots based on duration intervals"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Generated Availability Preview */}
            {formData.availabilityRules.length > 0 && (
              <Card sx={{ mb: 3 }}>
                <CardHeader
                  title="Generated Availability Schedule"
                  subheader="Preview of auto-generated time slots for each service option"
                />
                <CardContent>
                  {formData.serviceOptions.map(option => (
                    <Accordion key={option.id} sx={{ mb: 2 }}>
                      <AccordionSummary expandIcon={<ExpandMore />}>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <AccessTime />
                          <Typography variant="subtitle1">
                            {option.optionName || `${option.duration}min Session`} - ${option.price}
                          </Typography>
                          <Chip
                            label={`${option.duration} min intervals`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </Stack>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Grid container spacing={2}>
                          {formData.availabilitySettings.selectedDays.map(dayIdx => {
                            const rule = formData.availabilityRules.find(
                              r => r.dayOfWeek === dayIdx && r.serviceOptionId === option.id
                            );
                            return (
                              <Grid item xs={12} md={6} key={dayIdx}>
                                <Card variant="outlined">
                                  <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                      {DAYS_OF_WEEK[dayIdx]}
                                    </Typography>
                                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                      {rule?.timeSlots.map((slot, slotIdx) => (
                                        <Chip
                                          key={slotIdx}
                                          label={`${slot.time} (${slot.bookingLimit})`}
                                          size="small"
                                          color={slot.isActive ? "success" : "default"}
                                          variant="outlined"
                                          onDelete={() => handleRemoveTimeSlot(rule.id, slotIdx)}
                                          deleteIcon={<Clear fontSize="small" />}
                                        />
                                      ))}
                                    </Stack>
                                  </CardContent>
                                </Card>
                              </Grid>
                            );
                          })}
                        </Grid>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </CardContent>
              </Card>
            )}


            <DialogActions sx={{ px: 0, pb: 0 }}>
              <Button onClick={() => setAddModalOpen(false)} disabled={loading}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={
                loading ||
                !formData.name ||
                formData.serviceOptions.length === 0 ||
                formData.availabilitySettings.selectedDays.length === 0
              } startIcon={loading ? <CircularProgress size={16} /> : null}>
                Create Service
              </Button>
            </DialogActions>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Delete Service Modal */}
      <Dialog open={deleteModalOpen} onClose={(event, reason) => {
        if (reason === "backdropClick" || reason === "escapeKeyDown") {
          return;
        }
        setDeleteModalOpen(false)
      }}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown
      >
        <DialogTitle>Delete Service</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the service <b>{selectedService?.name}</b>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteModalOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleConfirmDelete}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* View Service Modal */}
      <Dialog open={viewModalOpen} onClose={() => setViewModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Service Details</DialogTitle>
        <DialogContent>
          {selectedService && (
            <Box sx={{ mt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6">{selectedService.name}</Typography>
                  <Typography color="text.secondary" paragraph>
                    {selectedService.description}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Category:</strong> {selectedService.category}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Status:</strong> {selectedService.isActive ? 'Active' : 'Inactive'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  {selectedService.imageUrl && (
                    <img
                      src={selectedService.imageUrl}
                      alt={selectedService.name}
                      style={{ width: '100%', maxWidth: '300px', borderRadius: '8px' }}
                    />
                  )}
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" gutterBottom>Service Options</Typography>
              <Grid container spacing={1}>
                {selectedService.ServiceOptions?.map(opt => (
                  <Grid item key={opt.id}>
                    <Chip
                      label={`${opt.optionName || 'Session'}: ${opt.duration}min - ${opt.price}`}
                      color="primary"
                      variant="outlined"
                    />
                  </Grid>
                ))}
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" gutterBottom>Availability</Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedService.ServiceAvailabilities?.length || 0} time slots available
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewModalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}