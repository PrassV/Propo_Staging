import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Home, Users, TrendingUp, Wrench, Receipt } from "lucide-react";
import { DashboardSummary } from '@/api/types';

interface DashboardSummaryProps {
  summaryData: DashboardSummary;
  userType: 'owner' | 'tenant';
  loading?: boolean;
}

export default function DashboardSummaryCards({ summaryData, userType, loading = false }: DashboardSummaryProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-4 w-4 bg-muted rounded-full" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted rounded mb-1" />
              <div className="h-3 w-24 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (userType === 'owner') {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryData?.total_properties ?? 'N/A'}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryData?.total_tenants ?? 'N/A'}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryData?.total_properties && summaryData.total_properties > 0 
                ? `${Math.round((summaryData.occupied_units / summaryData.total_properties) * 100)}%`
                : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {summaryData?.occupied_units ?? '-'} / {summaryData?.total_properties ?? '-'} Units Occupied
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Maintenance</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryData?.maintenance_requests ?? 0}</div>
            <p className="text-xs text-muted-foreground">Pending requests</p>
          </CardContent>
        </Card>
      </div>
    );
  } else {
    // Tenant dashboard summary
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Rent Due</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryData?.next_due_date ? 
                new Date(summaryData.next_due_date).toLocaleDateString() : 
                'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Amount: ₹{summaryData?.next_due_amount?.toFixed(2) ?? 'N/A'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lease Ends</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryData?.lease_end ? 
                new Date(summaryData.lease_end).toLocaleDateString() : 
                'N/A'}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryData?.maintenance_requests ?? 0}</div>
            <p className="text-xs text-muted-foreground">Open requests</p>
          </CardContent>
        </Card>
      </div>
    );
  }
} 