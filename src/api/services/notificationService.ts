import apiClient from '../client';
import { 
  // Notification, // Removed unused
  NotificationCreate, NotificationSettings,
  NotificationResponse, NotificationsResponse, NotificationSettingsResponse
} from '../types';

// Interface for query parameters for getNotifications
interface GetNotificationsParams {
  is_read?: boolean;
  limit?: number;
  offset?: number;
}

export const getNotifications = async (params: GetNotificationsParams = {}): Promise<NotificationsResponse> => {
  const response = await apiClient.get<NotificationsResponse>('/notifications/', { params });
  return response.data;
};

export const getNotificationById = async (id: string): Promise<NotificationResponse> => {
  const response = await apiClient.get<NotificationResponse>(`/notifications/${id}`);
  return response.data;
};

// Note: Backend create endpoint is admin-only
export const createNotification = async (notificationData: NotificationCreate): Promise<NotificationResponse> => {
  const response = await apiClient.post<NotificationResponse>('/notifications/', notificationData);
  return response.data;
};

export const markNotificationAsRead = async (id: string): Promise<NotificationResponse> => {
  const response = await apiClient.put<NotificationResponse>(`/notifications/${id}/read`);
  return response.data;
};

export const markAllNotificationsAsRead = async (): Promise<{ message: string }> => {
  const response = await apiClient.put<{ message: string }>('/notifications/read-all');
  return response.data;
};

export const deleteNotification = async (id: string): Promise<{ message: string }> => {
  const response = await apiClient.delete<{ message: string }>(`/notifications/${id}`);
  return response.data;
};

// --- Notification Settings ---

export const getNotificationSettings = async (): Promise<NotificationSettingsResponse> => {
  const response = await apiClient.get<NotificationSettingsResponse>('/notifications/settings');
  return response.data;
};

// Use Partial<NotificationSettings> or a dedicated update type
export const updateNotificationSettings = async (settingsData: Partial<NotificationSettings>): Promise<NotificationSettingsResponse> => {
  const response = await apiClient.put<NotificationSettingsResponse>('/notifications/settings', settingsData);
  return response.data;
}; 