import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus as AddIcon, Pencil as EditIcon, Trash as DeleteIcon, Loader2 } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { useSnackbar } from 'notistack';

import { getLeases, createLease, updateLease, deleteLease } from '../api/services/leaseService';
import { getTenants } from '../api/services/tenantService';
import { getUnitsForProperty } from '../api/services/propertyService';
import { Tenant as TenantType, LeaseAgreement } from '../api/types';

interface Unit {
  id: string;
  unit_number: string;
  status: string;
}

interface LeaseFormData {
  tenant_id: string;
  unit_id: string;
  start_date: Date | undefined;
  end_date: Date | undefined;
}

const LeaseManagement: React.FC = () => {
  const { propertyId } = useParams<{ propertyId: string }>();
  const { enqueueSnackbar } = useSnackbar();

  const [leases, setLeases] = useState<LeaseAgreement[]>([]);
  const [tenants, setTenants] = useState<TenantType[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [editingLease, setEditingLease] = useState<string | null>(null);
  const [formData, setFormData] = useState<LeaseFormData>({
    tenant_id: '',
    unit_id: '',
    start_date: undefined,
    end_date: undefined
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
        const response = await getUnitsForProperty(propertyId);
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
          unit_id: lease.unit_id,
          start_date: lease.start_date ? new Date(lease.start_date) : undefined,
          end_date: lease.end_date ? new Date(lease.end_date) : undefined
        });
      }
    } else {
      // Create mode
      setEditingLease(null);
      setFormData({
        tenant_id: '',
        unit_id: '',
        start_date: undefined,
        end_date: undefined
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingLease(null);
  };

  const handleDateChange = (name: string, date: Date | undefined) => {
    setFormData(prev => ({ ...prev, [name]: date }));
  };

  const handleSubmit = async () => {
    try {
      if (!propertyId) return;

      if (!formData.tenant_id || !formData.unit_id || !formData.start_date) {
        enqueueSnackbar('Please fill in all required fields', { variant: 'warning' });
        return;
      }

      const leaseData = {
        property_id: propertyId,
        tenant_id: formData.tenant_id,
        unit_id: formData.unit_id,
        start_date: formData.start_date.toISOString().split('T')[0],
        end_date: formData.end_date ? formData.end_date.toISOString().split('T')[0] : undefined
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
    try {
      await deleteLease(leaseId);
      enqueueSnackbar('Lease deleted successfully', { variant: 'success' });
      fetchLeases(); // Refresh the list
    } catch (error) {
      console.error('Error deleting lease:', error);
      enqueueSnackbar('Failed to delete lease', { variant: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading leases...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Lease Management</CardTitle>
            <Button onClick={() => handleOpenDialog()}>
              <AddIcon className="h-4 w-4 mr-2" />
              Add Lease
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leases.map((lease) => {
                const tenant = tenants.find(t => t.id === lease.tenant_id);
                const unit = units.find(u => u.id === lease.unit_id);
                
                return (
                  <TableRow key={lease.id}>
                    <TableCell>
                      {tenant?.name || lease.tenant_id}
                    </TableCell>
                    <TableCell>{unit?.unit_number || lease.unit_id}</TableCell>
                    <TableCell>
                      {lease.start_date ? format(new Date(lease.start_date), 'MMM dd, yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {lease.end_date ? format(new Date(lease.end_date), 'MMM dd, yyyy') : 'Ongoing'}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenDialog(lease.id)}
                        >
                          <EditIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(lease.id)}
                        >
                          <DeleteIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingLease ? 'Edit Lease' : 'Add New Lease'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tenant_id">Tenant</Label>
              <Select
                value={formData.tenant_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, tenant_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tenant" />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit_id">Unit</Label>
              <Select
                value={formData.unit_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, unit_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      Unit {unit.unit_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Start Date</Label>
              <DatePicker
                date={formData.start_date ? new Date(formData.start_date) : undefined}
                onSelect={(date) => handleDateChange('start_date', date)}
              />
            </div>

            <div className="space-y-2">
              <Label>End Date (Optional)</Label>
              <DatePicker
                date={formData.end_date ? new Date(formData.end_date) : undefined}
                onSelect={(date) => handleDateChange('end_date', date)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingLease ? 'Update' : 'Create'} Lease
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeaseManagement;
