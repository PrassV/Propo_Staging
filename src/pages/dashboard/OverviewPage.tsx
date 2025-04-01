import React, { useState, useEffect } from 'react';
import { getDashboardData, DashboardSummary } from '../../api/services/reportService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"; // Import Card components
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { AlertCircle, TrendingUp, Home, Users, AlertTriangle } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

// Placeholder data structure for charts if API data needs transformation
const financialData = [
  { name: 'Income', value: 0 },
  { name: 'Expenses', value: 0 },
];

const occupancyData = [
  { name: 'Occupied', value: 0 },
  { name: 'Vacant', value: 0 },
];

export default function OverviewPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getDashboardData();
        setSummary(data);
      } catch (err: unknown) {
        console.error("Error fetching dashboard overview:", err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data.');
        setSummary(null); // Clear data on error
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Transform data for charts (example)
  const transformedFinancialData = summary ? [
      { name: 'Income', value: summary.recentIncome },
      { name: 'Expenses', value: summary.recentExpenses },
  ] : financialData; // Use placeholder if no summary

  const transformedOccupancyData = summary ? [
      { name: 'Occupied', value: summary.occupiedUnits },
      { name: 'Vacant', value: summary.totalUnits - summary.occupiedUnits },
  ] : occupancyData; // Use placeholder if no summary

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Dashboard Overview</h1>

      {error && (
        <Card className="bg-destructive/10 border-destructive text-destructive-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Loading Data</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <p className="text-xs">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Key Stats Cards */} 
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
                  <Home className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{summary?.totalProperties ?? 'N/A'}</div>
                  {/* <p className="text-xs text-muted-foreground">+2 from last month</p> */}
              </CardContent>
          </Card>
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{summary?.totalTenants ?? 'N/A'}</div>
                  {/* <p className="text-xs text-muted-foreground">+5 from last month</p> */}
              </CardContent>
          </Card>
          <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
                   <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">
                      {summary && summary.totalUnits > 0 
                          ? `${Math.round((summary.occupiedUnits / summary.totalUnits) * 100)}%`
                          : 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                      {summary?.occupiedUnits ?? '-'} / {summary?.totalUnits ?? '-'} Units Occupied
                  </p>
              </CardContent>
          </Card>
           <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Alerts / Actions</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold">{summary?.alerts ?? 0}</div>
                  <p className="text-xs text-muted-foreground">Overdue payments, requests, etc.</p>
              </CardContent>
          </Card>
      </div>

      {/* Charts Section */} 
      <div className="grid gap-6 md:grid-cols-2">
          <Card>
              <CardHeader>
                  <CardTitle>Recent Finances (Last 30 Days)</CardTitle>
                  <CardDescription>Income vs Expenses</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                 {summary ? (
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={transformedFinancialData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          {/* <Legend /> */} 
                          <Bar dataKey="value" fill="#8884d8">
                              {transformedFinancialData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.name === 'Income' ? '#00C49F' : '#FF8042'} />
                              ))}
                          </Bar>
                      </BarChart>
                  </ResponsiveContainer>
                  ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">No financial data available.</div>
                  )}
              </CardContent>
          </Card>

          <Card>
              <CardHeader>
                  <CardTitle>Unit Occupancy</CardTitle>
                  <CardDescription>Occupied vs Vacant Units</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                 {summary && summary.totalUnits > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie
                              data={transformedOccupancyData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              // label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                              label
                          >
                              {transformedOccupancyData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                          </Pie>
                          <Tooltip />
                           <Legend />
                      </PieChart>
                  </ResponsiveContainer>
                   ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">No occupancy data available.</div>
                  )}
              </CardContent>
          </Card>
      </div>
    </div>
  );
} 