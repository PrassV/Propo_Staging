import React from 'react';
import { UnitDetails } from '@/api/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
// Import Collapsible components
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
// Import Tabs components and individual Tab content components
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TenantInfoTab from '@/components/property/details/TenantInfoTab';
import LeaseInfoTab from '@/components/property/details/LeaseInfoTab';
import MaintenanceListTab from '@/components/property/details/MaintenanceListTab';
import PaymentListTab from '@/components/property/details/PaymentListTab';

interface UnitCardProps {
  unit: UnitDetails;
  // Remove isSelected and onClick props
  className?: string;
}

export default function UnitCard({ unit, className }: UnitCardProps) {
    
    const getStatusVariant = (status: UnitDetails['status']): "default" | "secondary" | "outline" | "destructive" => {
        switch (status) {
            case 'Occupied': return 'default';
            case 'Vacant': return 'secondary';
            default: return 'secondary';
        }
    };

  return (
    <Collapsible className={cn("rounded-md border", className)}>
      <CollapsibleTrigger asChild>
        {/* Use CardHeader as the trigger, make it hoverable */}
        <Card 
            className={cn(
                "cursor-pointer hover:bg-muted/50 transition-colors rounded-b-none border-b", // Adjust styling
            )}
        >
            <CardHeader className="p-3">
                <div className="flex justify-between items-center mb-1">
                    <CardTitle className="text-base truncate">Unit: {unit.unit_number}</CardTitle>
                    <Badge variant={getStatusVariant(unit.status)} className="text-xs px-1.5 py-0.5">
                        {unit.status}
                    </Badge>
                </div>
                <CardDescription className="text-xs truncate">
                     {unit.status === 'Occupied' && unit.current_tenant_id ? 
                        // Fetch tenant name if needed or display ID
                        `Tenant ID: ${unit.current_tenant_id}` : 
                        'Currently Vacant'}
                </CardDescription>
                {unit.rent != null && (
                    <p className="text-xs text-muted-foreground mt-1">Rent: ${unit.rent}</p>
                )}
            </CardHeader>
        </Card>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {/* Tabs content inside the collapsible area */}
        <CardContent className="p-4">
            <Tabs defaultValue="tenant" className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-4"> 
                    <TabsTrigger value="tenant">Tenant</TabsTrigger>
                    <TabsTrigger value="lease">Lease</TabsTrigger>
                    <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
                    <TabsTrigger value="payments">Payments</TabsTrigger>
                </TabsList>
                <TabsContent value="tenant">
                    {unit.status === 'Occupied' && unit.current_tenant_id ? (
                        <TenantInfoTab tenantId={unit.current_tenant_id} />
                    ) : (
                        <div className="space-y-4 text-center p-4">
                            <p className="text-muted-foreground">This unit is vacant.</p>
                            {/* TODO: Add Assign Tenant Functionality */}
                            <button className="text-sm text-primary hover:underline">Assign Tenant</button>
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
    </Collapsible>
  );
} 