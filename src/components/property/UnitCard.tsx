import React, { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ChevronDown, 
  ChevronRight, 
  MoreVertical, 
  User, 
  DollarSign, 
  KeyRound, 
  Plus, 
  Clock, 
  Wrench
} from "lucide-react";

import { UnitLeaseDetail } from "../../api/types";
import TenantInfoTab from './details/TenantInfoTab';
import LeaseInfoTab from './details/LeaseInfoTab';
import LeaseHistoryTab from './details/LeaseHistoryTab';
import MaintenanceListTab from './details/MaintenanceListTab';
import PaymentListTab from './details/PaymentListTab';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteUnit } from '@/api/services/unitService';
import { toast } from 'sonner';
import CreateLeaseModal from './CreateLeaseModal';

const getLeaseProgress = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();
  
  if (now < start) return 0; // Lease hasn't started yet
  if (now > end) return 100; // Lease has ended
  
  const total = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();
  return Math.round((elapsed / total) * 100);
};

// Helper function to get unit display status
const getUnitDisplayStatus = (unit: UnitLeaseDetail) => {
  // Define Badge variant type
  type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | null | undefined;
  
  // Check if unit has a status field (from API)
  if (unit.status) {
    switch (unit.status.toLowerCase()) {
      case 'occupied':
        return { 
          label: 'Occupied', 
          variant: 'default' as BadgeVariant, 
          isOccupied: true,
          description: 'This unit is currently occupied with an active lease.'
        };
      case 'upcoming':
        return { 
          label: 'Upcoming Lease', 
          variant: 'secondary' as BadgeVariant, 
          isOccupied: false,
          description: 'This unit has an upcoming lease but is currently vacant.'
        };
      case 'vacant':
      default:
        return { 
          label: 'Vacant', 
          variant: 'outline' as BadgeVariant, 
          isOccupied: false,
          description: 'This unit is available for new tenant assignment.'
        };
    }
  }
  
  // Fallback to is_occupied field
  const isOccupied = unit.is_occupied || false;
  return {
    label: isOccupied ? 'Occupied' : 'Vacant',
    variant: (isOccupied ? 'default' : 'outline') as BadgeVariant,
    isOccupied,
    description: isOccupied 
      ? 'This unit is currently occupied with an active lease.'
      : 'This unit is available for new tenant assignment.'
  };
};

interface UnitCardProps {
  unit: UnitLeaseDetail;
  onUpdate?: () => void;
  className?: string;
  propertyId: string;
}

