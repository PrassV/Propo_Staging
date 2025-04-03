import React from 'react';
import { UnitDetails } from '@/api/types';
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface UnitCardProps {
  unit: UnitDetails;
  isSelected: boolean;
  onClick: () => void;
  className?: string;
}

export default function UnitCard({ unit, isSelected, onClick, className }: UnitCardProps) {
    
    const getStatusVariant = (status: UnitDetails['status']): "default" | "secondary" | "outline" | "destructive" => {
        switch (status) {
            case 'Occupied': return 'default';
            case 'Vacant': return 'secondary';
            default: return 'secondary';
        }
    };

  return (
    <Card 
        className={cn(
            "cursor-pointer hover:shadow-md transition-shadow", 
            isSelected ? 'ring-2 ring-primary ring-offset-2' : '',
            className
        )}
        onClick={onClick}
    >
        <CardHeader className="p-3">
            <div className="flex justify-between items-center mb-1">
                <CardTitle className="text-base truncate">{unit.unit_identifier}</CardTitle>
                <Badge variant={getStatusVariant(unit.status)} className="text-xs px-1.5 py-0.5">
                    {unit.status}
                </Badge>
            </div>
            <CardDescription className="text-xs truncate">
                {unit.status === 'Occupied' && unit.current_tenant_name ? 
                    `Tenant: ${unit.current_tenant_name}` : 
                    'Currently Vacant'}
            </CardDescription>
             {unit.current_rent_amount != null && (
                 <p className="text-xs text-muted-foreground mt-1">Rent: ${unit.current_rent_amount}</p>
             )}
        </CardHeader>
    </Card>
  );
} 