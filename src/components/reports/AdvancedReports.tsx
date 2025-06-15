import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  FileText, 
  Download,
  Filter,
  Home,
  Users,
  Wrench,
  Building
} from "lucide-react";
import { formatCurrency } from '@/utils/format';
import { API_ENDPOINTS, getAuthHeaders, buildUrl } from '@/config/api';

interface FinancialReport {
  period: string;
  total_income: number;
  total_expenses: number;
  net_profit: number;
  occupancy_rate: number;
  rent_collected: number;
  maintenance_costs: number;
  vacancy_loss: number;
}

interface PropertyPerformance {
  property_id: string;
  property_name: string;
  units_count: number;
  occupied_units: number;
  monthly_rent: number;
  maintenance_costs: number;
  vacancy_rate: number;
  roi: number;
  tenant_satisfaction: number;
}

interface MaintenanceAnalytics {
  total_requests: number;
  completed_requests: number;
  average_completion_time: number;
  total_cost: number;
  cost_by_category: { category: string; amount: number; percentage: number }[];
  trending_issues: { issue: string; count: number; trend: 'up' | 'down' | 'stable' }[];
}

interface TenantRetentionData {
  total_tenants: number;
  retained_tenants: number;
  retention_rate: number;
  average_tenancy_duration: number;
  renewal_rate: number;
  satisfaction_score: number;
  churn_reasons: { reason: string; count: number; percentage: number }[];
}

interface CustomReportFilter {
  date_range: { start: string; end: string };
  properties: string[];
  report_type: string;
  metrics: string[];
}