export default function UnitCard({ unit, onUpdate, className, propertyId }: UnitCardProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [showCreateLeaseModal, setShowCreateLeaseModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    
    const handleDelete = async () => {
      try {
        await deleteUnit(unit.id);
        toast.success(`Unit ${unit.unit_number} has been deleted.`);
        onUpdate?.();
      } catch (error) {
        toast.error("Failed to delete unit. Please try again.");
        console.error("Delete unit error:", error);
      } finally {
        setShowDeleteConfirm(false);
      }
    };

    const lease = unit.lease;
    const leaseProgress = lease ? getLeaseProgress(lease.start_date, lease.end_date) : 0;
    const unitStatus = getUnitDisplayStatus(unit);

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
        <Card className="w-full transition-all hover:shadow-md">
          <CardHeader className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center space-x-3 cursor-pointer">
                    {isOpen ? <ChevronDown size={24} className="text-gray-500"/> : <ChevronRight size={24} className="text-gray-500"/>}
                    <CardTitle>Unit {unit.unit_number}</CardTitle>
                    <Badge variant={unitStatus.variant} className="text-sm">
                      {unitStatus.label}
                    </Badge>
                  </div>
                </CollapsibleTrigger>
                {/* Show tenant info for occupied units */}
                {unitStatus.isOccupied && lease && lease.tenant && (
                  <div className="pl-9 space-y-3 text-sm text-gray-700">
                    <div className="flex items-center space-x-2">
                      <User size={16} className="text-gray-500"/>
                      <span>{lease.tenant.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <DollarSign size={16} className="text-gray-500"/>
                      <span>${lease.rent_amount} / month</span>
                    </div>
                  </div>
                )}
                {/* Show upcoming lease info */}
                {unit.status === 'upcoming' && lease && lease.tenant && (
                  <div className="pl-9 space-y-3 text-sm text-blue-700 bg-blue-50 p-3 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Clock size={16} className="text-blue-500"/>
                      <span className="font-medium">Upcoming: {lease.tenant.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <DollarSign size={16} className="text-blue-500"/>
                      <span>${lease.rent_amount} / month</span>
                    </div>
                    <div className="text-xs text-blue-600">
                      Lease starts: {new Date(lease.start_date).toLocaleDateString()}
                    </div>
                  </div>
                )}
                {/* Show debug info when unit status doesn't match lease data */}
                {unitStatus.isOccupied && (!lease || !lease.tenant) && (
                  <div className="pl-9 text-sm text-amber-600">
                    <p>⚠️ Unit marked as occupied but missing lease/tenant data</p>
                    {!lease && <p className="text-xs">No lease information found</p>}
                    {lease && !lease.tenant && <p className="text-xs">Lease exists but no tenant information</p>}
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                      <MoreVertical size={20} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem onSelect={() => setShowDeleteConfirm(true)} className="text-red-600">
                      Delete Unit
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 pt-0">
            {(unitStatus.isOccupied || unit.status === 'upcoming') && lease && lease.tenant ? (
              <div className="pl-9 space-y-4">
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Lease Start: {new Date(lease.start_date).toLocaleDateString()}</span>
                    <span>Lease End: {new Date(lease.end_date).toLocaleDateString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${unit.status === 'upcoming' ? 'bg-blue-500' : 'bg-blue-600'}`}
                      style={{ width: `${leaseProgress}%` }}
                    ></div>
                  </div>
                  {unit.status === 'upcoming' && (
                    <div className="text-xs text-blue-600 mt-1">
                      Lease starts in {Math.ceil((new Date(lease.start_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="pl-9 text-center border-2 border-dashed rounded-lg p-6">
                <KeyRound className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  {unitStatus.isOccupied ? "Occupied unit - missing lease data" : "This unit is vacant"}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {unitStatus.description}
                </p>
                <div className="mt-6">
                  <Button onClick={() => setShowCreateLeaseModal(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    {unitStatus.isOccupied ? "Fix Lease" : "Create Lease"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>

          <CollapsibleContent>
            <CardContent className="p-4 border-t">
                <Tabs defaultValue="tenant" className="w-full">
                    <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="tenant" className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          Tenant
                        </TabsTrigger>
                        <TabsTrigger value="lease" className="flex items-center gap-1">
                          <KeyRound className="w-4 h-4" />
                          Lease
                        </TabsTrigger>
                        <TabsTrigger value="history" className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          History
                        </TabsTrigger>
                        <TabsTrigger value="maintenance" className="flex items-center gap-1">
                          <Wrench className="w-4 h-4" />
                          Maintenance
                        </TabsTrigger>
                        <TabsTrigger value="payments" className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          Payments
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="tenant">
                        {(unitStatus.isOccupied || unit.status === 'upcoming') && lease ? (
                            <div className="space-y-4">
                              <div className={`border rounded-lg p-3 mb-4 ${
                                unit.status === 'upcoming' 
                                  ? 'bg-blue-50 border-blue-200' 
                                  : 'bg-green-50 border-green-200'
                              }`}>
                                <p className={`text-sm font-medium ${
                                  unit.status === 'upcoming' 
                                    ? 'text-blue-700' 
                                    : 'text-green-700'
                                }`}>
                                  {unit.status === 'upcoming' 
                                    ? '🗓️ This unit has an upcoming lease.' 
                                    : '✓ This unit is occupied with an active lease.'}
                                </p>
                              </div>
                              <TenantInfoTab tenant={lease.tenant} />
                            </div>
                        ) : (
                            <div className="space-y-4 text-center p-4">
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                  <p className="text-muted-foreground mb-2">This unit is vacant</p>
                                  <p className="text-sm text-gray-500">
                                    No active lease is assigned to this unit.
                                  </p>
                                </div>
                                <Button onClick={() => setShowCreateLeaseModal(true)}>
                                    Create Lease
                                </Button>
                            </div>
                        )}
                    </TabsContent>
                    <TabsContent value="lease">
                        {lease ? (
                          <LeaseInfoTab 
                            lease={{
                              ...lease,
                              created_at: '',
                              updated_at: '',
                              unit_id: unit.id,
                              tenant_id: lease.tenant.id,
                              deposit_amount: 0,
                              notes: ''
                            }} 
                            onUpdate={onUpdate || (() => {})} 
                          />
                        ) : (
                          <div className="text-center p-6 bg-gray-50 rounded-lg">
                            <h3 className="text-lg font-medium text-gray-800">No Active Lease</h3>
                            <p className="text-sm text-gray-500 mt-1">This unit is currently vacant.</p>
                          </div>
                        )}
                    </TabsContent>
                    <TabsContent value="history">
                        <LeaseHistoryTab unitId={unit.id} />
                    </TabsContent>
                    <TabsContent value="maintenance">
                        <MaintenanceListTab unitId={unit.id} /> 
                    </TabsContent>
                    <TabsContent value="payments">
                        <PaymentListTab unitId={unit.id} tenantId={lease?.tenant.id} propertyId={propertyId} />
                    </TabsContent>
                </Tabs>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {showCreateLeaseModal && (
        <CreateLeaseModal
          isOpen={showCreateLeaseModal}
          onClose={() => setShowCreateLeaseModal(false)}
          unitId={unit.id}
          unitNumber={unit.unit_number}
          propertyId={propertyId}
          onSuccess={() => {
            setShowCreateLeaseModal(false);
            onUpdate?.();
          }}
        />
      )}

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this unit?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete Unit {unit.unit_number}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end space-x-2">
            <AlertDialogCancel onClick={() => setShowDeleteConfirm(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete Unit
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 