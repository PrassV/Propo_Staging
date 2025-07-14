import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Building2, Calendar, DollarSign, MapPin, Clock } from 'lucide-react';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { getTenantLeaseHistory } from '@/api/services/tenantService';
import { formatCurrency } from '@/utils/format';
import { format } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TenantLeaseHistoryItem {
  id: string;
  property_name: string;
  unit_number: string;
  start_date: string;
  end_date?: string;
  rent_amount?: number;
  deposit_amount?: number;
  status: string;
  duration_months?: number;
  is_current: boolean;
  created_at: string;
}

interface TenantLeaseHistoryProps {
  tenantId: string;
  onRefresh?: () => void;
}

export default function TenantLeaseHistory({ tenantId, onRefresh }: TenantLeaseHistoryProps) {
  const [leaseHistory, setLeaseHistory] = useState<TenantLeaseHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tenantId) {
      fetchLeaseHistory();
    }
  }, [tenantId]);

  const fetchLeaseHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getTenantLeaseHistory(tenantId);
      setLeaseHistory(response.lease_history || []);
    } catch (err) {
      console.error('Error fetching lease history:', err);
      setError('Failed to load lease history');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchLeaseHistory();
    onRefresh?.();
  };

  const getStatusBadge = (status: string, isCurrent: boolean) => {
    if (isCurrent) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          Current
        </Badge>
      );
    }

    const statusColors = {
      'active': 'bg-blue-100 text-blue-800 border-blue-200',
      'terminated': 'bg-red-100 text-red-800 border-red-200',
      'expired': 'bg-gray-100 text-gray-800 border-gray-200',
      'completed': 'bg-green-100 text-green-800 border-green-200'
    };

    const colorClass = statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800 border-gray-200';

    return (
      <Badge className={`${colorClass} border`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDuration = (months: number | undefined) => {
    if (!months) return 'N/A';
    
    const years = Math.floor(months / 12);
    const remainingMonths = Math.floor(months % 12);
    
    if (years > 0) {
      return remainingMonths > 0 
        ? `${years} year${years > 1 ? 's' : ''} ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`
        : `${years} year${years > 1 ? 's' : ''}`;
    }
    
    return `${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
  };

  const calculateLeaseDuration = (startDate: string, endDate?: string) => {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    return Math.max(0, months);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Lease History
          </CardTitle>
        </CardHeader>
        <CardContent>
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Lease History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                className="ml-2"
              >
                Try Again
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Lease History
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
          >
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {leaseHistory.length === 0 ? (
          <div className="text-center py-8">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg font-medium">No lease history found</p>
            <p className="text-gray-400 text-sm mt-2">
              This tenant has no historical lease assignments.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {leaseHistory.map((lease) => (
              <div 
                key={lease.id} 
                className={`p-4 border rounded-lg ${
                  lease.is_current 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{lease.property_name}</h3>
                      {getStatusBadge(lease.status, lease.is_current)}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <span>Unit {lease.unit_number}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {format(new Date(lease.start_date), 'MMM dd, yyyy')} - {
                              lease.end_date ? format(new Date(lease.end_date), 'MMM dd, yyyy') : 'Ongoing'
                            }
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>
                            Duration: {formatDuration(lease.duration_months || calculateLeaseDuration(lease.start_date, lease.end_date))}
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {lease.rent_amount && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <DollarSign className="w-4 h-4" />
                            <span>Rent: {formatCurrency(lease.rent_amount)}/month</span>
                          </div>
                        )}
                        
                        {lease.deposit_amount && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <DollarSign className="w-4 h-4" />
                            <span>Deposit: {formatCurrency(lease.deposit_amount)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 