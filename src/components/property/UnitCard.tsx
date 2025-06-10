import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronDown, ChevronRight, MoreVertical } from "lucide-react";
import { UnitDetails } from "../../api/types";
import TenantInfoTab from './details/TenantInfoTab';
import LeaseInfoTab from './details/LeaseInfoTab';
import MaintenanceListTab from './details/MaintenanceListTab';
import PaymentListTab from './details/PaymentListTab';
import AssignTenantModal from './AssignTenantModal';
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

interface UnitCardProps {
  unit: UnitDetails;
  onUpdate?: () => void;
  className?: string;
  propertyId: string;
}

export default function UnitCard({ unit, onUpdate, className, propertyId }: UnitCardProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [showAssignTenant, setShowAssignTenant] = useState(false);
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

    const getStatusVariant = (status: UnitDetails['status']): "default" | "secondary" | "outline" | "destructive" => {
        switch (status?.toLowerCase()) {
            case 'vacant':
                return 'outline';
            case 'occupied':
                return 'default';
            case 'maintenance':
                return 'secondary';
            default:
                return 'outline';
        }
    };

    // Enhanced logic to determine if unit has an active tenant
    const hasActiveTenant = !!unit.tenant_id && !!unit.tenant;

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
        <Card className="w-full">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-3">
                  <span>Unit: {unit.unit_number}</span>
                  <Badge variant={getStatusVariant(unit.status)}>
                    {unit.status || 'Unknown'}
                  </Badge>
                  {hasActiveTenant && (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      Tenant Assigned
                    </Badge>
                  )}
                </CardTitle>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right text-sm text-gray-600">
                    <p>Currently {unit.status}</p>
                    <p>Rent: ${unit.rent || 0}</p>
                    {hasActiveTenant && (
                      <p className="text-green-600 font-medium">Occupied</p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button onClick={(e) => e.stopPropagation()} className="p-1 rounded-full hover:bg-gray-200">
                        <MoreVertical size={20} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onSelect={() => setShowDeleteConfirm(true)} className="text-red-600">
                        Delete Unit
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            {/* Tabs content inside the collapsible area */}
            <CardContent className="p-4">
                <Tabs defaultValue="tenant" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 mb-4"> 
                        <TabsTrigger value="tenant">
                          Tenant {hasActiveTenant && <span className="ml-1 text-xs">●</span>}
                        </TabsTrigger>
                        <TabsTrigger value="lease">Lease</TabsTrigger>
                        <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
                        <TabsTrigger value="payments">Payments</TabsTrigger>
                    </TabsList>
                    <TabsContent value="tenant">
                        {hasActiveTenant ? (
                            <div className="space-y-4">
                              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                                <p className="text-sm text-green-700 font-medium">
                                  ✓ This unit has an active tenant assigned
                                </p>
                              </div>
                              <TenantInfoTab tenant={unit.tenant} />
                            </div>
                        ) : (
                            <div className="space-y-4 text-center p-4">
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                  <p className="text-muted-foreground mb-2">This unit is vacant</p>
                                  <p className="text-sm text-gray-500">
                                    No tenant is currently assigned to this unit
                                  </p>
                                </div>
                                <button 
                                    onClick={() => setShowAssignTenant(true)}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                >
                                    Assign Tenant
                                </button>
                            </div>
                        )}
                    </TabsContent>
                    <TabsContent value="lease">
                        <LeaseInfoTab unitId={unit.id} /> 
                    </TabsContent>
                    <TabsContent value="maintenance">
                        <MaintenanceListTab unitId={unit.id} /> 
                    </TabsContent>
                    <TabsContent value="payments">
                        <PaymentListTab unitId={unit.id} tenantId={unit.tenant_id} propertyId={propertyId} />
                    </TabsContent>
                </Tabs>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Assign Tenant Modal */}
      {showAssignTenant && (
        <AssignTenantModal
          isOpen={showAssignTenant}
          onClose={() => setShowAssignTenant(false)}
          unitId={unit.id}
          unitNumber={unit.unit_number}
          onSuccess={() => {
            setShowAssignTenant(false);
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