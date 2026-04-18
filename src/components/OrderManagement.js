import React, { useState, useEffect } from 'react';
import '../styles/OrderManagement.css';
import { useToast } from '../contexts/ToastContext';
import { getOrdersFromSupabase, updateOrderStatus, deleteOrderFromSupabase, restoreProductQuantities, getProductsFromSupabase, updateProductInSupabase } from '../utils/supabase';

export default function OrderManagement({ darkMode = false }) {
  const { showToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [eventBookings, setEventBookings] = useState([]);
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
  const [activeTab, setActiveTab] = useState('orders');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionModal, setShowRejectionModal] = useState(false);

  useEffect(() => {
    loadOrders();
    loadEventBookings();
  }, []);

  const loadEventBookings = async () => {
    try {
      const { getEventBookingsFromSupabase } = await import('../utils/supabase');
      const { data: eventBookingsData } = await getEventBookingsFromSupabase(100, 0);
      setEventBookings(eventBookingsData || []);
    } catch (error) {
      console.error('Error loading event bookings from Supabase:', error);
    }
  };

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
      // Error loading orders
    }
    setLoading(false);
  };

  const handleEditOrder = (order) => {
    setSelectedOrder(order);
    setEditForm({
      status: order.status || 'pending',
      productCode: order.productCode || ''
    });
    setShowEditModal(true);
  };

  const handleSaveOrder = async (e) => {
    e.preventDefault();
    try {
      await updateOrderStatus(selectedOrder.id, editForm.status);
      showToast('✅ Order updated successfully', 'success');
      setShowEditModal(false);
      loadOrders();
    } catch (error) {
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

  const handleRejectEventBooking = async (index) => {
    const booking = eventBookings[index];
    if (!booking) return;

    const rejectionReason = prompt('Please enter the reason for rejecting this event booking:');
    if (!rejectionReason) {
      showToast('Rejection cancelled. No reason provided.', 'warning');
      return;
    }

    // Restore product quantities before rejecting
    if (booking.products && Array.isArray(booking.products)) {
      try {
        const { data: currentProducts } = await getProductsFromSupabase(100, 0);
        if (currentProducts) {
          const restorePromises = booking.products.map(async (product) => {
            const productIndex = currentProducts.findIndex(p => p.id === product.id);
            if (productIndex !== -1) {
              const newQuantity = currentProducts[productIndex].quantity + product.quantity;
              await updateProductInSupabase(product.id, { quantity: newQuantity });
              
              return { id: product.id, newQuantity };
            }
            return null;
          });
          
          await Promise.all(restorePromises);
          
          // Update localStorage with final quantities
          const { data: updatedProducts } = await getProductsFromSupabase(100, 0);
          if (updatedProducts) {
            localStorage.setItem('ecommerce_products', JSON.stringify(updatedProducts));
          }
        }
      } catch (error) {
        // Error restoring product quantities
      }
    }

    // Update booking status
    const updatedBookings = [...eventBookings];
    try {
      const { updateEventBookingStatus } = await import('../utils/supabase');
      await updateEventBookingStatus(booking.id, 'rejected', rejectionReason);
      
      // Reload event bookings from Supabase
      await loadEventBookings();
      
      showToast('Event booking rejected successfully', 'success');
    } catch (error) {
      console.error('Error rejecting event booking:', error);
      showToast('Failed to reject event booking', 'error');
    }
  };

  const handleCancelEventBooking = async (index) => {
    if (!window.confirm('Are you sure you want to cancel this event booking?')) return;

    const booking = eventBookings[index];
    if (!booking) return;

    try {
      const { updateEventBookingStatus } = await import('../utils/supabase');
      await updateEventBookingStatus(booking.id, 'rejected', 'Cancelled by admin');
      
      // Reload event bookings from Supabase
      await loadEventBookings();
      
      showToast('Event booking cancelled successfully', 'success');
    } catch (error) {
      console.error('Error cancelling event booking:', error);
      showToast('Failed to cancel event booking', 'error');
    }
  };

  const handleDeleteEventBooking = async (index) => {
    if (!window.confirm('Are you sure you want to delete this event booking?')) return;

    try {
      const { deleteEventBookingFromSupabase } = await import('../utils/supabase');
      await deleteEventBookingFromSupabase(eventBookings[index].id);
      
      // Reload event bookings from Supabase
      await loadEventBookings();
      
      showToast('Event booking deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting event booking:', error);
      showToast('Failed to delete event booking', 'error');
    }
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
      
      // Add deletion notification to localStorage (only if userEmail exists)
      // Get userEmail from order
      let userEmail = selectedOrder.userEmail;
      if (!userEmail && selectedOrder.userId) {
        // Try to get from users list if userId exists
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.id === selectedOrder.userId);
        if (user) {
          userEmail = user.email;
        }
      }

      // Only add notification if userEmail exists
      if (userEmail) {
        try {
          const { addNotificationToSupabase } = await import('../utils/supabase');
          await addNotificationToSupabase({
            userEmail: userEmail,
            type: 'deletion',
            message: `Your order #${selectedOrder.orderNumber} has been deleted. Reason: ${deleteReason}`,
            read: false
          });
        } catch (error) {
          console.error('Error adding notification to Supabase:', error);
        }
      }
      
      showToast('✅ Order deleted successfully. Products returned to stock.', 'success');
      setShowDeleteModal(false);
      setSelectedOrder(null);
      setDeleteReason('');
      
      // Update local state
      setOrders(prev => prev.filter(o => o.id !== selectedOrder.id));
    } catch (error) {
      showToast('❌ Failed to delete order', 'error');
    }
  };

  const handleRejectOrder = async (orderId) => {
    const reason = prompt('Please enter the reason for rejection:');
    if (!reason) return;

    try {
      await updateOrderStatus(orderId, 'rejected', reason);
      
      // Restore product quantities
      const order = orders.find(o => o.id === orderId);
      if (order) {
        await restoreProductQuantities(order);
        addRejectionNotification(order, reason);
      }
      
      showToast('Order rejected successfully', 'success');
    } catch (error) {
      showToast('Failed to reject order', 'error');
    }
  };

  const addRejectionNotification = async (order, reason = '') => {
    // Get userEmail from order
    let userEmail = order.userEmail;
    if (!userEmail && order.userId) {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const user = users.find(u => u.id === order.userId);
      if (user) {
        userEmail = user.email;
      }
    }

    // Only add notification if userEmail exists
    if (userEmail) {
      try {
        const { addNotificationToSupabase } = await import('../utils/supabase');
        await addNotificationToSupabase({
          userEmail: userEmail,
          type: 'rejection',
          message: `Your order #${order.orderNumber || order.id} has been rejected. ${reason}`,
          read: false
        });
      } catch (error) {
        console.error('Error adding rejection notification to Supabase:', error);
      }
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;

    try {
      await updateOrderStatus(orderId, 'rejected', 'Cancelled by admin');
      
      showToast('Order cancelled successfully', 'success');
    } catch (error) {
      showToast('Failed to cancel order', 'error');
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
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
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

      {/* Tab Buttons */}
      <div className="tab-buttons">
        <button
          className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          Orders
          <span className="tab-count">{orders.filter(o => o.status !== 'rejected').length + eventBookings.filter(b => b.status !== 'rejected').length}</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'rejected' ? 'active' : ''}`}
          onClick={() => setActiveTab('rejected')}
        >
          Rejected Orders
          <span className="tab-count">{orders.filter(o => o.status === 'rejected').length + eventBookings.filter(b => b.status === 'rejected').length}</span>
        </button>
      </div>

      {activeTab === 'orders' && filteredOrders.length === 0 ? (
        <div className="no-orders">
          <div className="no-orders-icon">📦</div>
          <h3>No Orders Yet</h3>
          <p>No orders have been placed yet. Orders will appear here once customers start shopping.</p>
        </div>
      ) : activeTab === 'orders' && (
        <div className="orders-list">
          {filteredOrders.map((order) => (
            <div key={order.id} className="order-card">
              <div className="order-header">
                <div className="order-info">
                  <h3>Order #{order.orderNumber || order.id}</h3>
                  <p className="order-date">{formatDateTime(order.created_at || order.date)}</p>
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
                    // Error parsing shipping data
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
                          <p>Code: #{item.id || 'Not Available'}</p>
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
                      <p><strong>Name:</strong> {order.shipping.fullName || 'Not Available'}</p>
                      <p><strong>Phone:</strong> {order.shipping.phone || 'Not Available'}</p>
                      <p><strong>Address:</strong> {order.shipping.street || 'Not Available'}, {order.shipping.building || 'Not Available'}</p>
                      <p><strong>City:</strong> {order.shipping.city || 'Not Available'}, {order.shipping.governorate || 'Not Available'}</p>
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
                    className="reject-order-btn"
                    onClick={() => handleRejectOrder(order.id)}
                  >
                    Reject
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

      {/* Event Bookings Section */}
      {activeTab === 'orders' && eventBookings.filter(booking => booking.status !== 'rejected').length > 0 && (
        <div className="orders-list">
          <h2 style={{ color: '#e0e0e0', marginBottom: '20px', marginTop: '30px' }}>🎉 Event Bookings</h2>
          {eventBookings.filter(booking => booking.status !== 'rejected').map((booking, index) => (
            <div key={index} className="order-card">
              <div className="order-header">
                <div className="order-info">
                  <h3 style={{ color: '#ffffff' }}>🎉 Event Booking</h3>
                  <p className="order-date">{formatDateTime(booking.createdAt)}</p>
                </div>
                <div className="order-status">
                  <span
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(booking.status) }}
                  >
                    {booking.status}
                  </span>
                </div>
              </div>

              <div className="event-details">
                <h4>📅 Event Information</h4>
                <p><strong>Date & Time:</strong> {formatDate(booking.eventDate)}</p>
                <p><strong>Place:</strong> {booking.eventPlace}</p>
                {booking.orderDetails && (
                  <p><strong>Details:</strong> {booking.orderDetails}</p>
                )}
              </div>

              <div className="order-items">
                <h4>📦 Products</h4>
                {booking.products && booking.products.map((product, pIndex) => (
                  <div key={pIndex} className="order-item">
                    <div className="item-image">
                      <img
                        src={product.image || 'https://via.placeholder.com/60x60?text=No+Image'}
                        alt={product.title || 'Product'}
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/60x60?text=No+Image';
                        }}
                      />
                    </div>
                    <div className="item-details">
                      <h5>{product.title || 'Unknown Product'}</h5>
                      <p>Price: ${product.price || '0.00'}</p>
                      <p>Quantity: {product.quantity || 0}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="order-details">
                <div className="order-total">
                  <span>Total:</span>
                  <strong>${booking.total?.toFixed(2) || '0.00'}</strong>
                </div>
                <div className="order-actions">
                  <button
                    className="reject-order-btn"
                    onClick={() => handleRejectEventBooking(index)}
                  >
                    Reject
                  </button>
                  <button
                    className="delete-order-btn"
                    onClick={() => handleDeleteEventBooking(index)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rejected Orders Section */}
      {activeTab === 'rejected' && (
        <>
          {orders.filter(o => o.status === 'rejected').length > 0 && (
            <div className="orders-list">
              <h2 style={{ color: '#e0e0e0', marginBottom: '20px', marginTop: '30px' }}>❌ Rejected Orders</h2>
              {orders.filter(o => o.status === 'rejected').map((order) => (
                <div key={order.id} className="order-card rejected-order-card">
                  <div className="order-header">
                    <div className="order-info">
                      <h3>Order #{order.orderNumber || order.id}</h3>
                      <p className="order-date">{formatDateTime(order.created_at || order.date)}</p>
                    </div>
                    <div className="order-status">
                      <span className="status-badge rejected-badge">
                        ❌ Rejected
                      </span>
                    </div>
                  </div>

                  {order.rejectionReason && (
                    <div className="rejection-info">
                      <p><strong>Reason:</strong> {order.rejectionReason}</p>
                    </div>
                  )}

                  {/* Order Items */}
                  {(() => {
                    let items = order.items || [];
                    if (!items.length && order.shipping) {
                      try {
                        const shippingData = typeof order.shipping === 'string' ? JSON.parse(order.shipping) : order.shipping;
                        items = shippingData.items || [];
                      } catch (error) {
                        // Error parsing shipping data
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
                              <p>Price: ${item.price || '0.00'}</p>
                              <p>Quantity: {item.quantity || 0}</p>
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
                          <p><strong>Name:</strong> {order.shipping.fullName || 'Not Available'}</p>
                          <p><strong>Phone:</strong> {order.shipping.phone || 'Not Available'}</p>
                          <p><strong>Address:</strong> {order.shipping.street || 'Not Available'}, {order.shipping.building || 'Not Available'}</p>
                          <p><strong>City:</strong> {order.shipping.city || 'Not Available'}, {order.shipping.governorate || 'Not Available'}</p>
                        </>
                      )}
                    </div>
                  )}

                  <div className="order-details">
                    <div className="order-total">
                      <span>Total:</span>
                      <strong>${(order.total || 0).toFixed(2)}</strong>
                    </div>
                  </div>

                  <div className="order-actions">
                    <button
                      className="delete-order-btn"
                      onClick={() => handleDeleteOrder(order.id)}
                    >
                      Delete Permanently
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Rejected Event Bookings Section */}
          {eventBookings.filter(booking => booking.status === 'rejected').length > 0 && (
            <div className="orders-list">
              <h2 style={{ color: '#e0e0e0', marginBottom: '20px', marginTop: '30px' }}>❌ Rejected Event Bookings</h2>
              {eventBookings.filter(booking => booking.status === 'rejected').map((booking, index) => (
                <div key={index} className="order-card rejected-order-card" onClick={() => {
                  if (booking.rejectionReason) {
                    setRejectionReason(booking.rejectionReason);
                    setShowRejectionModal(true);
                  }
                }}>
                  <div className="order-header">
                    <div className="order-info">
                      <h3 style={{ color: '#ffffff' }}>🎉 Event Booking</h3>
                      <p className="order-date">{formatDateTime(booking.createdAt)}</p>
                    </div>
                    <div className="order-status">
                      <span className="status-badge rejected-badge">
                        ❌ Rejected
                      </span>
                    </div>
                  </div>

                  {booking.rejectionReason && (
                    <div className="rejection-info">
                      <p><strong>Reason:</strong> {booking.rejectionReason}</p>
                    </div>
                  )}

                  <div className="event-details">
                    <h4>📅 Event Information</h4>
                    <p><strong>Date & Time:</strong> {formatDate(booking.eventDate)}</p>
                    <p><strong>Place:</strong> {booking.eventPlace}</p>
                    {booking.orderDetails && (
                      <p><strong>Details:</strong> {booking.orderDetails}</p>
                    )}
                  </div>

                  <div className="order-items">
                    <h4>📦 Products</h4>
                    {booking.products && booking.products.map((product, pIndex) => (
                      <div key={pIndex} className="order-item">
                        <div className="item-image">
                          <img
                            src={product.image || 'https://via.placeholder.com/60x60?text=No+Image'}
                            alt={product.title || 'Product'}
                            onError={(e) => {
                              e.target.src = 'https://via.placeholder.com/60x60?text=No+Image';
                            }}
                          />
                        </div>
                        <div className="item-details">
                          <h5>{product.title || 'Unknown Product'}</h5>
                          <p>Price: ${product.price || '0.00'}</p>
                          <p>Quantity: {product.quantity || 0}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="order-details">
                    <div className="order-total">
                      <span>Total:</span>
                      <strong>${booking.total?.toFixed(2) || '0.00'}</strong>
                    </div>
                    <div className="order-actions">
                      <button
                        className="delete-order-btn"
                        onClick={() => handleDeleteEventBooking(index)}
                      >
                        Delete Permanently
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {orders.filter(o => o.status === 'rejected').length === 0 && eventBookings.filter(booking => booking.status === 'rejected').length === 0 && (
            <div className="no-orders">
              <div className="no-orders-icon">📦</div>
              <h3>No Rejected Orders</h3>
              <p>No rejected orders or event bookings yet.</p>
            </div>
          )}
        </>
      )}

      {/* Edit Order Modal */}
      {showEditModal && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Order #{selectedOrder.id}</h2>
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
                  <option value="pending">Pending</option>
                  <option value="Processing">Processing</option>
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
