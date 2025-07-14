import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Settings, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import * as tenantService from '@/api/services/tenantService';

interface TenantStatusManagerProps {
  tenantId: string;
  currentStatus: string;
  onStatusUpdate: (newStatus: string) => void;
  disabled?: boolean;
}

export default function TenantStatusManager({
  tenantId,
  currentStatus,
  onStatusUpdate,
  disabled = false
}: TenantStatusManagerProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState(currentStatus);
  const [reason, setReason] = useState('');
  const [showUpdateForm, setShowUpdateForm] = useState(false);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { 
        color: 'bg-green-100 text-green-800', 
        label: 'Active', 
        icon: CheckCircle 
      },
      inactive: { 
        color: 'bg-red-100 text-red-800', 
        label: 'Inactive', 
        icon: XCircle 
      },
      unassigned: { 
        color: 'bg-yellow-100 text-yellow-800', 
        label: 'Unassigned', 
        icon: AlertCircle 
      }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.unassigned;
    const IconComponent = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <IconComponent className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const handleUpdateStatus = async () => {
    if (!newStatus || newStatus === currentStatus) {
      toast.error('Please select a different status');
      return;
    }

    setIsUpdating(true);
    try {
      await tenantService.updateTenantStatus(
        tenantId, 
        newStatus as 'active' | 'inactive' | 'unassigned',
        reason
      );
      
      onStatusUpdate(newStatus);
      setShowUpdateForm(false);
      setReason('');
      toast.success('Status updated successfully');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    setNewStatus(currentStatus);
    setReason('');
    setShowUpdateForm(false);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Tenant Status Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">Current Status</p>
            {getStatusBadge(currentStatus)}
          </div>
          
          {!showUpdateForm && (
            <Button
              onClick={() => setShowUpdateForm(true)}
              disabled={disabled}
            >
              Update Status
            </Button>
          )}
        </div>

        {showUpdateForm && (
          <div className="space-y-4 border-t pt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Status
              </label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Active
                    </div>
                  </SelectItem>
                  <SelectItem value="inactive">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-600" />
                      Inactive
                    </div>
                  </SelectItem>
                  <SelectItem value="unassigned">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                      Unassigned
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Change (Optional)
              </label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason for status change..."
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                onClick={handleCancel}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateStatus}
                disabled={isUpdating || !newStatus}
              >
                {isUpdating ? 'Updating...' : 'Update Status'}
              </Button>
            </div>
          </div>
        )}

        {/* Status Change History */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Business Logic Rules</h4>
          <div className="space-y-2 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-green-600" />
              <span><strong>Active:</strong> Tenant must have an active lease assignment</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="w-3 h-3 text-red-600" />
              <span><strong>Inactive:</strong> Tenant cannot have had active lease in last 3 months</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-3 h-3 text-yellow-600" />
              <span><strong>Unassigned:</strong> Tenant cannot have active lease assignments</span>
            </div>
          </div>
          <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
            <strong>Note:</strong> Status changes are automatically validated against these rules. 
            If a status change fails, ensure the tenant's lease status meets the requirements.
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 