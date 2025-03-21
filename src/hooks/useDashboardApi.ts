import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';
import { DashboardData, DashboardSummary } from '../api/types';

export function useDashboardSummary() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const summaryData = await api.dashboard.getDashboardSummary();
      setSummary(summaryData);
    } catch (error: unknown) {
      console.error('Error fetching dashboard summary:', error);
      let errorMessage = 'Failed to fetch dashboard summary';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'formattedMessage' in error) {
        errorMessage = (error as { formattedMessage: string }).formattedMessage;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSummary();
    }
  }, [user]);

  return { summary, loading, error, refetch: fetchSummary };
}

export function useDashboardData(months: number = 6) {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const dashboardData = await api.dashboard.getDashboardData(months);
      setData(dashboardData);
    } catch (error: unknown) {
      console.error('Error fetching dashboard data:', error);
      let errorMessage = 'Failed to fetch dashboard data';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'formattedMessage' in error) {
        errorMessage = (error as { formattedMessage: string }).formattedMessage;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, months]);

  return { data, loading, error, refetch: fetchData };
} 