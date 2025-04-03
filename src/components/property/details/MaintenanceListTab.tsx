import React, { useState, useEffect } from 'react';
import { MaintenanceIssue } from '@/api/types';
import { api } from '@/api/apiClient';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface MaintenanceListTabProps {
    unitId: string;
}

export default function MaintenanceListTab({ unitId }: MaintenanceListTabProps) {
    const [issues, setIssues] = useState<MaintenanceIssue[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchMaintenanceIssues = async () => {
            if (!unitId) return;
            
            setLoading(true);
            setError(null);
            
            try {
                const data = await api.maintenance.getMaintenanceByUnitId(unitId);
                setIssues(data || []);
            } catch (err) {
                console.error("Error fetching maintenance issues:", err);
                setError(err instanceof Error ? err.message : 'Failed to load maintenance issues.');
                setIssues([]);
            } finally {
                setLoading(false);
            }
        };
        
        fetchMaintenanceIssues();
    }, [unitId]);

    const getStatusVariant = (status: string): "default" | "outline" | "secondary" | "destructive" => {
        switch (status.toLowerCase()) {
            case 'open':
                return "destructive";
            case 'in progress':
                return "secondary";
            case 'completed':
                return "outline";
            default:
                return "outline";
        }
    };

    const handleCreateRequest = () => {
        // TODO: Implement create maintenance request functionality
        console.log("Create maintenance request for unit:", unitId);
    };

    if (loading) return <div className="flex justify-center p-4"><LoadingSpinner /></div>;
    
    if (error) return (
        <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
        </Alert>
    );

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Maintenance Requests</h3>
                <Button size="sm" onClick={handleCreateRequest}>
                    <PlusCircle className="mr-2 h-4 w-4" /> New Request
                </Button>
            </div>
            
            {issues.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No maintenance issues reported.</p>
            ) : (
                <div className="space-y-3">
                    {issues.map((issue) => (
                        <Card key={issue.id} className="p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-medium">{issue.title}</div>
                                    <div className="text-sm text-muted-foreground">
                                        Reported: {new Date(issue.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                                <Badge variant={getStatusVariant(issue.status)}>{issue.status}</Badge>
                            </div>
                            <div className="mt-2 flex items-center">
                                <span className="text-xs bg-secondary/30 text-secondary-foreground rounded-sm px-1.5 py-0.5">
                                    {issue.priority} Priority
                                </span>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
} 