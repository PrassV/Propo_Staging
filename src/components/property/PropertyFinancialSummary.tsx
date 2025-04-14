import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertTriangle } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import api from '@/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface PropertyFinancialSummaryProps {
  propertyId: string;
}

interface FinancialData {
  total_revenue: number;
  total_expenses: number;
  net_income: number;
  occupancy_rate: number;
  rent_collection_rate: number;
  payment_history: {
    month: string;
    revenue: number;
    expenses: number;
    net_income: number;
  }[];
  expense_breakdown: {
    category: string;
    amount: number;
  }[];
}

export default function PropertyFinancialSummary({ propertyId }: PropertyFinancialSummaryProps) {
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFinancialData = async () => {
      if (!propertyId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Use existing reporting or payment services
        // This is a placeholder - replace with actual API call when available
        const payments = await api.payment.getPayments({
          property_id: propertyId,
          sort_by: 'due_date',
          sort_order: 'desc',
          limit: 100
        });
        
        // Process the payments to create financial summary
        // This is a simplified example - in a real implementation, you would use a dedicated endpoint
        const revenue = payments.items.reduce((sum, payment) => 
          payment.status === 'paid' ? sum + payment.amount : sum, 0);
        
        // Fetch expenses if you have an expenses API
        // For now, we'll use dummy data
        const expenses = revenue * 0.3; // Dummy calculation - 30% of revenue goes to expenses
        
        // Create dummy payment history for the chart
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        const paymentHistory = months.map(month => ({
          month,
          revenue: Math.round(Math.random() * 5000) + 1000,
          expenses: Math.round(Math.random() * 2000) + 500,
          net_income: Math.round(Math.random() * 3000) + 500
        }));
        
        // Create dummy expense breakdown
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
          occupancy_rate: 85, // Dummy value
          rent_collection_rate: 92, // Dummy value
          payment_history: paymentHistory,
          expense_breakdown: expenseBreakdown
        });
      } catch (err) {
        console.error("Error fetching financial data:", err);
        setError(err instanceof Error ? err.message : 'Failed to load financial data');
        setFinancialData(null);
      } finally {
        setLoading(false);
      }
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
        <Tabs value={period} onValueChange={(value) => setPeriod(value as any)}>
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
            <p className="text-2xl font-bold">${financialData.total_revenue.toFixed(2)}</p>
          </div>
          <div className="bg-muted p-4 rounded-md">
            <p className="text-sm text-muted-foreground">Total Expenses</p>
            <p className="text-2xl font-bold">${financialData.total_expenses.toFixed(2)}</p>
          </div>
          <div className="bg-muted p-4 rounded-md">
            <p className="text-sm text-muted-foreground">Net Income</p>
            <p className="text-2xl font-bold">${financialData.net_income.toFixed(2)}</p>
          </div>
          <div className="bg-muted p-4 rounded-md">
            <p className="text-sm text-muted-foreground">Collection Rate</p>
            <p className="text-2xl font-bold">{financialData.rent_collection_rate}%</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <CardDescription className="mb-2">Revenue vs Expenses</CardDescription>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={financialData.payment_history}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${value}`, '']} />
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
                    data={financialData.expense_breakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                    nameKey="category"
                  >
                    {financialData.expense_breakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, '']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
