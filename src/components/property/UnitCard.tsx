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
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteUnit } from '@/api/services/unitService';
import { toast } from 'sonner';
import CreateLeaseModal from './CreateLeaseModal';

const getLeaseProgress = (startDate: string, endDate: string): number => {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const now = new Date().getTime();
    if (now < start) return 0;
    if (now > end) return 100;
    const totalDuration = end - start;
    if (totalDuration <= 0) return 100;
    const elapsed = now - start;
    return (elapsed / totalDuration) * 100;
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

    const isOccupied = unit.is_occupied;
    const lease = unit.lease;
    const leaseProgress = lease ? getLeaseProgress(lease.start_date, lease.end_date) : 0;

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
                    <Badge variant={isOccupied ? 'default' : 'outline'} className="text-sm">
                      {isOccupied ? 'Occupied' : 'Vacant'}
                    </Badge>
                  </div>
                </CollapsibleTrigger>
                {isOccupied && lease && (
                  <div className="pl-9 space-y-3 text-sm text-gray-700">
                    <div className="flex items-center space-x-2">
                      <User size={16} className="text-gray-500"/>
                      <span>{lease.tenant.full_name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <DollarSign size={16} className="text-gray-500"/>
                      <span>${lease.rent_amount} / month</span>
                    </div>
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
            {isOccupied && lease ? (
              <div className="pl-9 space-y-4">
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Lease Start: {new Date(lease.start_date).toLocaleDateString()}</span>
                    <span>Lease End: {new Date(lease.end_date).toLocaleDateString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${leaseProgress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="pl-9 text-center border-2 border-dashed rounded-lg p-6">
                <KeyRound className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">This unit is vacant</h3>
                <p className="mt-1 text-sm text-gray-500">Ready for a new tenant.</p>
                <div className="mt-6">
                  <Button onClick={() => setShowCreateLeaseModal(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Lease
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
                        {isOccupied && lease ? (
                            <div className="space-y-4">
                              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                                <p className="text-sm text-green-700 font-medium">
                                  ✓ This unit is occupied with an active lease.
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
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 