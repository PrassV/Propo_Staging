import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Button,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Visibility as VisibilityIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';

import { getMaintenanceRequests, createMaintenanceRequest } from '../../api/services/maintenanceService';
import { getProperties } from '../../api/services/propertyService';

// Define types
interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  property_id: string;
  unit_number?: string;
  created_at: string;
  updated_at: string;
  property_details?: {
    property_name: string;
    address_line1: string;
    city: string;
    state: string;
  };
}

interface Property {
  id: string;
  property_name: string;
  units?: Array<{
    id: string;
    unit_number: string;
  }>;
}

interface MaintenanceFormData {
  title: string;
  description: string;
  priority: string;
  category: string;
  property_id: string;
  unit_number?: string;
}

const MaintenanceList: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [units, setUnits] = useState<Array<{id: string, unit_number: string}>>([]);
  
  const [formData, setFormData] = useState<MaintenanceFormData>({
    title: '',
    description: '',
    priority: 'medium',
    category: 'plumbing',
    property_id: '',
    unit_number: ''
  });

  useEffect(() => {
    fetchMaintenanceRequests();
    fetchProperties();
  }, []);

  useEffect(() => {
    if (selectedProperty) {
      const property = properties.find(p => p.id === selectedProperty);
      setUnits(property?.units || []);
      setFormData(prev => ({
        ...prev,
        property_id: selectedProperty,
        unit_number: ''
      }));
    }
  }, [selectedProperty, properties]);

  const fetchMaintenanceRequests = async () => {
    try {
      setLoading(true);
      const response = await getMaintenanceRequests();
      setMaintenanceRequests(response.items || []);
    } catch (error) {
      console.error('Error fetching maintenance requests:', error);
      enqueueSnackbar('Failed to load maintenance requests', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    try {
      const response = await getProperties();
      setProperties(response.items || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
      enqueueSnackbar('Failed to load properties', { variant: 'error' });
    }
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      category: 'plumbing',
      property_id: '',
      unit_number: ''
    });
    setSelectedProperty('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    if (name) {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handlePropertyChange = (e: React.ChangeEvent<{ name?: string; value: unknown }>) => {
    const value = e.target.value as string;
    setSelectedProperty(value);
  };

  const handleSubmit = async () => {
    try {
      if (!formData.title || !formData.description || !formData.property_id) {
        enqueueSnackbar('Please fill in all required fields', { variant: 'warning' });
        return;
      }

      await createMaintenanceRequest(formData);
      enqueueSnackbar('Maintenance request created successfully', { variant: 'success' });
      handleCloseDialog();
      fetchMaintenanceRequests();
    } catch (error) {
      console.error('Error creating maintenance request:', error);
      enqueueSnackbar('Failed to create maintenance request', { variant: 'error' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new':
        return 'info';
      case 'in_progress':
        return 'warning';
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'low':
        return 'success';
      case 'medium':
        return 'warning';
      case 'high':
        return 'error';
      case 'emergency':
        return 'error';
      default:
        return 'default';
    }
  };

  const handleViewDetails = (id: string) => {
    navigate(`/dashboard/maintenance/${id}`);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" component="h1">
          Maintenance Requests
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
        >
          New Request
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Property</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {maintenanceRequests.length > 0 ? (
                maintenanceRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>{request.title}</TableCell>
                    <TableCell>
                      {request.property_details?.property_name || 'Unknown'}
                      {request.unit_number && (
                        <Typography variant="caption" display="block">
                          Unit: {request.unit_number}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={request.status.replace('_', ' ')} 
                        color={getStatusColor(request.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={request.priority} 
                        color={getPriorityColor(request.priority) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {format(new Date(request.created_at), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton onClick={() => handleViewDetails(request.id)}>
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No maintenance requests found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create Maintenance Request Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>Create Maintenance Request</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                multiline
                rows={4}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Property</InputLabel>
                <Select
                  value={selectedProperty}
                  onChange={handlePropertyChange}
                  label="Property"
                  required
                >
                  {properties.map((property) => (
                    <MenuItem key={property.id} value={property.id}>
                      {property.property_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Unit (Optional)</InputLabel>
                <Select
                  value={formData.unit_number || ''}
                  onChange={handleInputChange}
                  name="unit_number"
                  label="Unit (Optional)"
                  disabled={!selectedProperty || units.length === 0}
                >
                  {units.map((unit) => (
                    <MenuItem key={unit.id} value={unit.unit_number}>
                      {unit.unit_number}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={formData.priority}
                  onChange={handleInputChange}
                  name="priority"
                  label="Priority"
                  required
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="emergency">Emergency</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category}
                  onChange={handleInputChange}
                  name="category"
                  label="Category"
                  required
                >
                  <MenuItem value="plumbing">Plumbing</MenuItem>
                  <MenuItem value="electrical">Electrical</MenuItem>
                  <MenuItem value="hvac">HVAC</MenuItem>
                  <MenuItem value="appliance">Appliance</MenuItem>
                  <MenuItem value="structural">Structural</MenuItem>
                  <MenuItem value="pest_control">Pest Control</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MaintenanceList;
