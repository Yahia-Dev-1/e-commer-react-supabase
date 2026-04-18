import React, { useState, useEffect } from 'react';
import '../styles/Notifications.css';

export default function Notifications({ userEmail, onNotificationsUpdate, darkMode = false }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();
    // Check for new notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [userEmail]);

  const loadNotifications = async () => {
    if (!userEmail) return;

    try {
      const { getNotificationsForUser } = await import('../utils/supabase');
      const userNotifications = await getNotificationsForUser(userEmail);
      setNotifications(userNotifications);
      setUnreadCount(userNotifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error loading notifications from Supabase:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const { markNotificationAsReadInSupabase } = await import('../utils/supabase');
      await markNotificationAsReadInSupabase(notificationId);
      loadNotifications();
      if (onNotificationsUpdate) {
        onNotificationsUpdate();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!userEmail) return;

    try {
      const { markAllNotificationsAsReadInSupabase } = await import('../utils/supabase');
      await markAllNotificationsAsReadInSupabase(userEmail);
      loadNotifications();
      if (onNotificationsUpdate) {
        onNotificationsUpdate();
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!localStorage.getItem('currentUserEmail')) {
    return null;
  }

  return (
    <div className={`notifications-container ${darkMode ? 'dark-mode' : ''}`}>
      <div className="notifications-header">
        <h3>Notifications</h3>
        {unreadCount > 0 && (
          <div className="notifications-actions">
            <span className="unread-badge">{unreadCount}</span>
            <button className="mark-all-read-btn" onClick={markAllAsRead}>
              Mark all as read
            </button>
          </div>
        )}
      </div>

      <div className="notifications-list">
        {notifications.length === 0 ? (
          <div className="no-notifications">
            <p>No notifications yet</p>
          </div>
        ) : (
          notifications.map(notification => (
            <div 
              key={notification.id} 
              className={`notification-item ${!notification.read ? 'unread' : ''}`}
              onClick={() => markAsRead(notification.id)}
            >
                             <div className="notification-icon">
                 {notification.type === 'rejection' && (
                   <span className="rejection-icon">❌</span>
                 )}
                 {notification.type === 'deletion' && (
                   <span className="deletion-icon">🗑️</span>
                 )}
               </div>
              <div className="notification-content">
                <p className="notification-message">{notification.message}</p>
                <p className="notification-date">{formatDate(notification.date)}</p>
              </div>
              {!notification.read && <div className="unread-indicator"></div>}
            </div>
          ))
        )}
      </div>
    </div>
  );
} 