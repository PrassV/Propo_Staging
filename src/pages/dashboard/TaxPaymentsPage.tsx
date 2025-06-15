import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, AlertCircle } from "lucide-react";

export default function TaxPaymentsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-wide">Tax Payments</h1>
          <p className="text-gray-600">Manage property tax payments and records</p>
        </div>
      </div>

      {/* Coming Soon Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Tax Payment Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Coming Soon</h3>
              <p className="text-gray-600 max-w-md">
                Tax payment management features are currently under development. 
                This will include property tax tracking, payment scheduling, and tax document management.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Preview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Receipt className="h-8 w-8 text-blue-600 mx-auto mb-3" />
              <h3 className="font-medium mb-2">Tax Records</h3>
              <p className="text-sm text-gray-600">Track and manage property tax payments</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 text-green-600 mx-auto mb-3" />
              <h3 className="font-medium mb-2">Payment Reminders</h3>
              <p className="text-sm text-gray-600">Automated tax payment notifications</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Receipt className="h-8 w-8 text-purple-600 mx-auto mb-3" />
              <h3 className="font-medium mb-2">Document Storage</h3>
              <p className="text-sm text-gray-600">Store tax documents and receipts</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 