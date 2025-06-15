import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, 
  Download, 
  MessageSquare, 
  Settings,
  X,
  Send,
  CheckCircle
} from "lucide-react";
import { Tenant } from '@/api/types';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BulkOperationsPanelProps {
  selectedTenants: Tenant[];
  onClearSelection: () => void;
  onBulkUpdate: (tenantIds: string[], updates: Record<string, unknown>) => Promise<void>;
  onBulkNotify: (tenantIds: string[], notification: NotificationData) => Promise<void>;
  onExport: (tenantIds: string[]) => Promise<void>;
}

interface NotificationData {
  subject: string;
  message: string;
  type: 'email' | 'in_app' | 'both';
  priority: 'low' | 'normal' | 'high';
}

interface BulkUpdateData {
  status?: string;
  notes?: string;
}

export default function BulkOperationsPanel({
  selectedTenants,
  onClearSelection,
  onBulkUpdate,
  onBulkNotify,
  onExport
}: BulkOperationsPanelProps) {
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Notification form state
  const [notificationData, setNotificationData] = useState<NotificationData>({
    subject: '',
    message: '',
    type: 'email',
    priority: 'normal'
  });

  // Update form state
  const [updateData, setUpdateData] = useState<BulkUpdateData>({
    status: '',
    notes: ''
  });

  const handleBulkNotification = async () => {
    if (!notificationData.subject.trim() || !notificationData.message.trim()) {
      toast.error('Please fill in both subject and message');
      return;
    }

    setIsLoading(true);
    try {
      const tenantIds = selectedTenants.map(t => t.id);
      await onBulkNotify(tenantIds, notificationData);
      toast.success(`Notification sent to ${selectedTenants.length} tenants`);
      setShowNotificationDialog(false);
      setNotificationData({ subject: '', message: '', type: 'email', priority: 'normal' });
    } catch {
      toast.error('Failed to send notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkUpdate = async () => {
    if (!updateData.status && !updateData.notes?.trim()) {
      toast.error('Please select at least one field to update');
      return;
    }

    setIsLoading(true);
    try {
      const tenantIds = selectedTenants.map(t => t.id);
      const updates: Record<string, unknown> = {};
      if (updateData.status) updates.status = updateData.status;
      if (updateData.notes?.trim()) updates.notes = updateData.notes;
      
      await onBulkUpdate(tenantIds, updates);
      toast.success(`Updated ${selectedTenants.length} tenants`);
      setShowUpdateDialog(false);
      setUpdateData({ status: '', notes: '' });
    } catch {
      toast.error('Failed to update tenants');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    setIsLoading(true);
    try {
      const tenantIds = selectedTenants.map(t => t.id);
      await onExport(tenantIds);
      toast.success(`Exported data for ${selectedTenants.length} tenants`);
    } catch {
      toast.error('Failed to export data');
    } finally {
      setIsLoading(false);
    }
  };

  if (selectedTenants.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-900">
                  {selectedTenants.length} tenant{selectedTenants.length !== 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {selectedTenants.slice(0, 3).map((tenant) => (
                  <Badge key={tenant.id} variant="secondary" className="text-xs">
                    {tenant.name}
                  </Badge>
                ))}
                {selectedTenants.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{selectedTenants.length - 3} more
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Bulk Operations */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNotificationDialog(true)}
                disabled={isLoading}
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Message
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUpdateDialog(true)}
                disabled={isLoading}
              >
                <Settings className="h-4 w-4 mr-2" />
                Bulk Update
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={isLoading}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={onClearSelection}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Dialog */}
      <Dialog open={showNotificationDialog} onOpenChange={setShowNotificationDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Send Message to {selectedTenants.length} Tenant{selectedTenants.length !== 1 ? 's' : ''}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="notification-type">Delivery Method</Label>
                <Select
                  value={notificationData.type}
                  onValueChange={(value: 'email' | 'in_app' | 'both') => 
                    setNotificationData(prev => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email Only</SelectItem>
                    <SelectItem value="in_app">In-App Only</SelectItem>
                    <SelectItem value="both">Email + In-App</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notification-priority">Priority</Label>
                <Select
                  value={notificationData.priority}
                  onValueChange={(value: 'low' | 'normal' | 'high') => 
                    setNotificationData(prev => ({ ...prev, priority: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="notification-subject">Subject</Label>
              <Input
                id="notification-subject"
                value={notificationData.subject}
                onChange={(e) => setNotificationData(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Enter message subject..."
              />
            </div>

            <div>
              <Label htmlFor="notification-message">Message</Label>
              <Textarea
                id="notification-message"
                value={notificationData.message}
                onChange={(e) => setNotificationData(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Enter your message..."
                rows={6}
              />
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Recipients:</strong> {selectedTenants.map(t => t.name).join(', ')}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNotificationDialog(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkNotification}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Message
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Update Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Bulk Update {selectedTenants.length} Tenant{selectedTenants.length !== 1 ? 's' : ''}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="bulk-status">Status</Label>
              <Select
                value={updateData.status}
                onValueChange={(value) => setUpdateData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select new status (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Change</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="bulk-notes">Notes</Label>
              <Textarea
                id="bulk-notes"
                value={updateData.notes}
                onChange={(e) => setUpdateData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add notes to all selected tenants (optional)..."
                rows={4}
              />
            </div>

            <div className="bg-yellow-50 p-3 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Warning:</strong> This will update all {selectedTenants.length} selected tenants. This action cannot be undone.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUpdateDialog(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkUpdate}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Updating...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Update Tenants
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 