import React, { useState } from 'react';
import { Lease } from '@/api/types';
import { terminateLease } from '@/api/services/leaseService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
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
import { AlertTriangle, Calendar, DollarSign } from 'lucide-react';

interface LeaseInfoTabProps {
  lease: Lease | null;
  onUpdate: () => void; // To refresh parent component state
}

export default function LeaseInfoTab({ lease, onUpdate }: LeaseInfoTabProps) {
  const [showTerminateConfirm, setShowTerminateConfirm] = useState(false);
  const [isTerminating, setIsTerminating] = useState(false);

  const handleTerminate = async () => {
    if (!lease) return;

    setIsTerminating(true);
    try {
      await terminateLease(lease.id);
      toast.success("Lease has been terminated successfully.");
      onUpdate(); // Trigger re-fetch in the parent
    } catch (error) {
      let message = "An unexpected error occurred.";
      if (error instanceof Error) {
        message = error.message;
      }
      toast.error("Failed to terminate lease.", {
        description: message,
      });
      console.error("Terminate lease error:", error);
    } finally {
      setIsTerminating(false);
      setShowTerminateConfirm(false);
    }
  };

  if (!lease || lease.status === 'terminated') {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center p-6 bg-gray-50 rounded-lg">
             <h3 className="text-lg font-medium text-gray-800">No Active Lease</h3>
             <p className="text-sm text-gray-500 mt-1">This unit is currently vacant.</p>
           </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Active Lease Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center"><Calendar className="mr-2 h-4 w-4" /> Lease Period</span>
            <span>{new Date(lease.start_date).toLocaleDateString()} - {new Date(lease.end_date).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center"><DollarSign className="mr-2 h-4 w-4" /> Rent</span>
                            <span className="font-semibold">₹{lease.rent_amount} / month</span>
          </div>
          {lease.deposit_amount && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Deposit</span>
                              <span>₹{lease.deposit_amount}</span>
            </div>
          )}
          {lease.notes && (
            <div className="pt-2">
              <span className="text-muted-foreground">Notes</span>
              <p className="text-sm border-l-2 pl-3 mt-1 whitespace-pre-wrap">{lease.notes}</p>
            </div>
          )}

          <div className="border-t pt-4 mt-4">
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setShowTerminateConfirm(true)}
              disabled={isTerminating}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              {isTerminating ? 'Terminating...' : 'Terminate Lease'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showTerminateConfirm} onOpenChange={setShowTerminateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will terminate the current lease and mark the unit as vacant.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleTerminate} disabled={isTerminating} className="bg-red-600 hover:bg-red-700">
              {isTerminating ? 'Terminating...' : 'Yes, Terminate Lease'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}