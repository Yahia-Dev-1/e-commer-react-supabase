// Enhanced database using the new storage system
// import { get, set, remove, initializeStorage, getStorageUsage, getStorageHealth } from './enhancedStorage.js'
import { addUserToSupabase, getUsersFromSupabase, deleteUserFromSupabase } from './supabase';

class Database {
  constructor() {
    this.usersKey = 'ecommerce_users';
    this.ordersKey = 'ecommerce_orders';
    this.lastSaveKey = 'ecommerce_lastSave';
    this.protectedAdmins = ['yahiapro400@gmail.com', 'yahiacool2009@gmail.com'];
    
    // Initialize enhanced storage - temporarily disabled
    // initializeStorage();
    this.initDatabase();
    this.setupAutoSave();
  }

  // Initialize database with default data
  initDatabase() {
    try {
      // Initialize users if not exists
      if (!localStorage.getItem(this.usersKey)) {
        const defaultUsers = [
          {
            id: 1,
            email: 'yahiapro400@gmail.com',
            password: 'ylyr5767ykm34562',
            name: 'Yahia Pro',
            createdAt: new Date().toISOString(),
            orders: [],
            isProtected: true
          },
          {
            id: 2,
            email: 'yahiacool2009@gmail.com',
            password: 'yahia2009',
            name: 'Yahia Cool',
            createdAt: new Date().toISOString(),
            orders: [],
            isProtected: true
          }
        ];
        localStorage.setItem(this.usersKey, JSON.stringify(defaultUsers));
        
        // Add to admin list
        const adminEmails = ['yahiapro400@gmail.com', 'yahiacool2009@gmail.com'];
        localStorage.setItem('admin_emails', JSON.stringify(adminEmails));
      } else {
        // Ensure protected admins exist even if users already exist
        this.ensureProtectedAdminsExist();
      }

      // Initialize orders if not exists
      if (!localStorage.getItem(this.ordersKey)) {
        localStorage.setItem(this.ordersKey, JSON.stringify([]));
      }

      this.saveLastSaveTime();
    } catch (error) {
      console.error('Error initializing database:', error);
    }
  }

  // Ensure protected admins exist
  ensureProtectedAdminsExist() {
    try {
      let users = this.getUsers();
      
      // Ensure users is an array
      if (!Array.isArray(users)) {
        console.warn('Users is not an array, resetting');
        users = [];
      }
      
      const adminEmails = JSON.parse(localStorage.getItem('admin_emails') || '[]');
      let updated = false;

      const protectedAdmins = [
        {
          id: 1,
          email: 'yahiapro400@gmail.com',
          password: 'yahia2024',
          name: 'Yahia Pro',
          isProtected: true
        },
        {
          id: 2,
          email: 'yahiacool2009@gmail.com',
          password: 'yahia2009',
          name: 'Yahia Cool',
          isProtected: true
        }
      ];

      protectedAdmins.forEach(admin => {
        const existingUser = users.find(user => user.email === admin.email);
        if (!existingUser) {
          // Add missing protected admin
          const newAdmin = {
            ...admin,
            createdAt: new Date().toISOString(),
            orders: []
          };
          users.push(newAdmin);
          updated = true;
          console.log(`Added missing protected admin: ${admin.email}`);
        } else if (!existingUser.isProtected) {
          // Update existing user to be protected
          existingUser.isProtected = true;
          updated = true;
          console.log(`Updated user to protected admin: ${admin.email}`);
        }

        // Ensure admin email is in admin list
        if (!adminEmails.includes(admin.email)) {
          adminEmails.push(admin.email);
          updated = true;
        }
      });

      if (updated) {
        localStorage.setItem(this.usersKey, JSON.stringify(users));
        localStorage.setItem('admin_emails', JSON.stringify(adminEmails));
        console.log('Protected admins ensured successfully');
      }
    } catch (error) {
      console.error('Error ensuring protected admins:', error);
    }
  }

