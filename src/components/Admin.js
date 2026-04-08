import React, { useState, useEffect, useCallback } from 'react';
import '../styles/AdminNew.css';
import database from '../utils/database';
import UsersList from './UsersList';
import UsersSummary from './UsersSummary';
import { subscribeToUsers, deleteUserFromSupabase } from '../utils/supabase';

export default function Admin({ darkMode = true }) {
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(true);
  const [showAllUsers] = useState(true); // Changed to true to show all users by default
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [addAdminError] = useState('');

  const checkAuthorization = useCallback(() => {
    const savedAdminEmails = JSON.parse(localStorage.getItem('admin_emails') || '[]');
    const defaultAdminEmails = ['yahiapro400@gmail.com', 'yahiacool2009@gmail.com'];
    const adminEmails = savedAdminEmails.length > 0 ? savedAdminEmails : defaultAdminEmails;
    
    const currentUserEmail = localStorage.getItem('currentUserEmail');
    
    if (currentUserEmail && adminEmails.includes(currentUserEmail)) {
      const allUsers = database.getUsers();
      const userExists = allUsers.some(user => user.email === currentUserEmail);
      
      if (userExists) {
        setIsAuthorized(true);
        console.log('Authorization granted');
      } else {
        addProtectedAdmins();
        setTimeout(() => {
          setIsAuthorized(true);
          console.log('Authorization granted after adding user');
        }, 500);
      }
    } else {
      console.log('User not in admin list, authorization denied');
      setIsAuthorized(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    
    // Get users from Supabase (with localStorage fallback)
    let allUsers = [];
    try {
      allUsers = await database.getUsersAsync();
      console.log('Users loaded from Supabase:', allUsers.length);
    } catch (error) {
      console.log('Using localStorage users:', error.message);
      allUsers = database.getUsers();
    }
    
    const allOrders = database.getOrders();
    
    const protectedAdmins = [
      {
        email: 'yahiapro400@gmail.com',
        password: 'yahia2024',
        name: 'Yahia Pro'
      },
      {
        email: 'yahiacool2009@gmail.com',
        password: 'yahia2009',
        name: 'Yahia Cool'
      }
    ];

    protectedAdmins.forEach(admin => {
      const existingUser = allUsers.find(user => user.email === admin.email);
      if (!existingUser) {
        try {
          database.registerUser({
            email: admin.email,
            password: admin.password,
            name: admin.name
          });
          console.log(`Added protected admin: ${admin.email}`);
        } catch (error) {
          console.log(`Protected admin ${admin.email} already exists or error occurred:`, error.message);
        }
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
    const defaultAdminEmails = ['yahiapro400@gmail.com', 'yahiacool2009@gmail.com'];
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
          password: 'yahia2024',
          name: 'Yahia Pro'
        },
        {
          email: 'yahiacool2009@gmail.com',
          password: 'yahia2009',
          name: 'Yahia Cool'
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
            console.log(`Initialized protected admin: ${admin.email}`);
          } catch (error) {
            console.log(`Protected admin ${admin.email} already exists:`, error.message);
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
      console.log('Users updated from Supabase:', supabaseUsers.length);
      setUsers(supabaseUsers);
    });
    
    return () => unsubscribe();
  }, [isAuthorized]);

  const deleteUser = async (userId) => {
    const userToDelete = users.find(user => user.id === userId);
    
    if (!userToDelete) {
      alert('User not found!');
      return;
    }

    const protectedAdmins = ['yahiapro400@gmail.com', 'yahiacool2009@gmail.com'];
    const currentUserEmail = localStorage.getItem('currentUserEmail');
    
    if (protectedAdmins.includes(userToDelete.email)) {
      alert('❌ Cannot delete protected admin accounts!\n\nOnly yahiapro400@gmail.com and yahiacool2009@gmail.com can delete protected admins.');
      return;
    }

    const adminEmails = JSON.parse(localStorage.getItem('admin_emails') || '[]');
    
    if (adminEmails.includes(userToDelete.email) && !protectedAdmins.includes(currentUserEmail)) {
      alert('❌ Only protected admins can delete other admin accounts!\n\nContact yahiapro400@gmail.com or yahiacool2009@gmail.com to delete admin accounts.');
      return;
    }

    if (window.confirm(`Are you sure you want to delete user: ${userToDelete.email}?`)) {
      try {
        // Delete from Supabase first
        await deleteUserFromSupabase(userId);
        console.log('✅ Deleted from Supabase');
      } catch (error) {
        console.warn('⚠️ Could not delete from Supabase:', error.message);
      }
      
      // Delete from localStorage
      const success = database.deleteUser(userId);
      if (success) {
        alert(`✅ User ${userToDelete.email} has been deleted successfully!`);
        loadData();
      } else {
        alert('❌ Failed to delete user. Please try again.');
      }
    }
  };

  const handleEditUser = (user) => {
    // التحقق من صلاحيات التعديل
    const protectedAdmins = ['yahiapro400@gmail.com', 'yahiacool2009@gmail.com'];
    const currentUserEmail = localStorage.getItem('currentUserEmail');
    
    if (protectedAdmins.includes(user.email) && !protectedAdmins.includes(currentUserEmail)) {
      alert('❌ Only protected admins can edit admin accounts!\n\nContact yahiapro400@gmail.com or yahiacool2009@gmail.com for changes.');
      return;
    }

    // هنا يمكنك إضافة منطق تعديل المستخدم
    // مثل فتح نافذة منبثقة للتعديل
  };

  const handleDeleteUser = async (user) => {
    const userId = user.id || users.find(u => u.email === user.email)?.id;
    if (userId) {
      await deleteUser(userId);
    } else {
      alert('Could not find user ID');
    }
  };

  const rejectOrder = (orderId) => {
    const orderToReject = orders.find(order => order.id === orderId);
    if (!orderToReject) return;

    const updatedOrders = orders.map(order =>
      order.id === orderId ? { ...order, status: 'rejected' } : order
    );
    setOrders(updatedOrders);
    localStorage.setItem('ecommerce_orders', JSON.stringify(updatedOrders));
    
    addRejectionNotification(orderToReject);
    alert(`Order #${orderToReject.orderNumber} has been rejected.`);
  };

  const approveOrder = (orderId) => {
    const updatedOrders = orders.map(order =>
      order.id === orderId ? { ...order, status: 'approved' } : order
    );
    setOrders(updatedOrders);
    localStorage.setItem('ecommerce_orders', JSON.stringify(updatedOrders));
    alert('Order has been approved.');
  };

  const deleteOrder = (orderId) => {
    const orderToDelete = orders.find(order => order.id === orderId);
    if (!orderToDelete) return;

    if (window.confirm(`Are you sure you want to delete order #${orderToDelete.orderNumber}?`)) {
      const updatedOrders = orders.filter(order => order.id !== orderId);
      setOrders(updatedOrders);
      localStorage.setItem('ecommerce_orders', JSON.stringify(updatedOrders));
      
      addDeletionNotification(orderToDelete);
      restoreProductQuantities(orderToDelete);
      alert(`Order #${orderToDelete.orderNumber} has been deleted.`);
    }
  };

  const addRejectionNotification = (order) => {
    const notifications = JSON.parse(localStorage.getItem('order_notifications') || '[]');
    const notification = {
      id: Date.now(),
      type: 'rejection',
      message: `Your order #${order.orderNumber} has been rejected.`,
      date: new Date().toISOString(),
      userEmail: order.userEmail,
      read: false
    };
    notifications.push(notification);
    localStorage.setItem('order_notifications', JSON.stringify(notifications));
  };

  const addDeletionNotification = (order) => {
    const notifications = JSON.parse(localStorage.getItem('order_notifications') || '[]');
    const notification = {
      id: Date.now(),
      type: 'deletion',
      message: `Your order #${order.orderNumber} has been deleted.`,
      date: new Date().toISOString(),
      userEmail: order.userEmail,
      read: false
    };
    notifications.push(notification);
    localStorage.setItem('order_notifications', JSON.stringify(notifications));
  };

  const restoreProductQuantities = (order) => {
    try {
      const existingProducts = JSON.parse(localStorage.getItem('ecommerce_products') || '[]');
      
      order.items.forEach(item => {
        const productIndex = existingProducts.findIndex(p => p.id === item.id);
        if (productIndex !== -1) {
          existingProducts[productIndex].quantity += item.quantity;
        }
      });
      
      localStorage.setItem('ecommerce_products', JSON.stringify(existingProducts));
      console.log('Product quantities restored after order deletion');
    } catch (error) {
      console.error('Error restoring product quantities:', error);
    }
  };

  const clearDatabase = () => {
    if (window.confirm('Are you sure you want to clear all data? This action cannot be undone!')) {
      database.clearDatabase();
      setUsers([]);
      setOrders([]);
      alert('All data has been cleared.');
    }
  };

  const addProtectedAdmins = () => {
    try {
      const protectedAdmins = [
        {
          email: 'yahiapro400@gmail.com',
          password: 'yahia2024',
          name: 'Yahia Pro'
        },
        {
          email: 'yahiacool2009@gmail.com',
          password: 'yahia2009',
          name: 'Yahia Cool'
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

          if (!adminEmails.includes(admin.email)) {
            adminEmails.push(admin.email);
          }
        } else {
          if (!adminEmails.includes(admin.email)) {
            adminEmails.push(admin.email);
            addedCount++;
          }
        }
      });

      localStorage.setItem('ecommerce_users', JSON.stringify(users));
      localStorage.setItem('admin_emails', JSON.stringify(adminEmails));

      if (addedCount > 0) {
        alert(`✅ Added ${addedCount} protected admin(s) successfully!`);
      } else {
        alert('ℹ️ Protected admins already exist.');
      }
    } catch (error) {
      alert('Error adding protected admins: ' + error.message);
    }
  };

  const fixLoginIssues = () => {
    if (window.confirm('🔧 Fix login issues?\n\nThis will:\n• Reset protected admin accounts\n• Ensure correct passwords\n• Fix any corrupted data\n\nContinue?')) {
      try {
        const success = database.resetProtectedAdmins();
        if (success) {
          alert('✅ Login issues fixed successfully!\n\nYou can now login with:\n• yahiapro400@gmail.com / yahia2024\n• yahiacool2009@gmail.com / yahia2009');
          loadData();
        } else {
          alert('❌ Failed to fix login issues. Please try again.');
        }
      } catch (error) {
        alert('❌ Error fixing login issues: ' + error.message);
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
                <li>yahiacool2009@gmail.com</li>
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
                    alert(`تم إضافة ${currentUserEmail} كمدير بنجاح!`);
                  } else {
                    alert('يرجى تسجيل الدخول أولاً');
                  }
                }}
              >
                إصلاح الوصول
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
        <div className="admin-stats">
          <div className="stat-card">
            <span className="stat-icon">👤</span>
            <h3>{users.length}</h3>
            <p>Total Users</p>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🛒</span>
            <h3>{orders.length}</h3>
            <p>Total Orders</p>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🛡️</span>
            <h3>{users.filter(u => ['yahiapro400@gmail.com', 'yahiacool2009@gmail.com'].includes(u.email)).length}</h3>
            <p>Protected Admins</p>
          </div>
        </div>
      </div>

      <div className="admin-tabs">
        <button 
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users Management
        </button>
        <button 
          className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          Orders Management
        </button>
        <button 
          className={`tab-btn ${activeTab === 'manage-admins' ? 'active' : ''}`}
          onClick={() => setActiveTab('manage-admins')}
        >
          Manage Admins
        </button>
        <button 
          className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          📊 Advanced Stats
        </button>
        <button 
          className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          📈 Analytics
        </button>

      </div>

      <div className="admin-content">
        {activeTab === 'users' && (
          <div className="users-section">
            <UsersSummary 
              users={users}
              adminEmails={JSON.parse(localStorage.getItem('admin_emails') || '[]')}
            />
            <UsersList 
              users={users}
              onEditUser={handleEditUser}
              onDeleteUser={handleDeleteUser}
              adminEmails={JSON.parse(localStorage.getItem('admin_emails') || '[]')}
            />
            
            {users.length === 0 ? (
              <div className="no-data">
                <p>No users found</p>
              </div>
            ) : (
              <div className="users-list">
                <div className="users-summary">
                  <h3>📊 Users Summary</h3>
                  <p>Total Users: <strong>{users.length}</strong></p>
                  <p>Protected Admins: <strong>{users.filter(u => ['yahiapro400@gmail.com', 'yahiacool2009@gmail.com'].includes(u.email)).length}</strong></p>
                  <p>Regular Users: <strong>{users.filter(u => !['yahiapro400@gmail.com', 'yahiacool2009@gmail.com'].includes(u.email)).length}</strong></p>
                </div>
                
                {users.map((user, index) => {
                  const isProtected = ['yahiapro400@gmail.com', 'yahiacool2009@gmail.com'].includes(user.email);
                  const isAdmin = JSON.parse(localStorage.getItem('admin_emails') || '[]').includes(user.email);
                  return (
                    <div key={user.id} className={`user-card ${isProtected ? 'protected' : ''} ${isAdmin ? 'admin' : 'regular'}`}>
                      <div className="user-info">
                        <div className="user-header">
                          <h3>
                            #{index + 1} - {user.name}
                            {isProtected && <span className="protected-badge">🛡️ Protected Admin</span>}
                            {isAdmin && !isProtected && <span className="admin-badge">👑 Admin</span>}
                            {!isAdmin && <span className="user-badge">👤 User</span>}
                          </h3>
                        </div>
                        <p className="user-email"><strong>Email:</strong> {user.email}</p>
                        <p className="user-date"><strong>Registration Date:</strong> {formatDate(user.createdAt)}</p>
                        <p className="user-orders"><strong>Number of Orders:</strong> {user.orders?.length || 0}</p>
                        <p className="user-id"><strong>User ID:</strong> {user.id}</p>
                      </div>
                      <div className="user-actions">
                        {!isProtected && (
                          <button 
                            className="delete-btn"
                            onClick={() => deleteUser(user.id)}
                          >
                            Delete
                          </button>
                        )}
                        {isProtected && (
                          <span className="protected-message">Protected Admin - Cannot Delete</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="orders-section">
            <div className="section-header">
              <h2>Orders Management</h2>
              <button className="refresh-btn" onClick={loadData}>
                Refresh Data
              </button>
            </div>
            
            {orders.length === 0 ? (
              <div className="no-data">
                <p>No orders found</p>
              </div>
            ) : (
              <div className="orders-list">
                {orders.map((order) => (
                  <div key={order.id} className="order-card">
                    <div className="order-info">
                      <h3>Order #{order.orderNumber}</h3>
                      <p className="order-email font-weight-bold">{order.userEmail}</p>
                      <p className="order-date font-weight-bold">Order Date: {formatDate(order.date)}</p>
                      <p className="order-status font-weight-bold">Status: {order.status}</p>
                      <p className="order-total font-weight-bold">Total: ${order.total.toFixed(2)}</p>
                      <p className="order-items font-weight-bold">Number of Items: {order.items.length}</p>
                      {order.shipping && Object.keys(order.shipping).length > 0 && (
                        <div className="shipping-info">
                          <h4>Shipping Details:</h4>
                          <p><strong>Name:</strong> {order.shipping.fullName}</p>
                          <p><strong>Phone:</strong> {order.shipping.phone}</p>
                          <p><strong>Address:</strong> {order.shipping.street}, {order.shipping.building}</p>
                          <p><strong>Address Inside Country:</strong> {order.shipping.addressInCountry}</p>
                          <p><strong>City:</strong> {order.shipping.city}, {order.shipping.governorate}</p>
                          {order.shipping.additionalInfo && (
                            <p><strong>Notes:</strong> {order.shipping.additionalInfo}</p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="order-items">
                      {order.items.map((item, index) => (
                        <div key={index} className="order-item">
                          <div className="item-image">
                            <img src={item.image} alt={item.name} />
                          </div>
                          <div className="item-details">
                            <h4>{item.name}</h4>
                            <p className="item-price">${item.price}</p>
                            <p className="item-quantity">Quantity Sold: {item.quantity}</p>
                            <p className="item-total">Total: ${(item.price * item.quantity).toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="order-actions">
                      {order.status !== 'rejected' && order.status !== 'approved' && (
                        <button 
                          className="reject-btn"
                          onClick={() => rejectOrder(order.id)}
                        >
                          Reject Order
                        </button>
                      )}
                      {order.status === 'rejected' && (
                        <div className="order-actions">
                          <span className="rejected-status">Rejected</span>
                          <button 
                            className="approve-btn"
                            onClick={() => approveOrder(order.id)}
                          >
                            Re-activate
                          </button>
                        </div>
                      )}
                      {order.status === 'approved' && (
                        <span className="approved-status">Approved</span>
                      )}
                      <button 
                        className="delete-order-btn"
                        onClick={() => deleteOrder(order.id)}
                      >
                        Delete Order
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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

        {activeTab === 'manage-admins' && (
          <div className="manage-admins-section">
            <div className="section-header">
              <h2>👥 Manage Admins</h2>
              <button className="refresh-btn" onClick={loadData}>
                Refresh Data
              </button>
            </div>
            
            <div className="add-admin-form">
              <h3>Add New Admin</h3>
              <div className="form-group">
                <label htmlFor="adminEmail">Admin Email:</label>
                <input
                  type="email"
                  id="adminEmail"
                  className="admin-input"
                  placeholder="Enter admin email"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({...newAdmin, email: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label htmlFor="adminPassword">Password:</label>
                <input
                  type="password"
                  id="adminPassword"
                  className="admin-input"
                  placeholder="Enter password"
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin({...newAdmin, password: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label htmlFor="adminName">Name:</label>
                <input
                  type="text"
                  id="adminName"
                  className="admin-input"
                  placeholder="Enter admin name"
                  value={newAdmin.name}
                  onChange={(e) => setNewAdmin({...newAdmin, name: e.target.value})}
                />
              </div>
              <button className="add-admin-btn" onClick={() => {
                if (newAdmin.email && newAdmin.password && newAdmin.name) {
                  try {
                    database.registerUser(newAdmin);
                    const adminEmails = JSON.parse(localStorage.getItem('admin_emails') || '[]');
                    if (!adminEmails.includes(newAdmin.email)) {
                      adminEmails.push(newAdmin.email);
                      localStorage.setItem('admin_emails', JSON.stringify(adminEmails));
                    }
                    setNewAdmin({ email: '', password: '', name: '' });
                    alert('Admin added successfully!');
                    loadData();
                  } catch (error) {
                    alert('Error adding admin: ' + error.message);
                  }
                } else {
                  alert('Please fill all fields');
                }
              }}>
                Add Admin
              </button>
              {addAdminError && <div className="admin-message error">{addAdminError}</div>}
            </div>

            <div className="current-admins">
              <h3>Current Admins</h3>
              <div className="admins-list">
                {(() => {
                  const adminEmails = JSON.parse(localStorage.getItem('admin_emails') || '[]');
                  const defaultAdmins = ['yahiapro400@gmail.com', 'yahiacool2009@gmail.com'];
                  const allAdmins = adminEmails.length > 0 ? adminEmails : defaultAdmins;
                  
                  return allAdmins.map((email, index) => (
                    <div key={index} className="admin-item">
                      <span className="admin-email">{email}</span>
                      <span className="admin-status">Active</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="analytics-section">
            <div className="section-header">
              <h2>📈 Real-time Analytics</h2>
              <button className="refresh-btn" onClick={loadData}>
                Update Analytics
              </button>
            </div>
            
            <div className="analytics-grid">
              <div className="analytics-card">
                <h3>🔥 Top Performing Products</h3>
                <div className="top-products">
                  {(() => {
                    const productStats = {};
                    orders.forEach(order => {
                      order.items.forEach(item => {
                        if (!productStats[item.name]) {
                          productStats[item.name] = { quantity: 0, revenue: 0 };
                        }
                        productStats[item.name].quantity += item.quantity;
                        productStats[item.name].revenue += item.price * item.quantity;
                      });
                    });
                    
                    const topProducts = Object.entries(productStats)
                      .sort(([,a], [,b]) => b.revenue - a.revenue)
                      .slice(0, 5);
                    
                    return topProducts.map(([name, stats], index) => (
                      <div key={name} className="product-stat">
                        <span className="rank">#{index + 1}</span>
                        <span className="name">{name}</span>
                        <span className="quantity">Sold: {stats.quantity}</span>
                        <span className="revenue">${stats.revenue.toFixed(2)}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>

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
                  <button className="quick-action-btn" onClick={() => setActiveTab('orders')}>
                    📦 View Orders
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