import React, { useState, useEffect } from 'react';
import '../styles/OrderManagement.css';
import { useToast } from '../contexts/ToastContext';
import { getOrdersFromSupabase, updateOrderStatus, deleteOrderFromSupabase, restoreProductQuantities } from '../utils/supabase';

export default function OrderManagement({ darkMode = false }) {
  const { showToast } = useToast();
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
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

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
    let color;
    switch (status) {
      case 'Delivered':
        color = '#4CAF50';
        break;
      case 'Shipped':
        color = '#2196F3';
        break;
      case 'Processing':
        color = '#FF9800';
        break;
      case 'Preparing':
        color = '#FF9800';
        break;
      case 'pending':
        color = '#FF5722';
        break;
      default:
        color = '#666';
    }
    return color;
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'Delivered':
        return 'Delivered';
      case 'Shipped':
        return 'Shipped';
      case 'Processing':
        return 'Processing';
      case 'Preparing':
        return 'Preparing';
      case 'pending':
        return 'Pending';
      case 'approved':
        return 'Approved';
      default:
        return status;
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
                    {getStatusLabel(order.status)}
                  </span>
                </div>
              </div>

              {/* Order Items */}
              {(() => {
                let items = order.items || [];
                if (!items.length && order.shipping) {
                  try {
                    const shippingData = typeof order.shipping === 'string' ? JSON.parse(order.shipping) : order.shipping;
                    items = shippingData.items || [];
                  } catch (error) {
                    console.error('Error parsing shipping data:', error);
                  }
                }
                return items.length > 0 ? (
                  <div className="order-items">
                    <h4>📦 Order Items</h4>
                    {items.map((item, index) => (
                      <div key={index} className="order-item">
                        <div className="item-image">
                          <img 
                            src={item.image || 'https://via.placeholder.com/60x60?text=No+Image'} 
                            alt={item.name || 'Product'} 
                            onError={(e) => {
                              e.target.src = 'https://via.placeholder.com/60x60?text=No+Image';
                            }}
                          />
                        </div>
                        <div className="item-details">
                          <h5>{item.name || item.title || 'Unknown Product'}</h5>
                          <p>Code: #{item.id || 'N/A'}</p>
                          <p>Price: ${item.price || '0.00'}</p>
                          <p>Quantity: {item.quantity || 0}</p>
                          <p>Total: ${((item.price || 0) * (item.quantity || 0)).toFixed(2)}</p>
                          <button
                            className="view-details-btn"
                            onClick={() => {
                              setSelectedItem(item);
                              setShowDetailsModal(true);
                            }}
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null;
              })()}

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
                {order.estimatedDelivery && (
                  <div className="estimated-delivery">
                    <span>📦 Estimated Delivery:</span>
                    <strong>{order.estimatedDelivery}</strong>
                  </div>
                )}
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
                <label>الحالة</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  required
                >
                  <option value="pending">Processing</option>
                  <option value="Processing"> Preparing</option>
                  <option value="Shipped"> Shipped</option>
                  <option value="Delivered"> Delivered</option>
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
              <p>Please select a reason for deletion:</p>
              <div className="reason-options">
                <label className="reason-option">
                  <input
                    type="radio"
                    value="Incomplete data"
                    checked={deleteReason === 'Incomplete data'}
                    onChange={(e) => setDeleteReason(e.target.value)}
                  />
                  <span>❌ Incomplete data - Missing required information</span>
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
                  <span>❌ Product out of stock - Items unavailable</span>
                </label>
                <label className="reason-option">
                  <input
                    type="radio"
                    value="Customer request"
                    checked={deleteReason === 'Customer request'}
                    onChange={(e) => setDeleteReason(e.target.value)}
                  />
                  <span>❌ Customer request - Customer asked to cancel</span>
                </label>
                <label className="reason-option">
                  <input
                    type="radio"
                    value="Other"
                    checked={deleteReason === 'Other'}
                    onChange={(e) => setDeleteReason(e.target.value)}
                  />
                  <span>❌ Other - Different reason</span>
                </label>
              </div>
              <button className="delete-btn" onClick={confirmDeleteOrder} disabled={!deleteReason}>
                Delete Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Details Modal */}
      {showDetailsModal && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content product-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Product Details</h2>
              <button className="close-btn" onClick={() => setShowDetailsModal(false)}>×</button>
            </div>

            <div className="product-details-content">
              <div className="product-details-image">
                <img src={selectedItem.image} alt={selectedItem.name} />
              </div>
              <div className="product-details-info">
                <h3>{selectedItem.name}</h3>
                <div className="detail-item">
                  <span className="detail-label">Price:</span>
                  <span className="detail-value">${selectedItem.price}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Quantity:</span>
                  <span className="detail-value">{selectedItem.quantity}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Total:</span>
                  <span className="detail-value">${(selectedItem.price * selectedItem.quantity).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
