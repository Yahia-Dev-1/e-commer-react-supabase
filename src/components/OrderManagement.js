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
    status: 'pending',
    preparation_start_date: '',
    preparation_end_date: '',
    shipping_start_date: '',
    shipping_end_date: '',
    shipping_location: '',
    estimated_delivery_date: ''
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
      status: order.status || 'pending',
      preparation_start_date: order.preparation_start_date || '',
      preparation_end_date: order.preparation_end_date || '',
      shipping_start_date: order.shipping_start_date || '',
      shipping_end_date: order.shipping_end_date || '',
      shipping_location: order.shipping_location || '',
      estimated_delivery_date: order.estimated_delivery_date || ''
    });
    setShowEditModal(true);
  };

  const handleSaveOrder = async (e) => {
    e.preventDefault();
    try {
      const trackingInfo = {
        preparation_start_date: editForm.preparation_start_date,
        preparation_end_date: editForm.preparation_end_date,
        shipping_start_date: editForm.shipping_start_date,
        shipping_end_date: editForm.shipping_end_date,
        shipping_location: editForm.shipping_location,
        estimated_delivery_date: editForm.estimated_delivery_date
      };
      
      await updateOrderStatus(selectedOrder.id, editForm.status, trackingInfo);
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
                  <p className="order-user">User: {order.user_email || 'Unknown'}</p>
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

              {/* Timeline Details */}
              {(order.preparation_start_date || order.shipping_start_date) && (
                <div className="order-timeline">
                  <h4>📅 Timeline Details</h4>
                  {order.preparation_start_date && (
                    <p>Preparation: {formatDate(order.preparation_start_date)} - {formatDate(order.preparation_end_date)}</p>
                  )}
                  {order.shipping_start_date && (
                    <p>Shipping: {formatDate(order.shipping_start_date)} - {formatDate(order.shipping_end_date)}</p>
                  )}
                  {order.shipping_location && (
                    <p>Shipping from: {order.shipping_location}</p>
                  )}
                  {order.estimated_delivery_date && (
                    <p>Estimated delivery: {formatDate(order.estimated_delivery_date)}</p>
                  )}
                </div>
              )}
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

              <div className="form-row">
                <div className="form-group">
                  <label>Preparation Start Date</label>
                  <input
                    type="date"
                    value={editForm.preparation_start_date}
                    onChange={(e) => setEditForm({ ...editForm, preparation_start_date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Preparation End Date</label>
                  <input
                    type="date"
                    value={editForm.preparation_end_date}
                    onChange={(e) => setEditForm({ ...editForm, preparation_end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Shipping Start Date</label>
                  <input
                    type="date"
                    value={editForm.shipping_start_date}
                    onChange={(e) => setEditForm({ ...editForm, shipping_start_date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Shipping End Date</label>
                  <input
                    type="date"
                    value={editForm.shipping_end_date}
                    onChange={(e) => setEditForm({ ...editForm, shipping_end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Shipping Location</label>
                <input
                  type="text"
                  value={editForm.shipping_location}
                  onChange={(e) => setEditForm({ ...editForm, shipping_location: e.target.value })}
                  placeholder="e.g., Cairo, Egypt"
                />
              </div>

              <div className="form-group">
                <label>Estimated Delivery Date</label>
                <input
                  type="date"
                  value={editForm.estimated_delivery_date}
                  onChange={(e) => setEditForm({ ...editForm, estimated_delivery_date: e.target.value })}
                />
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
