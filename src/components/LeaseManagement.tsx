import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material';
import { Plus as AddIcon, Pencil as EditIcon, Trash as DeleteIcon } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { useSnackbar } from 'notistack';

import { getLeases, getLease, createLease, updateLease, deleteLease } from '../api/services/leaseService';
import { getTenants } from '../api/services/tenantService';
import { getUnits } from '../api/services/propertyService';

interface Lease {
  id: string;
  property_id: string;
  tenant_id: string;
  unit_number: string;
  start_date: string;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  tenant_details?: {
    name: string;
    email: string;
    phone: string;
  };
}

interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface Unit {
  id: string;
  unit_number: string;
  status: string;
}

interface LeaseFormData {
  tenant_id: string;
  unit_number: string;
  start_date: Date | null;
  end_date: Date | null;
}

const LeaseManagement: React.FC = () => {
  const { propertyId } = useParams<{ propertyId: string }>();
  const { enqueueSnackbar } = useSnackbar();

  const [leases, setLeases] = useState<Lease[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [editingLease, setEditingLease] = useState<string | null>(null);
  const [formData, setFormData] = useState<LeaseFormData>({
    tenant_id: '',
    unit_number: '',
    start_date: null,
    end_date: null
  });

  useEffect(() => {
    if (propertyId) {
      fetchLeases();
      fetchTenants();
      fetchUnits();
    }
  }, [propertyId]);

  const fetchLeases = async () => {
    try {
      setLoading(true);
      const response = await getLeases({ property_id: propertyId });
      setLeases(response.items || []);
    } catch (error) {
      console.error('Error fetching leases:', error);
      enqueueSnackbar('Failed to load leases', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      const response = await getTenants();
      setTenants(response.items || []);
    } catch (error) {
      console.error('Error fetching tenants:', error);
      enqueueSnackbar('Failed to load tenants', { variant: 'error' });
    }
  };

  const fetchUnits = async () => {
    try {
      if (propertyId) {
        const response = await getUnits(propertyId);
        setUnits(response || []);
      }
    } catch (error) {
      console.error('Error fetching units:', error);
      enqueueSnackbar('Failed to load units', { variant: 'error' });
    }
  };

  const handleOpenDialog = (leaseId?: string) => {
    if (leaseId) {
      // Edit mode
      setEditingLease(leaseId);
      const lease = leases.find(l => l.id === leaseId);
      if (lease) {
        setFormData({
          tenant_id: lease.tenant_id,
          unit_number: lease.unit_number,
          start_date: lease.start_date ? new Date(lease.start_date) : null,
          end_date: lease.end_date ? new Date(lease.end_date) : null
        });
      }
    } else {
      // Create mode
      setEditingLease(null);
      setFormData({
        tenant_id: '',
        unit_number: '',
        start_date: null,
        end_date: null
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingLease(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (name: string, date: Date | null) => {
    setFormData(prev => ({ ...prev, [name]: date }));
  };

  const handleSubmit = async () => {
    try {
      if (!propertyId) return;

      if (!formData.tenant_id || !formData.unit_number || !formData.start_date) {
        enqueueSnackbar('Please fill in all required fields', { variant: 'warning' });
        return;
      }

      const leaseData = {
        property_id: propertyId,
        tenant_id: formData.tenant_id,
        unit_number: formData.unit_number,
        start_date: formData.start_date.toISOString().split('T')[0],
        end_date: formData.end_date ? formData.end_date.toISOString().split('T')[0] : null
      };

      if (editingLease) {
        // Update existing lease
        await updateLease(editingLease, leaseData);
        enqueueSnackbar('Lease updated successfully', { variant: 'success' });
      } else {
        // Create new lease
        await createLease(leaseData);
        enqueueSnackbar('Lease created successfully', { variant: 'success' });
      }

      handleCloseDialog();
      fetchLeases(); // Refresh the list
    } catch (error) {
      console.error('Error saving lease:', error);
      enqueueSnackbar('Failed to save lease', { variant: 'error' });
    }
  };

  const handleDelete = async (leaseId: string) => {
    if (window.confirm('Are you sure you want to delete this lease?')) {
      try {
        await deleteLease(leaseId);
        enqueueSnackbar('Lease deleted successfully', { variant: 'success' });
        fetchLeases(); // Refresh the list
      } catch (error) {
        console.error('Error deleting lease:', error);
        enqueueSnackbar('Failed to delete lease', { variant: 'error' });
      }
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" component="h1">
          Lease Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Lease
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
                <TableCell>Tenant</TableCell>
                <TableCell>Unit</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>End Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leases.length > 0 ? (
                leases.map((lease) => (
                  <TableRow key={lease.id}>
                    <TableCell>
                      {lease.tenant_details?.name || 'Unknown'}
                      <Typography variant="caption" display="block">
                        {lease.tenant_details?.email || 'No email'}
                      </Typography>
                    </TableCell>
                    <TableCell>{lease.unit_number}</TableCell>
                    <TableCell>{format(new Date(lease.start_date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      {lease.end_date
                        ? format(new Date(lease.end_date), 'MMM dd, yyyy')
                        : 'No end date'
                      }
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Edit">
                        <IconButton onClick={() => handleOpenDialog(lease.id)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton onClick={() => handleDelete(lease.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No leases found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Lease Form Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingLease ? 'Edit Lease' : 'Add New Lease'}</DialogTitle>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  fullWidth
                  label="Tenant"
                  name="tenant_id"
                  value={formData.tenant_id}
                  onChange={handleInputChange}
                  required
                >
                  {tenants.map((tenant) => (
                    <MenuItem key={tenant.id} value={tenant.id}>
                      {tenant.name} ({tenant.email})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  fullWidth
                  label="Unit"
                  name="unit_number"
                  value={formData.unit_number}
                  onChange={handleInputChange}
                  required
                >
                  {units.map((unit) => (
                    <MenuItem key={unit.id} value={unit.unit_number}>
                      {unit.unit_number} ({unit.status})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <DatePicker
                  label="Start Date"
                  value={formData.start_date}
                  onChange={(date) => handleDateChange('start_date', date)}
                  slotProps={{ textField: { fullWidth: true, required: true } }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <DatePicker
                  label="End Date"
                  value={formData.end_date}
                  onChange={(date) => handleDateChange('end_date', date)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
            </Grid>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {editingLease ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LeaseManagement;
