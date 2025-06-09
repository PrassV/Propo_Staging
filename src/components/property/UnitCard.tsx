import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronDown, ChevronRight } from "lucide-react";
import { UnitDetails, Tenant } from "../../api/types";
import TenantInfoTab from './details/TenantInfoTab';
import LeaseInfoTab from './details/LeaseInfoTab';
import MaintenanceListTab from './details/MaintenanceListTab';
import PaymentListTab from './details/PaymentListTab';
import AssignTenantModal from './AssignTenantModal';

interface UnitCardProps {
  unit: UnitDetails;
  propertyId: string;
  onUpdate?: () => void;
  className?: string;
  tenant?: Tenant | null;
}

export default function UnitCard({ unit, onUpdate, className, tenant }: UnitCardProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [showAssignTenant, setShowAssignTenant] = useState(false);
    
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
    const hasActiveTenant = unit.current_tenant_id && 
                           (unit.status?.toLowerCase() === 'occupied');

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
                              <TenantInfoTab tenantId={unit.current_tenant_id || ''} tenant={tenant} />
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
                        <PaymentListTab unitId={unit.id} tenantId={unit.current_tenant_id} />
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
    </>
  );
} 