import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Calendar, 
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart
} from "lucide-react";
import { Tenant } from '@/api/types';
import { formatCurrency } from '@/utils/format';

interface TenantAnalyticsProps {
  tenants: Tenant[];
}

interface AnalyticsData {
  totalTenants: number;
  activeTenants: number;
  inactiveTenants: number;
  unassignedTenants: number;
  totalRentCollected: number;
  averageRent: number;
  occupancyRate: number;
  leaseExpiringThisMonth: number;
  leaseExpiringNextMonth: number;
  paymentPatterns: {
    onTime: number;
    late: number;
    overdue: number;
  };
  tenantRetention: number;
  averageTenancyDuration: number;
}

interface StatusDistribution {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

export default function TenantAnalytics({ tenants }: TenantAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [statusDistribution, setStatusDistribution] = useState<StatusDistribution[]>([]);

  useEffect(() => {
    calculateAnalytics();
  }, [tenants]);

  const calculateAnalytics = () => {
    if (!tenants || tenants.length === 0) {
      setAnalytics(null);
      setStatusDistribution([]);
      return;
    }

    const totalTenants = tenants.length;
    const activeTenants = tenants.filter(t => t.status === 'active').length;
    const inactiveTenants = tenants.filter(t => t.status === 'inactive').length;
    const unassignedTenants = tenants.filter(t => t.status === 'unassigned' || !t.status).length;

    // Calculate rent metrics
    const tenantsWithRent = tenants.filter(t => t.rental_amount && t.rental_amount > 0);
    const totalRentCollected = tenantsWithRent.reduce((sum, t) => sum + (t.rental_amount || 0), 0);
    const averageRent = tenantsWithRent.length > 0 ? totalRentCollected / tenantsWithRent.length : 0;

    // Calculate occupancy rate (active tenants / total tenants)
    const occupancyRate = totalTenants > 0 ? (activeTenants / totalTenants) * 100 : 0;

    // Calculate lease expiration data
    const currentDate = new Date();
    const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    const monthAfter = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 1);

    const leaseExpiringThisMonth = tenants.filter(t => {
      if (!t.rental_end_date) return false;
      const endDate = new Date(t.rental_end_date);
      return endDate >= currentDate && endDate < nextMonth;
    }).length;

    const leaseExpiringNextMonth = tenants.filter(t => {
      if (!t.rental_end_date) return false;
      const endDate = new Date(t.rental_end_date);
      return endDate >= nextMonth && endDate < monthAfter;
    }).length;

    // Mock payment patterns (in real app, this would come from payment data)
    const paymentPatterns = {
      onTime: Math.floor(activeTenants * 0.75),
      late: Math.floor(activeTenants * 0.15),
      overdue: Math.floor(activeTenants * 0.1)
    };

    // Mock tenant retention and average tenancy duration
    const tenantRetention = 85; // 85% retention rate
    const averageTenancyDuration = 18; // 18 months average

    const analyticsData: AnalyticsData = {
      totalTenants,
      activeTenants,
      inactiveTenants,
      unassignedTenants,
      totalRentCollected,
      averageRent,
      occupancyRate,
      leaseExpiringThisMonth,
      leaseExpiringNextMonth,
      paymentPatterns,
      tenantRetention,
      averageTenancyDuration
    };

    // Calculate status distribution
    const distribution: StatusDistribution[] = [
      {
        status: 'Active',
        count: activeTenants,
        percentage: (activeTenants / totalTenants) * 100,
        color: 'bg-green-500'
      },
      {
        status: 'Inactive',
        count: inactiveTenants,
        percentage: (inactiveTenants / totalTenants) * 100,
        color: 'bg-red-500'
      },
      {
        status: 'Unassigned',
        count: unassignedTenants,
        percentage: (unassignedTenants / totalTenants) * 100,
        color: 'bg-yellow-500'
      }
    ];

    setAnalytics(analyticsData);
    setStatusDistribution(distribution);
  };

  if (!analytics) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No tenant data available for analytics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tenants</p>
                <p className="text-2xl font-bold">{analytics.totalTenants}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Occupancy Rate</p>
                <p className="text-2xl font-bold">{analytics.occupancyRate.toFixed(1)}%</p>
                <div className="flex items-center mt-1">
                  {analytics.occupancyRate >= 80 ? (
                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                  )}
                  <span className={`text-xs ${analytics.occupancyRate >= 80 ? 'text-green-600' : 'text-red-600'}`}>
                    {analytics.activeTenants} active
                  </span>
                </div>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Rent</p>
                <p className="text-2xl font-bold">{formatCurrency(analytics.totalRentCollected)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Avg: {formatCurrency(analytics.averageRent)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Lease Expiring</p>
                <p className="text-2xl font-bold">{analytics.leaseExpiringThisMonth}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Next month: {analytics.leaseExpiringNextMonth}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Distribution and Payment Patterns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Tenant Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {statusDistribution.map((item) => (
                <div key={item.status} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full ${item.color}`} />
                    <span className="font-medium">{item.status}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{item.count}</p>
                    <p className="text-sm text-gray-500">{item.percentage.toFixed(1)}%</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Payment Patterns */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Payment Patterns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>On Time</span>
                </div>
                <div className="text-right">
                  <p className="font-bold">{analytics.paymentPatterns.onTime}</p>
                  <p className="text-sm text-green-600">
                    {((analytics.paymentPatterns.onTime / analytics.activeTenants) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span>Late</span>
                </div>
                <div className="text-right">
                  <p className="font-bold">{analytics.paymentPatterns.late}</p>
                  <p className="text-sm text-yellow-600">
                    {((analytics.paymentPatterns.late / analytics.activeTenants) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span>Overdue</span>
                </div>
                <div className="text-right">
                  <p className="font-bold">{analytics.paymentPatterns.overdue}</p>
                  <p className="text-sm text-red-600">
                    {((analytics.paymentPatterns.overdue / analytics.activeTenants) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tenant Retention</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-green-600">{analytics.tenantRetention}%</p>
                <p className="text-sm text-gray-600">12-month retention rate</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average Tenancy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-blue-600">{analytics.averageTenancyDuration}</p>
                <p className="text-sm text-gray-600">months average duration</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts and Recommendations */}
      {(analytics.leaseExpiringThisMonth > 0 || analytics.paymentPatterns.overdue > 0) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              Attention Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.leaseExpiringThisMonth > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-orange-300 text-orange-800">
                    Lease Expiry
                  </Badge>
                  <span className="text-sm">
                    {analytics.leaseExpiringThisMonth} lease{analytics.leaseExpiringThisMonth !== 1 ? 's' : ''} expiring this month
                  </span>
                </div>
              )}
              {analytics.paymentPatterns.overdue > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-red-300 text-red-800">
                    Overdue Payments
                  </Badge>
                  <span className="text-sm">
                    {analytics.paymentPatterns.overdue} tenant{analytics.paymentPatterns.overdue !== 1 ? 's' : ''} with overdue payments
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 