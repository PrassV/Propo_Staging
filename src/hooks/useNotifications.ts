import { useState, useEffect, useCallback } from 'react';
import api from '@/api';
import { Notification } from '@/api/types';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';

// Hook to manage notifications
export function useNotifications() {
  const { user, initialized } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch notifications from the API
  const fetchNotifications = useCallback(async () => {
    if (!initialized || !user) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const response = await api.notification.getNotifications({ limit: 50 });
      setNotifications(response.notifications || []);
      setUnreadCount(response.unread_count || 0);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      const msg = err instanceof Error ? err.message : 'Could not load notifications';
      if (!(err instanceof Error && err.message.includes('403'))) {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [initialized, user]);

  // Fetch only when auth is initialized and user exists
  useEffect(() => {
    if (initialized && user) {
      fetchNotifications();
    } else if (initialized) {
      setLoading(false);
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [initialized, user, fetchNotifications]);

  // Mark a single notification as read
  const markAsRead = useCallback(async (id: string) => {
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1)); 
    try {
      await api.notification.markNotificationAsRead(id);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      toast.error('Failed to update notification status.');
      // Revert optimistic update on error
      fetchNotifications(); 
    }
  }, [fetchNotifications]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    try {
      await api.notification.markAllNotificationsAsRead();
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      toast.error('Failed to update notifications.');
      // Revert optimistic update
      fetchNotifications();
    }
  }, [fetchNotifications]);

  return { notifications, unreadCount, loading, error, fetchNotifications, markAsRead, markAllAsRead };
} 