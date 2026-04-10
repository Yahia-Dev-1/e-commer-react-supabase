import React, { useState, useEffect } from 'react';
import '../styles/OrderManagement.css';
import { useToast } from '../contexts/ToastContext';
import { getOrdersFromSupabase, updateOrderStatus, deleteOrderFromSupabase } from '../utils/supabase';

export default function OrderManagement({ darkMode = false }) {
  const showToast = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    status: 'pending'
  });

  useEffect(() => {
    loadOrders();
  }, []);

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

  const handleDeleteOrder = async (orderId) => {
    if (window.confirm('Are you sure you want to delete this order?')) {
      try {
        await deleteOrderFromSupabase(orderId);
        showToast('✅ Order deleted successfully', 'success');
        loadOrders();
      } catch (error) {
        console.error('Error deleting order:', error);
        showToast('❌ Failed to delete order', 'error');
      }
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
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
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

      {orders.length === 0 ? (
        <div className="no-orders">
          <h3>No Orders Yet</h3>
          <p>Orders will appear here once customers place them.</p>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <div key={order.id} className="order-card">
              <div className="order-header">
                <div className="order-info">
                  <h3>Order #{order.orderNumber}</h3>
                  <p className="order-date">{formatDate(order.created_at)}</p>
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
    </div>
  );
}