export default function AdvancedReports() {
  const [activeTab, setActiveTab] = useState('financial');
  const [financialData, setFinancialData] = useState<FinancialReport[]>([]);
  const [propertyPerformance, setPropertyPerformance] = useState<PropertyPerformance[]>([]);
  const [maintenanceAnalytics, setMaintenanceAnalytics] = useState<MaintenanceAnalytics | null>(null);
  const [tenantRetention, setTenantRetention] = useState<TenantRetentionData | null>(null);
  const [customFilters, setCustomFilters] = useState<CustomReportFilter>({
    date_range: { start: '', end: '' },
    properties: [],
    report_type: '',
    metrics: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    try {
      setLoading(true);
      
      // Get user info to extract owner_id
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        console.error('No user found in localStorage');
        return;
      }
      
      const user = JSON.parse(userStr);
      const owner_id = user.id;
      
             // Fetch real financial data
       const financialUrl = buildUrl(API_ENDPOINTS.reports.financialSummary, { 
         owner_id, 
         period: 'month', 
         months_back: 12 
       });
       const financialResponse = await fetch(financialUrl, { headers: getAuthHeaders() });
       
       if (financialResponse.ok) {
         const financialData = await financialResponse.json();
         setFinancialData(financialData.financial_data || []);
       }

       // Fetch property performance data
       const performanceUrl = buildUrl(API_ENDPOINTS.reports.propertyPerformance, { owner_id });
       const performanceResponse = await fetch(performanceUrl, { headers: getAuthHeaders() });
       
       if (performanceResponse.ok) {
         const performanceData = await performanceResponse.json();
         setPropertyPerformance(performanceData || []);
       }

       // Fetch maintenance analytics
       const maintenanceUrl = buildUrl(API_ENDPOINTS.reports.maintenanceAnalytics, { 
         owner_id, 
         days_back: 90 
       });
       const maintenanceResponse = await fetch(maintenanceUrl, { headers: getAuthHeaders() });
       
       if (maintenanceResponse.ok) {
         const maintenanceData = await maintenanceResponse.json();
         setMaintenanceAnalytics(maintenanceData);
       }

       // Fetch tenant retention data
       const retentionUrl = buildUrl(API_ENDPOINTS.reports.tenantRetention, { owner_id });
       const retentionResponse = await fetch(retentionUrl, { headers: getAuthHeaders() });
       
       if (retentionResponse.ok) {
         const retentionData = await retentionResponse.json();
         setTenantRetention(retentionData);
       }
      
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (format: 'pdf' | 'excel' | 'csv', reportType: string) => {
    try {
      // Mock export functionality
      const filename = `${reportType}_report_${new Date().toISOString().split('T')[0]}.${format}`;
      console.log(`Exporting ${reportType} report as ${format}: ${filename}`);
      
      // In real implementation, this would trigger actual file download
      alert(`Report exported as ${filename}`);
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (current < previous) {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    return <div className="h-4 w-4" />;
  };

  const getTrendColor = (current: number, previous: number) => {
    if (current > previous) return 'text-green-600';
    if (current < previous) return 'text-red-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const currentFinancial = financialData[0];
  const previousFinancial = financialData[1];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-wide">Advanced Reports & Analytics</h1>
          <p className="text-gray-600">Comprehensive insights and financial analysis</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => exportReport('pdf', activeTab)}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="outline" onClick={() => exportReport('excel', activeTab)}>
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Financial Overview Cards */}
      {currentFinancial && previousFinancial && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Income</p>
                  <p className="text-2xl font-bold">{formatCurrency(currentFinancial.total_income)}</p>
                  <div className="flex items-center mt-1">
                    {getTrendIcon(currentFinancial.total_income, previousFinancial.total_income)}
                    <span className={`text-sm ml-1 ${getTrendColor(currentFinancial.total_income, previousFinancial.total_income)}`}>
                      {((currentFinancial.total_income - previousFinancial.total_income) / previousFinancial.total_income * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Net Profit</p>
                  <p className="text-2xl font-bold">{formatCurrency(currentFinancial.net_profit)}</p>
                  <div className="flex items-center mt-1">
                    {getTrendIcon(currentFinancial.net_profit, previousFinancial.net_profit)}
                    <span className={`text-sm ml-1 ${getTrendColor(currentFinancial.net_profit, previousFinancial.net_profit)}`}>
                      {((currentFinancial.net_profit - previousFinancial.net_profit) / previousFinancial.net_profit * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Occupancy Rate</p>
                  <p className="text-2xl font-bold">{currentFinancial.occupancy_rate}%</p>
                  <div className="flex items-center mt-1">
                    {getTrendIcon(currentFinancial.occupancy_rate, previousFinancial.occupancy_rate)}
                    <span className={`text-sm ml-1 ${getTrendColor(currentFinancial.occupancy_rate, previousFinancial.occupancy_rate)}`}>
                      {(currentFinancial.occupancy_rate - previousFinancial.occupancy_rate).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <Home className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Maintenance Costs</p>
                  <p className="text-2xl font-bold">{formatCurrency(currentFinancial.maintenance_costs)}</p>
                  <div className="flex items-center mt-1">
                    {getTrendIcon(previousFinancial.maintenance_costs, currentFinancial.maintenance_costs)}
                    <span className={`text-sm ml-1 ${getTrendColor(previousFinancial.maintenance_costs, currentFinancial.maintenance_costs)}`}>
                      {((currentFinancial.maintenance_costs - previousFinancial.maintenance_costs) / previousFinancial.maintenance_costs * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <Wrench className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-[800px]">
          <TabsTrigger value="financial" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Financial
          </TabsTrigger>
          <TabsTrigger value="occupancy" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            Occupancy
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Maintenance
          </TabsTrigger>
          <TabsTrigger value="tenants" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Tenants
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Custom
          </TabsTrigger>
        </TabsList>

        <TabsContent value="financial" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Financial Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Financial Trends (Last 3 Months)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {financialData.map((data) => (
                    <div key={data.period} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-medium">{data.period}</h3>
                        <Badge className={data.net_profit > 75000 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                          {data.net_profit > 75000 ? 'Strong' : 'Moderate'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Income</p>
                          <p className="font-medium">{formatCurrency(data.total_income)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Profit</p>
                          <p className="font-medium">{formatCurrency(data.net_profit)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Expense Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Current Month Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {currentFinancial && (
                  <div className="space-y-4">
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-green-800 font-medium">Total Income</span>
                        <span className="text-green-800 font-bold">{formatCurrency(currentFinancial.total_income)}</span>
                      </div>
                      <div className="text-sm text-green-600 mt-1">
                        Rent: {formatCurrency(currentFinancial.rent_collected)} | 
                        Other: {formatCurrency(currentFinancial.total_income - currentFinancial.rent_collected)}
                      </div>
                    </div>
                    
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-red-800 font-medium">Total Expenses</span>
                        <span className="text-red-800 font-bold">{formatCurrency(currentFinancial.total_expenses)}</span>
                      </div>
                      <div className="text-sm text-red-600 mt-1">
                        Maintenance: {formatCurrency(currentFinancial.maintenance_costs)} | 
                        Vacancy: {formatCurrency(currentFinancial.vacancy_loss)} | 
                        Other: {formatCurrency(currentFinancial.total_expenses - currentFinancial.maintenance_costs - currentFinancial.vacancy_loss)}
                      </div>
                    </div>
                    
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-blue-800 font-medium">Net Profit</span>
                        <span className="text-blue-800 font-bold">{formatCurrency(currentFinancial.net_profit)}</span>
                      </div>
                      <div className="text-sm text-blue-600 mt-1">
                        Profit Margin: {((currentFinancial.net_profit / currentFinancial.total_income) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="occupancy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Property Performance Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {propertyPerformance.map((property) => (
                  <div key={property.property_id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center space-x-3">
                        <Building className="h-5 w-5 text-blue-600" />
                        <div>
                          <h3 className="font-medium">{property.property_name}</h3>
                          <p className="text-sm text-gray-600">
                            {property.occupied_units}/{property.units_count} units occupied
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={property.vacancy_rate < 10 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                          {(100 - property.vacancy_rate).toFixed(1)}% Occupied
                        </Badge>
                        <Badge className={property.roi > 12 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}>
                          {property.roi}% ROI
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Monthly Rent</p>
                        <p className="font-medium">{formatCurrency(property.monthly_rent)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Maintenance</p>
                        <p className="font-medium">{formatCurrency(property.maintenance_costs)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Vacancy Rate</p>
                        <p className="font-medium">{property.vacancy_rate.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Satisfaction</p>
                        <p className="font-medium">{property.tenant_satisfaction}/5.0</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-6">
          {maintenanceAnalytics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Maintenance Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>Maintenance Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-600">Total Requests</p>
                        <p className="text-2xl font-bold text-blue-800">{maintenanceAnalytics.total_requests}</p>
                      </div>
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-600">Completed</p>
                        <p className="text-2xl font-bold text-green-800">{maintenanceAnalytics.completed_requests}</p>
                      </div>
                    </div>
                    
                    <div className="p-3 border rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Completion Rate</span>
                        <span className="font-bold">
                          {((maintenanceAnalytics.completed_requests / maintenanceAnalytics.total_requests) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-3 border rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Avg. Completion Time</span>
                        <span className="font-bold">{maintenanceAnalytics.average_completion_time} days</span>
                      </div>
                    </div>
                    
                    <div className="p-3 border rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Total Cost</span>
                        <span className="font-bold">{formatCurrency(maintenanceAnalytics.total_cost)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cost Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Cost by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {maintenanceAnalytics.cost_by_category.map((category) => (
                      <div key={category.category} className="flex justify-between items-center p-2 border rounded">
                        <span className="font-medium">{category.category}</span>
                        <div className="text-right">
                          <div className="font-bold">{formatCurrency(category.amount)}</div>
                          <div className="text-sm text-gray-600">{category.percentage}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="tenants" className="space-y-6">
          {tenantRetention && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Retention Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Tenant Retention Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-600">Retention Rate</p>
                        <p className="text-2xl font-bold text-green-800">{tenantRetention.retention_rate}%</p>
                      </div>
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-600">Renewal Rate</p>
                        <p className="text-2xl font-bold text-blue-800">{tenantRetention.renewal_rate}%</p>
                      </div>
                    </div>
                    
                    <div className="p-3 border rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Avg. Tenancy Duration</span>
                        <span className="font-bold">{tenantRetention.average_tenancy_duration} months</span>
                      </div>
                    </div>
                    
                    <div className="p-3 border rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Satisfaction Score</span>
                        <span className="font-bold">{tenantRetention.satisfaction_score}/5.0</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Churn Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle>Churn Reasons</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {tenantRetention.churn_reasons.map((reason) => (
                      <div key={reason.reason} className="flex justify-between items-center p-2 border rounded">
                        <span className="font-medium">{reason.reason}</span>
                        <div className="text-right">
                          <div className="font-bold">{reason.count} tenants</div>
                          <div className="text-sm text-gray-600">{reason.percentage}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="custom" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Custom Report Builder</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div>
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={customFilters.date_range.start}
                    onChange={(e) => setCustomFilters(prev => ({
                      ...prev,
                      date_range: { ...prev.date_range, start: e.target.value }
                    }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={customFilters.date_range.end}
                    onChange={(e) => setCustomFilters(prev => ({
                      ...prev,
                      date_range: { ...prev.date_range, end: e.target.value }
                    }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="report-type">Report Type</Label>
                  <Select value={customFilters.report_type} onValueChange={(value) => 
                    setCustomFilters(prev => ({ ...prev, report_type: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="financial">Financial Summary</SelectItem>
                      <SelectItem value="occupancy">Occupancy Analysis</SelectItem>
                      <SelectItem value="maintenance">Maintenance Report</SelectItem>
                      <SelectItem value="tenant">Tenant Analysis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-end">
                  <Button className="w-full">
                    <Filter className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                </div>
              </div>
              
              <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">Configure filters above and click "Generate Report" to create your custom report</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 