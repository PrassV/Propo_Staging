import React, { useState, useEffect } from 'react';
import { MaintenanceIssue, MaintenancePriority, MaintenanceCategory } from '@/api/types';
import { getMaintenanceByUnitId, createMaintenanceRequest } from '@/api/services/maintenanceService';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

interface MaintenanceListTabProps {
    unitId: string;
}

export default function MaintenanceListTab({ unitId }: MaintenanceListTabProps) {
    const [issues, setIssues] = useState<MaintenanceIssue[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'normal',
        category: 'plumbing'
    });
    const [submitting, setSubmitting] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const fetchMaintenanceIssues = async () => {
            if (!unitId) return;

            setLoading(true);
            setError(null);

            try {
                const data = await getMaintenanceByUnitId(unitId);
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
        setDialogOpen(true);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        if (!formData.title || !formData.description) {
            toast({
                title: "Error",
                description: "Please fill in all required fields",
                variant: "destructive"
            });
            return;
        }

        setSubmitting(true);
        try {
            await createMaintenanceRequest({
                title: formData.title,
                description: formData.description,
                priority: formData.priority as MaintenancePriority,
                category: formData.category as MaintenanceCategory,
                property_id: '', // Will be derived from unit_id by the backend
                unit_id: unitId // Changed from unit_number to unit_id
            });

            toast({
                title: "Success",
                description: "Maintenance request created successfully"
            });

            // Reset form and close dialog
            setFormData({
                title: '',
                description: '',
                priority: 'normal',
                category: 'plumbing'
            });
            setDialogOpen(false);

            // Refresh the list
            const data = await getMaintenanceByUnitId(unitId);
            setIssues(data || []);
        } catch (err) {
            console.error("Error creating maintenance request:", err);
            toast({
                title: "Error",
                description: err instanceof Error ? err.message : 'Failed to create maintenance request',
                variant: "destructive"
            });
        } finally {
            setSubmitting(false);
        }
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

            {/* Create Maintenance Request Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Maintenance Request</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                name="title"
                                value={formData.title}
                                onChange={handleInputChange}
                                placeholder="Brief description of the issue"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                placeholder="Detailed description of the maintenance issue"
                                rows={4}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="priority">Priority</Label>
                                <Select
                                    value={formData.priority}
                                    onValueChange={(value) => handleSelectChange('priority', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select priority" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="normal">Normal</SelectItem>
                                        <SelectItem value="urgent">Urgent</SelectItem>
                                        <SelectItem value="emergency">Emergency</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="category">Category</Label>
                                <Select
                                    value={formData.category}
                                    onValueChange={(value) => handleSelectChange('category', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="plumbing">Plumbing</SelectItem>
                                        <SelectItem value="electrical">Electrical</SelectItem>
                                        <SelectItem value="hvac">HVAC</SelectItem>
                                        <SelectItem value="appliance">Appliance</SelectItem>
                                        <SelectItem value="structural">Structural</SelectItem>
                                        <SelectItem value="pest_control">Pest Control</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={submitting}>
                            {submitting ? 'Creating...' : 'Create Request'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}