  // Setup auto save functionality
  setupAutoSave() {
    // Save data when page is about to unload
    window.addEventListener('beforeunload', () => {
      this.saveLastSaveTime();
      this.saveAllData();
    });

    // Save data when user navigates away
    window.addEventListener('pagehide', () => {
      this.saveLastSaveTime();
      this.saveAllData();
    });

    // Save data when user switches tabs
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.saveLastSaveTime();
        this.saveAllData();
      }
    });

    // Save data periodically (every 30 seconds)
    setInterval(() => {
      this.saveLastSaveTime();
      this.saveAllData();
    }, 30000);
  }

  // Save last save time
  saveLastSaveTime() {
    localStorage.setItem(this.lastSaveKey, new Date().toISOString());
  }

  // Save all data to localStorage
  saveAllData() {
    try {
      // Force save current data
      const users = this.getUsers();
      const orders = this.getOrders();
      
      localStorage.setItem(this.usersKey, JSON.stringify(users));
      localStorage.setItem(this.ordersKey, JSON.stringify(orders));
      this.saveLastSaveTime();
      
      console.log('All data saved successfully');
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  // Get all users - Synchronous (from localStorage only)
  getUsers() {
    try {
      const users = localStorage.getItem(this.usersKey);
      if (!users) return [];
      
      const parsed = JSON.parse(users);
      
      // Ensure we always return an array
      if (!Array.isArray(parsed)) {
        console.warn('Users data corrupted, resetting to empty array');
        localStorage.removeItem(this.usersKey);
        return [];
      }
      
      return parsed;
    } catch (error) {
      console.error('Error reading user data:', error);
      // Clear corrupted data
      localStorage.removeItem(this.usersKey);
      return [];
    }
  }

  // Get all users from Supabase (async)
  async getUsersAsync() {
    try {
      const supabaseUsers = await getUsersFromSupabase();
      if (Array.isArray(supabaseUsers) && supabaseUsers.length > 0) {
        // Sync to localStorage for offline
        localStorage.setItem(this.usersKey, JSON.stringify(supabaseUsers));
        return supabaseUsers;
      }
    } catch (error) {
      console.log('Supabase users fetch failed:', error.message);
    }
    
    // Fallback to localStorage
    return this.getUsers();
  }

  // Get all orders
  getOrders() {
    try {
      const orders = localStorage.getItem(this.ordersKey);
      return orders ? JSON.parse(orders) : [];
    } catch (error) {
      console.error('Error reading orders:', error);
      return [];
    }
  }

  // Check if user exists by email
  userExists(email) {
    const users = this.getUsers();
    return users.some(user => user.email.toLowerCase() === email.toLowerCase());
  }

  // Validate login credentials
  validateLogin(email, password) {
    const users = this.getUsers();
    const user = users.find(user => 
      user.email.toLowerCase() === email.toLowerCase() && 
      user.password === password
    );
    return user || null;
  }

  // Register user with protection
  registerUser(userData) {
    try {
      const users = this.getUsers();
      
      // Check if user already exists
      if (users.some(user => user.email === userData.email)) {
        throw new Error('User already exists');
      }

      // Check if trying to register with protected admin email (but allow if it's the correct password)
      if (this.isProtectedAdmin(userData.email)) {
        // Check if this is a protected admin trying to register with correct password
        const protectedAdminPasswords = {
          'yahiapro400@gmail.com': 'ylyr5767ykm34562',
          'yahiacool2009@gmail.com': 'yahia2009'
        };
        
        if (protectedAdminPasswords[userData.email] === userData.password) {
          // This is a protected admin with correct password, allow registration
          const newUser = {
            id: Date.now() + Math.random(),
            email: userData.email,
            password: userData.password,
            name: userData.name,
            createdAt: new Date().toISOString(),
            orders: [],
            isProtected: true
          };

          users.push(newUser);
          localStorage.setItem(this.usersKey, JSON.stringify(users));
          this.saveLastSaveTime();
          
          // Add to admin emails if not already there
          const adminEmails = JSON.parse(localStorage.getItem('admin_emails') || '[]');
          if (!adminEmails.includes(userData.email)) {
            adminEmails.push(userData.email);
            localStorage.setItem('admin_emails', JSON.stringify(adminEmails));
          }
          
          return newUser;
        } else {
          throw new Error('Cannot register with protected admin email');
        }
      }

      const newUser = {
        id: Date.now() + Math.random(),
        email: userData.email,
        password: userData.password,
        name: userData.name,
        createdAt: new Date().toISOString(),
        orders: [],
        isProtected: false
      };

      users.push(newUser);
      localStorage.setItem(this.usersKey, JSON.stringify(users));
      this.saveLastSaveTime();
      
      return newUser;
    } catch (error) {
      console.error('Error registering user:', error);
      throw error;
    }
  }

  // Save new order
  saveOrder(orderData) {
    const orders = this.getOrders();
    const newOrder = {
      ...orderData,
      id: Date.now(),
      createdAt: new Date().toISOString()
    };

    orders.push(newOrder);
    
    // 🆕 Handle quota exceeded error
    try {
      localStorage.setItem(this.ordersKey, JSON.stringify(orders.slice(-10)))
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.warn('⚠️ LocalStorage quota exceeded, saving minimal data only')
        // Save only the last 5 orders with minimal data
        const minimalOrders = orders.slice(-5).map(order => ({
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          total: order.total,
          date: order.date,
          userEmail: order.userEmail
        }))
        localStorage.setItem(this.ordersKey, JSON.stringify(minimalOrders))
      } else {
        throw error
      }
    }

    // Add order to user's order list
    if (orderData.userId) {
      const users = this.getUsers();
      const userIndex = users.findIndex(user => user.id === orderData.userId);
      if (userIndex !== -1) {
        users[userIndex].orders.push(newOrder.id);
        localStorage.setItem(this.usersKey, JSON.stringify(users));
      }
    }

    this.saveLastSaveTime();
    this.saveAllData(); // Force save all data

    return newOrder;
  }

  // Get orders for specific user
  getUserOrders(userId) {
    const orders = this.getOrders();
    return orders.filter(order => order.userId === userId);
  }

  // Update user with protection
  updateUser(userId, updates) {
    try {
      const users = this.getUsers();
      const userIndex = users.findIndex(user => user.id === userId);
      
      if (userIndex === -1) {
        console.error('User not found for update:', userId);
        return null;
      }

      let userToUpdate = users[userIndex];
      
      // Check if trying to modify a protected admin
      if (this.isProtectedAdmin(userToUpdate.email) && !this.canModifyProtectedAdmin()) {
        console.error('Unauthorized attempt to modify protected admin:', userToUpdate.email);
        alert('❌ Cannot modify protected admin accounts!\n\nOnly yahiapro400@gmail.com and yahiacool2009@gmail.com can modify protected admins.');
        return null;
      }

      // Prevent modification of protected admin properties
      if (this.isProtectedAdmin(userToUpdate.email)) {
        const allowedUpdates = { ...updates };
        delete allowedUpdates.email; // Prevent email change
        delete allowedUpdates.isProtected; // Prevent protection removal
        updates = allowedUpdates;
      }

      users[userIndex] = { ...userToUpdate, ...updates };
      localStorage.setItem(this.usersKey, JSON.stringify(users));
      this.saveLastSaveTime();
      
      return users[userIndex];
    } catch (error) {
      console.error('Error updating user:', error);
      return null;
    }
  }

  // Delete user with enhanced protection
  deleteUser(userId) {
    const users = this.getUsers();
    const userToDelete = users.find(user => user.id === userId);
    
    if (!userToDelete) {
      console.error('User not found for deletion:', userId);
      return false;
    }

    // Enhanced protection for protected admins
    if (this.isProtectedAdmin(userToDelete.email)) {
      console.error('Attempted to delete protected admin:', userToDelete.email);
      alert('❌ Cannot delete protected admin accounts!\n\nOnly yahiapro400@gmail.com and yahiacool2009@gmail.com can delete protected admins.');
      return false;
    }

    // Check if current user is authorized to delete admins
    const adminEmails = JSON.parse(localStorage.getItem('admin_emails') || '[]');
    
    if (adminEmails.includes(userToDelete.email) && !this.canModifyProtectedAdmin()) {
      console.error('Unauthorized attempt to delete admin:', userToDelete.email);
      alert('❌ Only protected admins can delete other admin accounts!\n\nContact yahiapro400@gmail.com or yahiacool2009@gmail.com to delete admin accounts.');
      return false;
    }

    const filteredUsers = users.filter(user => user.id !== userId);
    localStorage.setItem(this.usersKey, JSON.stringify(filteredUsers));
    
    // Remove from admin list if it's an admin
    if (adminEmails.includes(userToDelete.email)) {
      const updatedAdminEmails = adminEmails.filter(email => email !== userToDelete.email);
      localStorage.setItem('admin_emails', JSON.stringify(updatedAdminEmails));
    }
    
    this.saveLastSaveTime();
    return true;
  }

  // Get last save time
  getLastSaveTime() {
    try {
      const lastSave = localStorage.getItem(this.lastSaveKey);
      return lastSave ? new Date(lastSave) : null;
    } catch (error) {
      console.error('Error reading last save time:', error);
      return null;
    }
  }

  // Export all data
  exportData() {
    try {
      const data = {
        users: this.getUsers(),
        orders: this.getOrders(),
        lastSave: this.getLastSaveTime(),
        exportDate: new Date().toISOString()
      };
      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Error exporting data:', error);
      return null;
    }
  }

  // Import data
  importData(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      if (data.users) {
        localStorage.setItem(this.usersKey, JSON.stringify(data.users));
      }
      if (data.orders) {
        localStorage.setItem(this.ordersKey, JSON.stringify(data.orders));
      }
      if (data.lastSave) {
        localStorage.setItem(this.lastSaveKey, data.lastSave);
      }
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }

  // Clear all data (for development only)
  clearDatabase() {
    localStorage.removeItem(this.usersKey);
    localStorage.removeItem(this.ordersKey);
    localStorage.removeItem(this.lastSaveKey);
    this.initDatabase();
  }

  // Reset protected admins (for fixing login issues)
  resetProtectedAdmins() {
    try {
      const users = this.getUsers();
      const adminEmails = JSON.parse(localStorage.getItem('admin_emails') || '[]');
      
      // Remove existing protected admins
      const filteredUsers = users.filter(user => 
        user.email !== 'yahiapro400@gmail.com' && 
        user.email !== 'yahiacool2009@gmail.com'
      );
      
      // Add fresh protected admins
      const protectedAdmins = [
        {
          id: Date.now() + 1,
          email: 'yahiapro400@gmail.com',
          password: 'yahia2024',
          name: 'Yahia Pro',
          createdAt: new Date().toISOString(),
          orders: [],
          isProtected: true
        },
        {
          id: Date.now() + 2,
          email: 'yahiacool2009@gmail.com',
          password: 'yahia2009',
          name: 'Yahia Cool',
          createdAt: new Date().toISOString(),
          orders: [],
          isProtected: true
        }
      ];
      
      // Add protected admins to users
      protectedAdmins.forEach(admin => {
        filteredUsers.push(admin);
      });
      
      // Update admin emails list
      const updatedAdminEmails = adminEmails.filter(email => 
        email !== 'yahiapro400@gmail.com' && 
        email !== 'yahiacool2009@gmail.com'
      );
      updatedAdminEmails.push('yahiapro400@gmail.com', 'yahiacool2009@gmail.com');
      
      // Save to localStorage
      localStorage.setItem(this.usersKey, JSON.stringify(filteredUsers));
      localStorage.setItem('admin_emails', JSON.stringify(updatedAdminEmails));
      
      console.log('Protected admins reset successfully');
      return true;
    } catch (error) {
      console.error('Error resetting protected admins:', error);
      return false;
    }
  }

  // Check if user is protected admin
  isProtectedAdmin(email) {
    return this.protectedAdmins.includes(email);
  }

  // Check if current user can modify protected admin
  canModifyProtectedAdmin() {
    const currentUserEmail = localStorage.getItem('currentUserEmail');
    return this.isProtectedAdmin(currentUserEmail);
  }

  // Get storage statistics
  getStorageStats() {
    try {
      let totalSize = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalSize += localStorage[key].length + key.length;
        }
      }
      return {
        used: totalSize,
        total: 10 * 1024 * 1024, // 10MB
        percentage: ((totalSize / (10 * 1024 * 1024)) * 100).toFixed(2),
        items: Object.keys(localStorage).length
      };
    } catch (error) {
      console.error('Error calculating storage stats:', error);
      return { used: 0, total: 10 * 1024 * 1024, percentage: 0, items: 0 };
    }
  }

  // Get storage health status
  getStorageHealth() {
    const stats = this.getStorageStats();
    const percentage = parseFloat(stats.percentage);
    
    if (percentage > 90) {
      return {
        status: 'critical',
        score: 10,
        issues: ['Storage almost full'],
        recommendations: ['Consider removing old data']
      };
    } else if (percentage > 70) {
      return {
        status: 'warning',
        score: 60,
        issues: ['Storage usage high'],
        recommendations: ['Monitor storage usage']
      };
    } else {
      return {
        status: 'healthy',
        score: 100,
        issues: [],
        recommendations: []
      };
    }
  }
}

// إنشاء نسخة واحدة من قاعدة البيانات
const database = new Database();

export default database; 