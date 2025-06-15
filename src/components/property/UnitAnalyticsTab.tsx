import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Home, 
  Wrench, 
  Users,
  BarChart3,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  Star
} from 'lucide-react';
import { 
  getUnitAnalytics, 
  getUnitPerformanceMetrics, 
  getUnitPredictiveInsights,
  getUnitComparison,
  recordUnitAnalyticsEvent,
  type UnitAnalytics,
  type UnitPerformanceMetrics,
  type UnitPredictiveInsights
} from '@/api/services/reportService';

interface UnitAnalyticsTabProps {
  unitId: string;
  propertyId: string;
  unitNumber: string;
}

export default function UnitAnalyticsTab({ unitId, propertyId, unitNumber }: UnitAnalyticsTabProps) {
  const [analytics, setAnalytics] = useState<UnitAnalytics | null>(null);
  const [performance, setPerformance] = useState<UnitPerformanceMetrics | null>(null);
  const [insights, setInsights] = useState<UnitPredictiveInsights | null>(null);
  const [comparison, setComparison] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadAnalyticsData();
    // Record analytics view event
    recordUnitAnalyticsEvent(unitId, 'analytics_viewed', { tab: 'overview' });
  }, [unitId, propertyId]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      const [analyticsData, performanceData, insightsData, comparisonData] = await Promise.all([
        getUnitAnalytics(unitId),
        getUnitPerformanceMetrics(unitId),
        getUnitPredictiveInsights(unitId),
        getUnitComparison(unitId, propertyId)
      ]);

      setAnalytics(analyticsData);
      setPerformance(performanceData);
      setInsights(insightsData);
      setComparison(comparisonData);
    } catch (error) {
      console.error('Error loading unit analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'text-green-600 bg-green-50 border-green-200';
      case 'good': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'average': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'poor': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics || !performance || !insights) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Unable to load analytics data. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Monthly Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(analytics.monthlyRent)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
            <div className="mt-2">
              <Badge variant="outline" className={getHealthColor(performance.indicators.revenueHealth)}>
                {performance.indicators.revenueHealth}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Occupancy Rate</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatPercentage(analytics.occupancyRate)}
                </p>
              </div>
              <Home className="h-8 w-8 text-blue-600" />
            </div>
            <div className="mt-2">
              <Badge variant="outline" className={getHealthColor(performance.indicators.occupancyHealth)}>
                {performance.indicators.occupancyHealth}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">ROI</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatPercentage(analytics.roi)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
            <div className="mt-2">
              <span className="text-sm text-gray-500">
                vs Property Avg: {formatPercentage(comparison?.propertyAverage?.roi || 0)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tenant Satisfaction</p>
                <p className="text-2xl font-bold text-orange-600">
                  {analytics.tenantSatisfaction.toFixed(1)}
                </p>
              </div>
              <Star className="h-8 w-8 text-orange-600" />
            </div>
            <div className="mt-2">
              <Badge variant="outline" className={getHealthColor(performance.indicators.overallHealth)}>
                Overall: {performance.indicators.overallHealth}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="operational">Operational</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Performance Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">This Unit</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Revenue</span>
                      <span className="font-medium">{formatCurrency(analytics.monthlyRent)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Occupancy</span>
                      <span className="font-medium">{formatPercentage(analytics.occupancyRate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Satisfaction</span>
                      <span className="font-medium">{analytics.tenantSatisfaction.toFixed(1)}/5</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Property Average</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Revenue</span>
                      <span className="font-medium">{formatCurrency(comparison?.propertyAverage?.monthlyRent || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Occupancy</span>
                      <span className="font-medium">{formatPercentage(comparison?.propertyAverage?.occupancyRate || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Satisfaction</span>
                      <span className="font-medium">{(comparison?.propertyAverage?.tenantSatisfaction || 0).toFixed(1)}/5</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Rankings</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Revenue</span>
                      <Badge variant="outline">
                        #{comparison?.rankings?.revenue?.rank || 0} of {comparison?.rankings?.revenue?.total || 0}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Occupancy</span>
                      <Badge variant="outline">
                        #{comparison?.rankings?.occupancy?.rank || 0} of {comparison?.rankings?.occupancy?.total || 0}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Satisfaction</span>
                      <Badge variant="outline">
                        #{comparison?.rankings?.satisfaction?.rank || 0} of {comparison?.rankings?.satisfaction?.total || 0}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {performance.recommendations.map((rec, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge 
                            variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'}
                          >
                            {rec.priority} priority
                          </Badge>
                          <Badge variant="outline">{rec.type}</Badge>
                        </div>
                        <h4 className="font-medium text-gray-900 mb-1">{rec.title}</h4>
                        <p className="text-sm text-gray-600 mb-2">{rec.description}</p>
                        <p className="text-sm font-medium text-green-600">{rec.estimatedImpact}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Financial Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Monthly Rent</span>
                  <span className="font-medium">{formatCurrency(analytics.monthlyRent)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Yearly Revenue</span>
                  <span className="font-medium">{formatCurrency(analytics.yearlyRevenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Maintenance Costs</span>
                  <span className="font-medium">{formatCurrency(analytics.maintenanceCosts)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Profit Margin</span>
                  <span className="font-medium">{formatPercentage(analytics.profitMargin)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">ROI</span>
                  <span className="font-medium">{formatPercentage(analytics.roi)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Revenue per Sq Ft</span>
                  <span className="font-medium">${analytics.revenuePerSqFt.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.revenueTrend.slice(0, 6).map((trend, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{trend.month}</span>
                      <span className="font-medium">{formatCurrency(trend.revenue)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="operational" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Operational Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Occupancy Rate</span>
                  <span className="font-medium">{formatPercentage(analytics.occupancyRate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Vacancy Duration</span>
                  <span className="font-medium">{analytics.vacancyDuration} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Turnover Rate</span>
                  <span className="font-medium">{formatPercentage(analytics.turnoverRate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Lease Renewal Rate</span>
                  <span className="font-medium">{formatPercentage(analytics.leaseRenewalRate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Maintenance Frequency</span>
                  <span className="font-medium">{analytics.maintenanceFrequency}/year</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Maintenance Cost</span>
                  <span className="font-medium">{formatCurrency(analytics.averageMaintenanceCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Timeliness</span>
                  <span className="font-medium">{formatPercentage(analytics.paymentTimeliness)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Maintenance Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.maintenanceTrend.slice(0, 6).map((trend, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{trend.month}</span>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(trend.cost)}</div>
                        <div className="text-xs text-gray-500">{trend.requests} requests</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          {/* Market Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Market Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Rent Optimization</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Current Rent</span>
                      <span className="font-medium">{formatCurrency(insights.marketInsights.rentOptimization.currentRent)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Suggested Rent</span>
                      <span className="font-medium text-green-600">{formatCurrency(insights.marketInsights.rentOptimization.suggestedRent)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Potential Increase</span>
                      <span className="font-medium text-green-600">+{formatCurrency(insights.marketInsights.rentOptimization.potentialIncrease)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Market Confidence</span>
                      <span className="font-medium">{insights.marketInsights.rentOptimization.marketConfidence}%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Market Position</h4>
                  <div className="space-y-3">
                    <div>
                      <span className="text-gray-600">Competitive Position</span>
                      <Badge variant="outline" className="ml-2">
                        {insights.marketInsights.competitivePosition.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-gray-600">Demand Level</span>
                      <Badge 
                        variant={insights.marketInsights.demandLevel === 'high' ? 'default' : 'secondary'}
                        className="ml-2"
                      >
                        {insights.marketInsights.demandLevel}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Predictive Forecasts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Forecast</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {insights.revenueForecast.slice(0, 6).map((forecast, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{forecast.month}</span>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(forecast.predictedRevenue)}</div>
                        <div className="text-xs text-gray-500">{forecast.confidence}% confidence</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Maintenance Forecast</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {insights.maintenanceForecast.map((forecast, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{forecast.category}</div>
                          <div className="text-sm text-gray-600">{forecast.predictedDate}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(forecast.estimatedCost)}</div>
                          <div className="text-xs text-gray-500">{forecast.confidence}% confidence</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Risk Assessment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Risk Assessment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insights.riskFactors.map((risk, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{risk.type}</Badge>
                        <Badge 
                          variant={risk.impact === 'high' ? 'destructive' : risk.impact === 'medium' ? 'default' : 'secondary'}
                        >
                          {risk.impact} impact
                        </Badge>
                      </div>
                      <span className="text-sm text-gray-500">{risk.probability}% probability</span>
                    </div>
                    <h4 className="font-medium text-gray-900 mb-1">{risk.risk}</h4>
                    <p className="text-sm text-gray-600">
                      <strong>Mitigation:</strong> {risk.mitigation}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 