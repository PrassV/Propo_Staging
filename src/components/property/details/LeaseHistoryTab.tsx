import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  User, 
  DollarSign, 
  Wrench, 
  Clock, 
  Phone,
  Mail,
  ChevronRight,
  Download
} from "lucide-react";
import { getUnitHistory } from '@/api/services/unitService';
import { UnitHistory } from '@/api/types';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Link } from 'react-router-dom';

interface LeaseHistoryTabProps {
  unitId: string;
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'terminated':
    case 'completed':
      return 'bg-gray-100 text-gray-800';
    case 'expired':
      return 'bg-red-100 text-red-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-blue-100 text-blue-800';
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
};

const formatDate = (dateString: string) => {
  try {
    return format(parseISO(dateString), 'MMM dd, yyyy');
  } catch {
    return dateString;
  }
};

const calculateLeaseDuration = (startDate: string, endDate: string) => {
  try {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const days = differenceInDays(end, start);
    const months = Math.round(days / 30);
    return months > 0 ? `${months} months` : `${days} days`;
  } catch {
    return 'Unknown';
  }
};

export default function LeaseHistoryTab({ unitId }: LeaseHistoryTabProps) {
  const [history, setHistory] = useState<UnitHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'all' | '1year' | '2years'>('all');

  useEffect(() => {
    fetchUnitHistory();
  }, [unitId]);

  const fetchUnitHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUnitHistory(unitId);
      setHistory(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load unit history';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const filterByTimeframe = (items: Array<Record<string, any>>, dateField: string = 'created_at') => {
    if (selectedTimeframe === 'all') return items;
    
    const now = new Date();
    const cutoffDate = new Date();
    
    if (selectedTimeframe === '1year') {
      cutoffDate.setFullYear(now.getFullYear() - 1);
    } else if (selectedTimeframe === '2years') {
      cutoffDate.setFullYear(now.getFullYear() - 2);
    }
    
    return items.filter(item => {
      try {
        const itemDate = parseISO(item[dateField]);
        return itemDate >= cutoffDate;
      } catch {
        return true; // Include items with invalid dates
      }
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center items-center h-32">
            <LoadingSpinner />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center p-6">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchUnitHistory} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!history) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center p-6">
            <p className="text-gray-500">No history data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const filteredLeases = filterByTimeframe(history.leases, 'start_date');
  const filteredPayments = filterByTimeframe(history.payments, 'due_date');
  const filteredMaintenance = filterByTimeframe(history.maintenance_requests);

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Unit History</h3>
          <p className="text-sm text-gray-500">
            Complete history for Unit {history.unit_number}
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value as 'all' | '1year' | '2years')}
            className="px-3 py-1 border rounded-md text-sm"
          >
            <option value="all">All Time</option>
            <option value="1year">Last Year</option>
            <option value="2years">Last 2 Years</option>
          </select>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm text-gray-500">Total Tenants</p>
                <p className="text-lg font-semibold">{history.tenants.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm text-gray-500">Total Leases</p>
                <p className="text-lg font-semibold">{filteredLeases.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-sm text-gray-500">Total Payments</p>
                <p className="text-lg font-semibold">{filteredPayments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2">
              <Wrench className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm text-gray-500">Maintenance</p>
                <p className="text-lg font-semibold">{filteredMaintenance.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed History Tabs */}
      <Tabs defaultValue="timeline" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="leases">Leases</TabsTrigger>
          <TabsTrigger value="tenants">Tenants</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        {/* Timeline View */}
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Occupancy Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredLeases.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No lease history available</p>
              ) : (
                <div className="space-y-4">
                  {filteredLeases.map((lease) => {
                    const tenant = history.tenants.find(t => t.id === lease.tenant_id);
                    return (
                      <div key={lease.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                        <div className="flex-shrink-0">
                          <div className={`w-3 h-3 rounded-full ${
                            lease.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{tenant?.name || 'Unknown Tenant'}</p>
                              <p className="text-sm text-gray-500">
                                {formatDate(lease.start_date)} - {formatDate(lease.end_date)}
                              </p>
                              <p className="text-sm text-gray-500">
                                Duration: {calculateLeaseDuration(lease.start_date, lease.end_date)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{formatCurrency(lease.rent_amount)}/month</p>
                              <Badge className={getStatusColor(lease.status)}>
                                {lease.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leases Tab */}
        <TabsContent value="leases" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lease History</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredLeases.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No leases found</p>
              ) : (
                <div className="space-y-4">
                  {filteredLeases.map((lease) => {
                    const tenant = history.tenants.find(t => t.id === lease.tenant_id);
                    return (
                      <div key={lease.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium">{tenant?.name || 'Unknown Tenant'}</h4>
                            <p className="text-sm text-gray-500">Lease ID: {lease.id}</p>
                          </div>
                          <Badge className={getStatusColor(lease.status)}>
                            {lease.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Start Date</p>
                            <p className="font-medium">{formatDate(lease.start_date)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">End Date</p>
                            <p className="font-medium">{formatDate(lease.end_date)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Monthly Rent</p>
                            <p className="font-medium">{formatCurrency(lease.rent_amount)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Deposit</p>
                            <p className="font-medium">
                              {lease.deposit_amount ? formatCurrency(lease.deposit_amount) : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tenants Tab */}
        <TabsContent value="tenants" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tenant History</CardTitle>
            </CardHeader>
            <CardContent>
              {history.tenants.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No tenants found</p>
              ) : (
                <div className="space-y-4">
                  {history.tenants.map((tenant) => {
                    const tenantLeases = history.leases.filter(l => l.tenant_id === tenant.id);
                    return (
                      <div key={tenant.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium">{tenant.name}</h4>
                            <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {tenant.email}
                              </span>
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {tenant.phone}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge className={getStatusColor(tenant.status)}>
                              {tenant.status}
                            </Badge>
                            <Link 
                              to={`/dashboard/tenants/${tenant.id}`}
                              className="block mt-2"
                            >
                              <Button variant="outline" size="sm">
                                View Profile
                                <ChevronRight className="h-3 w-3 ml-1" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                        <div className="text-sm">
                          <p className="text-gray-500 mb-2">Lease History:</p>
                          <div className="space-y-1">
                            {tenantLeases.map((lease) => (
                              <div key={lease.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                                <span>
                                  {formatDate(lease.start_date)} - {formatDate(lease.end_date)}
                                </span>
                                <span className="font-medium">
                                  {formatCurrency(lease.rent_amount)}/month
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredPayments.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No payments found</p>
              ) : (
                <div className="space-y-3">
                  {filteredPayments.map((payment) => (
                    <div key={payment.id} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{formatCurrency(payment.amount)}</p>
                        <p className="text-sm text-gray-500">
                          {payment.payment_type} • Due: {formatDate(payment.due_date)}
                        </p>
                        {payment.description && (
                          <p className="text-sm text-gray-400">{payment.description}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge className={getStatusColor(payment.status)}>
                          {payment.status}
                        </Badge>
                        {payment.payment_date && (
                          <p className="text-sm text-gray-500 mt-1">
                            Paid: {formatDate(payment.payment_date)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance History</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredMaintenance.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No maintenance requests found</p>
              ) : (
                <div className="space-y-4">
                  {filteredMaintenance.map((request) => (
                    <div key={request.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{request.title}</h4>
                          <p className="text-sm text-gray-500">{request.description}</p>
                        </div>
                        <div className="text-right">
                          <Badge className={getStatusColor(request.status)}>
                            {request.status}
                          </Badge>
                          <Badge variant="outline" className="ml-2">
                            {request.priority}
                          </Badge>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mt-3">
                        <div>
                          <p className="text-gray-500">Category</p>
                          <p className="font-medium capitalize">{request.category}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Created</p>
                          <p className="font-medium">{formatDate(request.created_at)}</p>
                        </div>
                        {request.completed_at && (
                          <div>
                            <p className="text-gray-500">Completed</p>
                            <p className="font-medium">{formatDate(request.completed_at)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 