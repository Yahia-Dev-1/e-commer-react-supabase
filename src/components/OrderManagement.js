import React, { useState, useEffect } from 'react';
import '../styles/OrderManagement.css';
import { useToast } from '../contexts/ToastContext';
import { getOrdersFromSupabase, updateOrderStatus, deleteOrderFromSupabase, restoreProductQuantities } from '../utils/supabase';

export default function OrderManagement({ darkMode = false }) {
  const showToast = useToast();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editForm, setEditForm] = useState({
    status: 'pending'
  });

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    const filtered = orders.filter(order => {
      const searchLower = searchTerm.toLowerCase();
      return (
        order.orderNumber?.toLowerCase().includes(searchLower) ||
        order.status?.toLowerCase().includes(searchLower) ||
        order.total?.toString().includes(searchLower)
      );
    });
    setFilteredOrders(filtered);
  }, [orders, searchTerm]);

  const loadOrders = async () => {
    try {
      const { data: ordersData } = await getOrdersFromSupabase(100, 0);
      setOrders(ordersData || []);
    } catch (error) {
      console.error('Error loading orders:', error);
    }
    setLoading(false);
  };

  const handleEditOrder = (order) => {
    setSelectedOrder(order);
    setEditForm({
      status: order.status || 'pending'
    });
    setShowEditModal(true);
  };

  const handleSaveOrder = async (e) => {
    e.preventDefault();
    try {
      console.log('=== UPDATING ORDER ===');
      console.log('Selected order:', selectedOrder);
      console.log('Order ID:', selectedOrder.id);
      console.log('New status:', editForm.status);
      
      await updateOrderStatus(selectedOrder.id, editForm.status);
      showToast('✅ Order updated successfully', 'success');
      setShowEditModal(false);
      loadOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      showToast('❌ Failed to update order', 'error');
    }
  };

  const handleDeleteOrder = (orderId) => {
    const orderToDelete = orders.find(order => order.id === orderId);
    if (!orderToDelete) return;
    
    setSelectedOrder(orderToDelete);
    setShowDeleteModal(true);
    setDeleteReason('');
  };

  const confirmDeleteOrder = async () => {
    if (!deleteReason) {
      showToast('Please select a reason for deletion', 'error');
      return;
    }

    try {
      await deleteOrderFromSupabase(selectedOrder.id);
      
      // Restore product quantities
      await restoreProductQuantities(selectedOrder);
      
      // Add deletion notification to localStorage
      const notifications = JSON.parse(localStorage.getItem('order_notifications') || '[]');
      const notification = {
        id: Date.now(),
        type: 'deletion',
        message: `Your order #${selectedOrder.orderNumber} has been deleted. Reason: ${deleteReason}`,
        date: new Date().toISOString(),
        userEmail: selectedOrder.userEmail || selectedOrder.user?.email,
        read: false
      };
      notifications.push(notification);
      localStorage.setItem('order_notifications', JSON.stringify(notifications));
      
      showToast('✅ Order deleted successfully. Products returned to stock.', 'success');
      setShowDeleteModal(false);
      setSelectedOrder(null);
      setDeleteReason('');
      loadOrders();
    } catch (error) {
      console.error('Error deleting order:', error);
      showToast('❌ Failed to delete order', 'error');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Delivered':
        return '#4CAF50';
      case 'Shipped':
        return '#2196F3';
      case 'Processing':
        return '#FF9800';
      case 'Preparing':
        return '#9C27B0';
      case 'pending':
        return '#FF5722';
      case 'approved':
        return '#00BCD4';
      default:
        return '#666';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="order-management-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`order-management-container ${darkMode ? 'dark-mode' : ''}`}>
      <div className="order-management-header">
        <h1>Order Management</h1>
        <p>Manage and track all orders</p>
      </div>

      {/* Search Bar */}
      <div className="search-container">
        <input
          type="text"
          placeholder="Search orders by number, status, or total..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        {searchTerm && (
          <button className="clear-search" onClick={() => setSearchTerm('')}>
            ×
          </button>
        )}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="no-orders">
          <h3>No Orders Yet</h3>
          <p>Orders will appear here once customers place them.</p>
        </div>
      ) : (
        <div className="orders-list">
          {filteredOrders.map((order) => (
            <div key={order.id} className="order-card">
              <div className="order-header">
                <div className="order-info">
                  <h3>{order.orderNumber}</h3>
                  <p className="order-date">{formatDateTime(order.created_at)}</p>
                </div>
                <div className="order-status">
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(order.status) }}
                  >
                    {order.status}
                  </span>
                </div>
              </div>

              {/* Order Items */}
              {order.items && order.items.length > 0 && (
                <div className="order-items">
                  <h4>📦 Order Items</h4>
                  {order.items.map((item, index) => (
                    <div key={index} className="order-item">
                      <div className="item-image">
                        <img src={item.image} alt={item.name} />
                      </div>
                      <div className="item-details">
                        <h5>{item.name}</h5>
                        <p>Price: ${item.price}</p>
                        <p>Quantity: {item.quantity}</p>
                        <p>Total: ${(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Shipping Details */}
              {order.shipping && (
                <div className="order-shipping">
                  <h4>🚚 Shipping Details</h4>
                  {typeof order.shipping === 'string' ? (
                    <pre>{order.shipping}</pre>
                  ) : (
                    <>
                      <p><strong>Name:</strong> {order.shipping.fullName || 'N/A'}</p>
                      <p><strong>Phone:</strong> {order.shipping.phone || 'N/A'}</p>
                      <p><strong>Address:</strong> {order.shipping.street || 'N/A'}, {order.shipping.building || 'N/A'}</p>
                      <p><strong>City:</strong> {order.shipping.city || 'N/A'}, {order.shipping.governorate || 'N/A'}</p>
                      {order.shipping.addressInCountry && (
                        <p><strong>Address Inside Country:</strong> {order.shipping.addressInCountry}</p>
                      )}
                      {order.shipping.additionalInfo && (
                        <p><strong>Notes:</strong> {order.shipping.additionalInfo}</p>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="order-details">
                <div className="order-total">
                  <span>Total:</span>
                  <strong>${(order.total || 0).toFixed(2)}</strong>
                </div>
                <div className="order-actions">
                  <button 
                    className="edit-order-btn"
                    onClick={() => handleEditOrder(order)}
                  >
                    Edit Order
                  </button>
                  <button 
                    className="delete-order-btn"
                    onClick={() => handleDeleteOrder(order.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Order Modal */}
      {showEditModal && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Order #{selectedOrder.orderNumber}</h2>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>×</button>
            </div>

            <form onSubmit={handleSaveOrder} className="edit-order-form">
              <div className="form-group">
                <label>Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  required
                >
                  <option value="pending">Pending Approval</option>
                  <option value="approved">Approved</option>
                  <option value="Processing">Processing</option>
                  <option value="Preparing">Preparing</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Delivered">Delivered</option>
                </select>
              </div>

              <div className="form-actions">
                <button type="submit" className="save-btn">Save Changes</button>
                <button 
                  type="button" 
                  className="cancel-btn" 
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Reason Modal */}
      {showDeleteModal && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete Order #{selectedOrder.orderNumber}</h2>
              <button className="close-btn" onClick={() => setShowDeleteModal(false)}>×</button>
            </div>

            <div className="delete-reason-form">
              <p>Please select a reason for deleting this order:</p>
              <div className="reason-options">
                <label className="reason-option">
                  <input
                    type="radio"
                    value="Incomplete data"
                    checked={deleteReason === 'Incomplete data'}
                    onChange={(e) => setDeleteReason(e.target.value)}
                  />
                  <span>📝 Incomplete data - Order data is incomplete</span>
                </label>
                <label className="reason-option">
                  <input
                    type="radio"
                    value="Invalid data"
                    checked={deleteReason === 'Invalid data'}
                    onChange={(e) => setDeleteReason(e.target.value)}
                  />
                  <span>❌ Invalid data - Order data is incorrect</span>
                </label>
                <label className="reason-option">
                  <input
                    type="radio"
                    value="Product out of stock"
                    checked={deleteReason === 'Product out of stock'}
                    onChange={(e) => setDeleteReason(e.target.value)}
                  />
                  <span>📦 Product out of stock - Product is no longer available</span>
                </label>
                <label className="reason-option">
                  <input
                    type="radio"
                    value="Customer request"
                    checked={deleteReason === 'Customer request'}
                    onChange={(e) => setDeleteReason(e.target.value)}
                  />
                  <span>👤 Customer request - Customer requested cancellation</span>
                </label>
                <label className="reason-option">
                  <input
                    type="radio"
                    value="Other"
                    checked={deleteReason === 'Other'}
                    onChange={(e) => setDeleteReason(e.target.value)}
                  />
                  <span>🔍 Other - Other reason</span>
                </label>
              </div>

              <div className="form-actions">
                <button 
                  className="delete-btn" 
                  onClick={confirmDeleteOrder}
                  disabled={!deleteReason}
                >
                  Delete Order
                </button>
                <button 
                  className="cancel-btn" 
                  onClick={() => setShowDeleteModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
