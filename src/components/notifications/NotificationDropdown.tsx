import React from 'react';
import { Link } from 'react-router-dom';
import { Notification } from '../../api/types';
import { CheckCheck } from 'lucide-react'; // Icon for "Mark all as read"
import TimeAgo from 'react-timeago'; // Using react-timeago for relative dates

interface NotificationDropdownProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClose: () => void; // Function to close the dropdown
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onClose,
}) => {
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    // Optional: Navigate based on notification.link_url or type
    // if (notification.link_url) { router.push(notification.link_url); }
    onClose(); // Close dropdown after clicking an item
  };

  const handleMarkAllClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent dropdown from closing if inside
    onMarkAllAsRead();
  };

  return (
    <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
      <div className="p-4 flex justify-between items-center border-b">
        <h3 className="font-semibold text-lg">Notifications</h3>
        {unreadCount > 0 && (
          <button 
            onClick={handleMarkAllClick}
            className="text-xs text-blue-600 hover:underline flex items-center space-x-1"
            title="Mark all as read"
          >
            <CheckCheck size={14} />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="text-gray-500 text-center p-6">No new notifications.</p>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                notification.is_read ? 'opacity-70' : 'font-medium'
              }`}
            >
              <p className="text-sm mb-1">{notification.message}</p>
              <p className="text-xs text-gray-400">
                <TimeAgo date={notification.created_at} />
              </p>
            </div>
          ))
        )}
      </div>

      <div className="p-2 border-t text-center">
        <Link 
          to="/dashboard/notifications" // TODO: Update route if needed
          onClick={onClose} 
          className="text-sm text-blue-600 hover:underline"
        >
          View all notifications
        </Link>
      </div>
    </div>
  );
};

export default NotificationDropdown; 