import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../contexts/ToastContext';
import '../styles/AdminNew.css';
import database from '../utils/database';
import { subscribeToUsers, deleteUserFromSupabase, updateProductInSupabase, getProductsFromSupabase, getOrdersFromSupabase, subscribeToOrders, deleteOrderFromSupabase, getUsersFromSupabase, restoreProductQuantities, getAllNotificationsFromSupabase, markNotificationAsReadInSupabase, deleteNotificationFromSupabase } from '../utils/supabase';

export default function Admin({ darkMode = true }) {
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(true);
  const [showAllUsers] = useState(true); // Changed to true to show all users by default
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [newAdmin, setNewAdmin] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [addAdminError] = useState('');

  const checkAuthorization = useCallback(() => {
    const savedAdminEmails = JSON.parse(localStorage.getItem('admin_emails') || '[]');
    const defaultAdminEmails = ['yahiapro400@gmail.com'];
    const adminEmails = savedAdminEmails.length > 0 ? savedAdminEmails : defaultAdminEmails;
    
    const currentUserEmail = localStorage.getItem('currentUserEmail');
    
    if (currentUserEmail && adminEmails.includes(currentUserEmail)) {
      const allUsers = database.getUsers();
      const userExists = allUsers.some(user => user.email === currentUserEmail);
      
      if (userExists) {
        setIsAuthorized(true);
              } else {
        addProtectedAdmins();
        setTimeout(() => {
          setIsAuthorized(true);
                  }, 500);
      }
    } else {
            setIsAuthorized(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    
    // Get users from Supabase directly
    let allUsers = [];
    try {
      allUsers = await getUsersFromSupabase();
          } catch (error) {
            // Fallback to localStorage
      allUsers = database.getUsers();
    }
    
    // Get orders from Supabase (with localStorage fallback)
    let allOrders = [];
    try {
      const { data: supabaseOrders } = await getOrdersFromSupabase(100, 0);
                        allOrders = supabaseOrders || [];
    } catch (error) {
                        allOrders = database.getOrders();
    }
    
    const protectedAdmins = [
      {
        email: 'yahiapro400@gmail.com',
        password: 'ylyr5767ykm34562',
        name: 'Yahia Pro'
      }
    ];

    protectedAdmins.forEach(admin => {
      const existingUser = allUsers.find(user => user.email === admin.email);
      if (!existingUser) {
        try {
          // Check if user exists in localStorage before registering
          const localStorageUsers = database.getUsers();
          const userInLocalStorage = localStorageUsers.find(user => user.email === admin.email);
          
          if (!userInLocalStorage) {
            database.registerUser({
              email: admin.email,
              password: admin.password,
              name: admin.name
            });
                      } else {
                      }
        } catch (error) {
                  }
      } else {
              }
    });

    const adminEmails = JSON.parse(localStorage.getItem('admin_emails') || '[]');
    protectedAdmins.forEach(admin => {
      if (!adminEmails.includes(admin.email)) {
        adminEmails.push(admin.email);
      }
    });
    localStorage.setItem('admin_emails', JSON.stringify(adminEmails));

    const updatedUsers = database.getUsers();
    const savedAdminEmails = JSON.parse(localStorage.getItem('admin_emails') || '[]');
    const defaultAdminEmails = ['yahiapro400@gmail.com'];
    const finalAdminEmails = savedAdminEmails.length > 0 ? savedAdminEmails : defaultAdminEmails;
    const filteredUsers = updatedUsers.filter(user => finalAdminEmails.includes(user.email));
    
    const usersToShow = showAllUsers ? updatedUsers : filteredUsers;
    
    setUsers(usersToShow);
    setOrders(allOrders);
    setLoading(false);
  }, [showAllUsers]);

  useEffect(() => {
    const initializeProtectedAdmins = () => {
      const protectedAdmins = [
        {
          email: 'yahiapro400@gmail.com',
          password: 'ylyr5767ykm34562',
          name: 'Yahia Pro'
        }
      ];

      const allUsers = database.getUsers();
      const adminEmails = JSON.parse(localStorage.getItem('admin_emails') || '[]');

      protectedAdmins.forEach(admin => {
        const existingUser = allUsers.find(user => user.email === admin.email);
        if (!existingUser) {
          try {
            database.registerUser({
              email: admin.email,
              password: admin.password,
              name: admin.name
            });
                      } catch (error) {
                      }
        }

        if (!adminEmails.includes(admin.email)) {
          adminEmails.push(admin.email);
        }
      });

      localStorage.setItem('admin_emails', JSON.stringify(adminEmails));
    };

    initializeProtectedAdmins();
    
    setTimeout(() => {
      checkAuthorization();
    }, 100);
    
    loadData();
  }, [checkAuthorization, loadData]);

  useEffect(() => {
    if (isAuthorized) {
      loadData();
    }
  }, [showAllUsers, isAuthorized, loadData]);

  // Subscribe to users changes from Supabase
  useEffect(() => {
    if (!isAuthorized) return;
    
    const unsubscribe = subscribeToUsers((supabaseUsers) => {
            setUsers(supabaseUsers);
    });
    
    return () => unsubscribe();
  }, [isAuthorized]);

  // Subscribe to orders changes from Supabase
  useEffect(() => {
    if (!isAuthorized) return;
    
    const unsubscribe = subscribeToOrders((supabaseOrders) => {
            setOrders(supabaseOrders || []);
    });
    
    return () => unsubscribe();
  }, [isAuthorized]);

  // Load admin notifications
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const adminNotifications = await getAllNotificationsFromSupabase(100, 0);
        setNotifications(adminNotifications);
      } catch (error) {
        console.error('Error loading admin notifications from Supabase:', error);
      }
    };

    loadNotifications();
  }, []);

  // Function to mark notification as read
  const markNotificationAsRead = async (notificationId) => {
    try {
      await markNotificationAsReadInSupabase(notificationId);
      const updatedNotifications = notifications.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      );
      setNotifications(updatedNotifications);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Function to delete notification
  const deleteNotification = async (notificationId) => {
    try {
      await deleteNotificationFromSupabase(notificationId);
      const updatedNotifications = notifications.filter(notif => notif.id !== notificationId);
      setNotifications(updatedNotifications);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const deleteUser = async (userId) => {
    const userToDelete = users.find(user => user.id === userId);

    if (!userToDelete) {
      showToast('User not found!', 'error');
      return;
    }

    const superAdmin = 'yahiapro400@gmail.com';
    const currentUserEmail = localStorage.getItem('currentUserEmail');

    // Only super admin can delete users
    if (currentUserEmail !== superAdmin) {
      showToast('❌ Only yahiapro400@gmail.com can delete admin accounts!', 'error');
      return;
    }

    // Super admin cannot be deleted
    if (userToDelete.email === superAdmin) {
      showToast('❌ Cannot delete the super admin account!', 'error');
      return;
    }

    if (window.confirm(`Are you sure you want to delete user: ${userToDelete.email}?`)) {
      try {
        // Delete from Supabase first
        await deleteUserFromSupabase(userId);
              } catch (error) {
              }

      // Delete from localStorage
      const success = database.deleteUser(userId);
      if (success) {
        showToast(`✅ User ${userToDelete.email} has been deleted successfully!`, 'success');
        loadData();
      } else {
        showToast('❌ Failed to delete user. Please try again.', 'error');
      }
    }
  };

  const handleEditUser = (user) => {
    const superAdmin = 'yahiapro400@gmail.com';
    const currentUserEmail = localStorage.getItem('currentUserEmail');

    // Only super admin can edit users
    if (currentUserEmail !== superAdmin) {
      showToast('❌ Only yahiapro400@gmail.com can edit admin accounts!', 'error');
      return;
    }

    // Super admin cannot be edited
    if (user.email === superAdmin) {
      showToast('❌ Cannot edit the super admin account!', 'error');
      return;
    }

    // Here you can add user edit logic
    // Like opening a modal for editing
  };

  const handleDeleteUser = async (user) => {
    const userId = user.id || users.find(u => u.email === user.email)?.id;
    if (userId) {
      await deleteUser(userId);
    } else {
      showToast('Could not find user ID', 'error');
    }
  };

  const handleMakeAdmin = async (user) => {
    const currentUserEmail = localStorage.getItem('currentUserEmail') || localStorage.getItem('loggedInUser') || localStorage.getItem('userEmail');
    const superAdmin = 'yahiapro400@gmail.com';

    // Only super admin can make users admin
    if (currentUserEmail !== superAdmin) {
      showToast('❌ Only yahiapro400@gmail.com can make users admin!', 'error');
      return;
    }

    // Check if user is already an admin
    const adminEmails = JSON.parse(localStorage.getItem('admin_emails') || '[]');
    if (adminEmails.includes(user.email)) {
      showToast('User is already an admin!', 'warning');
      return;
    }

    // Add user to admin list
    adminEmails.push(user.email);
    localStorage.setItem('admin_emails', JSON.stringify(adminEmails));

    showToast(`✅ ${user.email} is now an admin!`, 'success');
    loadData();
  };

  const rejectOrder = async (orderId) => {
    const orderToReject = orders.find(order => order.id === orderId);
    if (!orderToReject) return;

    // Check if already rejected (prevent double stock restoration)
    if (orderToReject.status === 'rejected') {
      showToast('Order is already rejected!', 'warning');
      return;
    }

    // Ask for rejection reason
    const rejectionReason = prompt('Please enter the reason for rejecting this order:');
    if (!rejectionReason) {
      showToast('Rejection cancelled. No reason provided.', 'warning');
      return;
    }

                
    const updatedOrders = orders.map(order =>
      order.id === orderId ? { ...order, status: 'rejected', rejectionReason } : order
    );
    setOrders(updatedOrders);
    localStorage.setItem('ecommerce_orders', JSON.stringify(updatedOrders));

    // Restore product quantities to Supabase (sync across all devices)
        await restoreProductQuantities(orderToReject);

    addRejectionNotification(orderToReject, rejectionReason);
    showToast(`Order #${orderToReject.orderNumber} has been rejected. Products returned to stock.`, 'success');
  };

  // Approve order - stock already deducted when order was created
  const approveOrder = (orderId) => {
    const orderToApprove = orders.find(order => order.id === orderId);
    if (!orderToApprove) return;
    
    // Check if already approved
    if (orderToApprove.status === 'approved') {
      showToast('Order is already approved!', 'warning');
      return;
    }
    
    // Update order status only - stock was already deducted when order was created
    const updatedOrders = orders.map(order =>
      order.id === orderId ? { ...order, status: 'approved' } : order
    );
    setOrders(updatedOrders);
    localStorage.setItem('ecommerce_orders', JSON.stringify(updatedOrders));
    
    showToast(`Order #${orderToApprove.orderNumber} approved!`, 'success');
  };

  const updateShippingStatus = (orderId, status) => {
    const updatedOrders = orders.map(order =>
      order.id === orderId ? { ...order, shippingStatus: status } : order
    );
    setOrders(updatedOrders);
    localStorage.setItem('ecommerce_orders', JSON.stringify(updatedOrders));
  };

  const updateDeliveryTime = (orderId, time) => {
    const updatedOrders = orders.map(order =>
      order.id === orderId ? { ...order, estimatedDeliveryTime: time } : order
    );
    setOrders(updatedOrders);
    localStorage.setItem('ecommerce_orders', JSON.stringify(updatedOrders));
  };

  const deleteOrder = async (orderId) => {
    const orderToDelete = orders.find(order => order.id === orderId);
    if (!orderToDelete) return;

    if (window.confirm(`Are you sure you want to delete order #${orderToDelete.orderNumber}?`)) {
      // Delete from Supabase
      try {
        await deleteOrderFromSupabase(orderId);
              } catch (error) {
              }
      
      // Update local state
      const updatedOrders = orders.filter(order => order.id !== orderId);
      setOrders(updatedOrders);
      localStorage.setItem('ecommerce_orders', JSON.stringify(updatedOrders));
      
      addDeletionNotification(orderToDelete);
      await restoreProductQuantities(orderToDelete);
      showToast(`Order #${orderToDelete.orderNumber} deleted successfully. Products returned to stock.`, 'success');
    }
  };

  const addRejectionNotification = async (order, reason = '') => {
    // Get userEmail from order or find it from users list using userId
    let userEmail = order.userEmail;
    if (!userEmail && order.userId) {
      const users = database.getUsers();
      const user = users.find(u => u.id === order.userId);
      if (user) {
        userEmail = user.email;
      }
    }

    if (!userEmail) {
      return;
    }

    try {
      const { addNotificationToSupabase } = await import('../utils/supabase');
      await addNotificationToSupabase({
        userEmail: userEmail,
        type: 'rejection',
        message: `Your order #${order.orderNumber} has been rejected. Reason: ${reason}`,
        read: false
      });
    } catch (error) {
      console.error('Error adding rejection notification to Supabase:', error);
    }
  };

  const addDeletionNotification = async (order) => {
    // Get userEmail from order or find it from users list using userId
    let userEmail = order.userEmail;
    if (!userEmail && order.userId) {
      const users = database.getUsers();
      const user = users.find(u => u.id === order.userId);
      if (user) {
        userEmail = user.email;
      }
    }

    if (!userEmail) {
      return;
    }

    try {
      const { addNotificationToSupabase } = await import('../utils/supabase');
      await addNotificationToSupabase({
        userEmail: userEmail,
        type: 'deletion',
        message: `Your order #${order.orderNumber} has been deleted.`,
        read: false
      });
    } catch (error) {
      console.error('Error adding deletion notification to Supabase:', error);
    }
  };

  const clearDatabase = () => {
    if (window.confirm('Are you sure you want to clear all data? This action cannot be undone!')) {
      database.clearDatabase();
      setUsers([]);
      setOrders([]);
      showToast('All data has been cleared.', 'success');
    }
  };

  const addProtectedAdmins = () => {
    try {
      const protectedAdmins = [
        {
          email: 'yahiapro400@gmail.com',
          password: 'ylyr5767ykm34562',
          name: 'Yahia Pro'
        }
      ];

      const users = JSON.parse(localStorage.getItem('ecommerce_users') || '[]');
      const adminEmails = JSON.parse(localStorage.getItem('admin_emails') || '[]');
      let addedCount = 0;

      protectedAdmins.forEach(admin => {
        const existingUser = users.find(user => user.email === admin.email);
        if (!existingUser) {
          const newAdminUser = {
            id: Date.now() + Math.random(),
            email: admin.email,
            password: admin.password,
            name: admin.name,
            createdAt: new Date().toISOString(),
            orders: []
          };

          users.push(newAdminUser);
          addedCount++;
        } else {
          addedCount++;
        }
      });

      localStorage.setItem('ecommerce_users', JSON.stringify(users));
      localStorage.setItem('admin_emails', JSON.stringify(adminEmails));

      if (addedCount > 0) {
        showToast(`✅ Successfully added ${addedCount} protected admin(s)!`, 'success');
      } else {
        showToast('ℹ️ Protected admins already exist.', 'info');
      }
    } catch (error) {
      showToast('Error adding protected admins: ' + error.message, 'error');
    }
  };

  const fixLoginIssues = () => {
    if (window.confirm('🔧 Fix login issues?\n\nThis will:\n• Reset protected admin accounts\n• Ensure correct passwords\n• Fix any corrupted data\n\nContinue?')) {
      try {
        const success = database.resetProtectedAdmins();
        if (success) {
          showToast('✅ Login issues fixed successfully!\n\nYou can now login with:\n• yahiapro400@gmail.com / ylyr5767ykm34562', 'success');
          loadData();
        } else {
          showToast('❌ Failed to fix login issues. Please try again.', 'error');
        }
      } catch (error) {
        showToast('❌ Error fixing login issues: ' + error.message, 'error');
      }
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

  const formatShortDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isAuthorized) {
    return (
      <div className={`admin-container ${darkMode ? 'dark-mode' : ''}`}>
        <div className="unauthorized">
          <div className="unauthorized-content">
            <h1>Access Denied</h1>
            <p>You are not authorized to access the admin dashboard.</p>
            <p>Only authorized admin accounts can access this page.</p>
            <div className="unauthorized-info">
              <h3>Authorized Admin Accounts:</h3>
              <ul>
                <li>yahiapro400@gmail.com</li>
              </ul>
            </div>
            <div className="unauthorized-actions">
              <button 
                className="add-protected-admins-btn"
                onClick={() => {
                  addProtectedAdmins();
                  setTimeout(() => {
                    checkAuthorization();
                  }, 1000);
                }}
              >
                Add Protected Admins
              </button>
              <button 
                className="fix-login-btn"
                onClick={fixLoginIssues}
              >
                🔧 Fix Login Issues
              </button>
              <button 
                className="fix-access-btn"
                onClick={() => {
                  const currentUserEmail = localStorage.getItem('currentUserEmail');
                  if (currentUserEmail) {
                    const adminEmails = JSON.parse(localStorage.getItem('admin_emails') || '[]');
                    if (!adminEmails.includes(currentUserEmail)) {
                      adminEmails.push(currentUserEmail);
                      localStorage.setItem('admin_emails', JSON.stringify(adminEmails));
                    }
                    const users = database.getUsers();
                    const userExists = users.some(user => user.email === currentUserEmail);
                    if (!userExists) {
                      database.registerUser({
                        email: currentUserEmail,
                        password: 'admin123',
                        name: currentUserEmail.split('@')[0]
                      });
                    }
                    setTimeout(() => {
                      checkAuthorization();
                    }, 500);
                    showToast(`Successfully added ${currentUserEmail} as admin!`, 'success');
                  } else {
                    showToast('Please login first', 'warning');
                  }
                }}
              >
                Fix Access
              </button>
              <button 
                className="back-btn" 
                onClick={() => window.history.back()}
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`admin-container ${darkMode ? 'dark-mode' : ''}`}>
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`admin-container ${darkMode ? 'dark-mode' : ''}`}>
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <p>Welcome back, Admin! Manage your e-commerce platform.</p>
      </div>
      
      <div className="admin-tabs">
        <button 
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users Management
        </button>
        <button 
          className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          📊 Advanced Stats
        </button>

      </div>

      <div className="admin-content">
        {/* 🆕 Notifications Section */}
        {notifications.length > 0 && (
          <div className="notifications-section">
            <div className="section-header">
              <h2>🔔 Notifications ({notifications.filter(n => !n.read).length})</h2>
              <button className="clear-all-btn" onClick={async () => {
                try {
                  const notificationsToDelete = notifications.map(n => n.id);
                  for (const id of notificationsToDelete) {
                    await deleteNotificationFromSupabase(id);
                  }
                  setNotifications([]);
                } catch (error) {
                  console.error('Error clearing notifications:', error);
                }
              }}>
                Clear All
              </button>
            </div>
            <div className="notifications-list">
              {notifications.map(notification => (
                <div 
                  key={notification.id} 
                  className={`notification-item ${!notification.read ? 'unread' : ''}`}
                  onClick={() => markNotificationAsRead(notification.id)}
                >
                  <div className="notification-content">
                    <span className="notification-icon">
                      {notification.type === 'new_order' ? '📦' : '❌'}
                    </span>
                    <span className="notification-message">{notification.message}</span>
                    <span className="notification-time">
                      {new Date(notification.date).toLocaleString()}
                    </span>
                  </div>
                  <button 
                    className="delete-notification-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="stats-section">
            <div className="section-header">
              <h2>📊 Advanced Statistics</h2>
              <button className="refresh-btn" onClick={loadData}>
                Refresh Stats
              </button>
            </div>
            
            <div className="stats-grid">
              <div className="stats-card">
                <h3>📈 Revenue Analytics</h3>
                <div className="revenue-stats">
                  <div className="stat-item">
                    <span className="stat-label">Total Revenue</span>
                    <span className="stat-value">${orders.reduce((total, order) => total + order.total, 0).toFixed(2)}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Average Order Value</span>
                    <span className="stat-value">${orders.length > 0 ? (orders.reduce((total, order) => total + order.total, 0) / orders.length).toFixed(2) : '0.00'}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Orders This Month</span>
                    <span className="stat-value">{orders.filter(order => {
                      const orderDate = new Date(order.date);
                      const now = new Date();
                      return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
                    }).length}</span>
                  </div>
                </div>
              </div>

              <div className="stats-card">
                <h3>👥 User Analytics</h3>
                <div className="user-stats">
                  <div className="stat-item">
                    <span className="stat-label">Total Users</span>
                    <span className="stat-value">{users.length}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Active Users</span>
                    <span className="stat-value">{users.filter(user => user.orders && user.orders.length > 0).length}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">New Users This Month</span>
                    <span className="stat-value">{users.filter(user => {
                      const userDate = new Date(user.createdAt);
                      const now = new Date();
                      return userDate.getMonth() === now.getMonth() && userDate.getFullYear() === now.getFullYear();
                    }).length}</span>
                  </div>
                </div>
              </div>

              <div className="stats-card">
                <h3>🛒 Order Status</h3>
                <div className="order-status-stats">
                  <div className="stat-item">
                    <span className="stat-label">Pending Orders</span>
                    <span className="stat-value">{orders.filter(order => order.status === 'pending').length}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Approved Orders</span>
                    <span className="stat-value">{orders.filter(order => order.status === 'approved').length}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Rejected Orders</span>
                    <span className="stat-value">{orders.filter(order => order.status === 'rejected').length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="users-section">
            <div className="section-header">
              <h2>👥 Users List</h2>
              <button className="refresh-btn" onClick={loadData}>
                Refresh Data
              </button>
            </div>

            <div className="users-stats-card">
              <div className="stat-item">
                <span className="stat-label">Total Users</span>
                <span className="stat-value">{users.length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">With Orders</span>
                <span className="stat-value">{users.filter(u => u.orders?.length > 0).length}</span>
              </div>
            </div>

            <div className="users-list">
              {users.length === 0 ? (
                <p className="no-data">No users found</p>
              ) : (
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Joined Date</th>
                      <th>Orders Count</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => {
                      const adminEmails = JSON.parse(localStorage.getItem('admin_emails') || '[]');
                      const isAdmin = adminEmails.includes(user.email) || user.email === 'yahiapro400@gmail.com';
                      return (
                        <tr key={user.id}>
                          <td className="user-email">{user.email}</td>
                          <td>
                            <span className={`role-badge ${isAdmin ? 'admin' : 'user'}`}>
                              {isAdmin ? 'Admin' : 'User'}
                            </span>
                          </td>
                          <td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</td>
                          <td>{user.orders?.length || 0}</td>
                          <td>
                            <button
                              className="make-admin-btn"
                              onClick={() => handleMakeAdmin(user)}
                            >
                              Make Admin
                            </button>
                            <button
                              className="delete-user-btn"
                              onClick={() => handleDeleteUser(user)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="stats-section">
            <div className="section-header">
              <h2>📊 Advanced Stats</h2>
              <button className="refresh-btn" onClick={loadData}>
                Refresh Data
              </button>
            </div>

            <div className="analytics-grid">
              <div className="analytics-card">
                <h3>📅 Recent Activity</h3>
                <div className="recent-activity">
                  {orders.slice(0, 5).map(order => (
                    <div key={order.id} className="activity-item">
                      <span className="activity-icon">🛒</span>
                      <span className="activity-text">Order #{order.orderNumber} - ${order.total.toFixed(2)}</span>
                      <span className="activity-time">{formatShortDate(order.date)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="analytics-card">
                <h3>🎯 Quick Actions</h3>
                <div className="quick-actions">
                  <button className="quick-action-btn" onClick={() => setActiveTab('users')}>
                    👥 Manage Users
                  </button>
                  <button className="quick-action-btn" onClick={clearDatabase}>
                    🗑️ Clear Database
                  </button>
                  <button className="quick-action-btn" onClick={addProtectedAdmins}>
                    🛡️ Add Protected Admins
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}


      </div>
    </div>
  );
} 