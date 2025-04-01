import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { Notification } from '../api/types';
import toast from 'react-hot-toast';

// Hook to manage notifications
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch notifications from the API
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch latest notifications (e.g., limit 50)
      const response = await api.notification.getNotifications({ limit: 50 }); 
      setNotifications(response.notifications);
      setUnreadCount(response.unread_count);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      const msg = err instanceof Error ? err.message : 'Could not load notifications';
      setError(msg);
      // Don't toast error on every background fetch potentially
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and potentially periodic refresh
  useEffect(() => {
    fetchNotifications();
    // Optional: Set up interval polling if WebSockets aren't used
    // const intervalId = setInterval(fetchNotifications, 60000); // Fetch every 60 seconds
    // return () => clearInterval(intervalId);
  }, [fetchNotifications]);

  // Mark a single notification as read
  const markAsRead = useCallback(async (id: string) => {
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1)); 
    try {
      await api.notification.markNotificationAsRead(id);
      // No need to refetch immediately due to optimistic update
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