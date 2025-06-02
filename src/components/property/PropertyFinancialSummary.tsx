import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import api from '@/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FinancialSummary } from '@/api/types';

interface PropertyFinancialSummaryProps {
  propertyId: string;
}

// Backend response structure
interface BackendFinancialResponse {
  period?: string;
  date_range?: {
    start_date: string;
    end_date: string;
  };
  summary?: {
    total_income: number;
    total_expenses: number;
    net_income: number;
    profit_margin: number;
  };
  occupancy_rate?: number;
  income_breakdown?: Array<{ category: string; amount: number }>;
  expense_breakdown?: Array<{ category: string; amount: number }>;
  trend_data?: Array<{ 
    month: string; 
    revenue: number; 
    expenses: number; 
    net_income: number; 
  }>;
}

// Helper function to safely format numbers
const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0.00';
  }
  return value.toFixed(2);
};

const formatPercentage = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  return value.toFixed(0);
};

export default function PropertyFinancialSummary({ propertyId }: PropertyFinancialSummaryProps) {
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [financialData, setFinancialData] = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFinancialData = async () => {
      if (!propertyId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Use the new financial service API
        const response = await api.financial.getFinancialSummary(propertyId, period);
        
        // Check if response matches FinancialSummary structure or needs transformation
        if (response && typeof response === 'object') {
          // If response has the expected structure, use it directly
          if ('total_revenue' in response && 'total_expenses' in response) {
            setFinancialData(response as FinancialSummary);
          } else {
            // Transform backend response to match frontend expectations
            const backendResponse = response as BackendFinancialResponse;
            const transformedData: FinancialSummary = {
              total_revenue: backendResponse.summary?.total_income || 0,
              total_expenses: backendResponse.summary?.total_expenses || 0,
              net_income: backendResponse.summary?.net_income || 0,
              occupancy_rate: backendResponse.occupancy_rate || 0,
              rent_collection_rate: backendResponse.summary?.profit_margin || 85,
              payment_history: backendResponse.trend_data || [],
              expense_breakdown: backendResponse.expense_breakdown || []
            };
            setFinancialData(transformedData);
          }
        } else {
          // Fallback to placeholder data if response is invalid
          generatePlaceholderData();
        }
      } catch (err) {
        console.error("Error fetching financial data:", err);
        setError(err instanceof Error ? err.message : 'Failed to load financial data');
        
        // Fallback to placeholder data for development
        generatePlaceholderData();
      } finally {
        setLoading(false);
      }
    };
    
    // Temporary function to generate placeholder data until backend is ready
    const generatePlaceholderData = () => {
      const revenue = Math.round(Math.random() * 15000) + 5000;
      const expenses = Math.round(revenue * 0.3);
      
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      const paymentHistory = months.map(month => ({
        month,
        revenue: Math.round(Math.random() * 5000) + 1000,
        expenses: Math.round(Math.random() * 2000) + 500,
        net_income: Math.round(Math.random() * 3000) + 500
      }));
      
      const expenseBreakdown = [
        { category: 'Maintenance', amount: expenses * 0.4 },
        { category: 'Utilities', amount: expenses * 0.25 },
        { category: 'Insurance', amount: expenses * 0.15 },
        { category: 'Property Tax', amount: expenses * 0.1 },
        { category: 'Other', amount: expenses * 0.1 }
      ];
      
      setFinancialData({
        total_revenue: revenue,
        total_expenses: expenses,
        net_income: revenue - expenses,
        occupancy_rate: 85,
        rent_collection_rate: 92,
        payment_history: paymentHistory,
        expense_breakdown: expenseBreakdown
      });
    };
    
    fetchFinancialData();
  }, [propertyId, period]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Financial Summary</CardTitle>
          <Skeleton className="h-4 w-[100px]" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-destructive">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5" />
            <p className="font-medium">Error loading financial data</p>
          </div>
          <p className="text-sm">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!financialData) return null;

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Summary</CardTitle>
        <Tabs value={period} onValueChange={(value) => setPeriod(value as 'month' | 'quarter' | 'year')}>
          <TabsList>
            <TabsTrigger value="month">Monthly</TabsTrigger>
            <TabsTrigger value="quarter">Quarterly</TabsTrigger>
            <TabsTrigger value="year">Yearly</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-muted p-4 rounded-md">
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-bold">${formatCurrency(financialData.total_revenue)}</p>
          </div>
          <div className="bg-muted p-4 rounded-md">
            <p className="text-sm text-muted-foreground">Total Expenses</p>
            <p className="text-2xl font-bold">${formatCurrency(financialData.total_expenses)}</p>
          </div>
          <div className="bg-muted p-4 rounded-md">
            <p className="text-sm text-muted-foreground">Net Income</p>
            <p className="text-2xl font-bold">${formatCurrency(financialData.net_income)}</p>
          </div>
          <div className="bg-muted p-4 rounded-md">
            <p className="text-sm text-muted-foreground">Collection Rate</p>
            <p className="text-2xl font-bold">{formatPercentage(financialData.rent_collection_rate)}%</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <CardDescription className="mb-2">Revenue vs Expenses</CardDescription>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={financialData.payment_history || []}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${formatCurrency(Number(value))}`, '']} />
                  <Bar dataKey="revenue" name="Revenue" fill="#8884d8" />
                  <Bar dataKey="expenses" name="Expenses" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div>
            <CardDescription className="mb-2">Expense Breakdown</CardDescription>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={financialData.expense_breakdown || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${formatPercentage(percent * 100)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                    nameKey="category"
                  >
                    {(financialData.expense_breakdown || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`$${formatCurrency(Number(value))}`, '']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
