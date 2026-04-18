import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Orders.css';
import { useToast } from '../contexts/ToastContext';
import database from '../utils/database';
import { updateProductInSupabase, getOrdersFromSupabase, subscribeToOrders, restoreProductQuantities, addReviewToSupabase, deleteOrderFromSupabase } from '../utils/supabase';
import Modal from './Modal';
export default function Orders({ user, orders = [] }) {
  const showToast = useToast();
  const [loading, setLoading] = useState(true);
  const [showTracking, setShowTracking] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [userOrders, setUserOrders] = useState([]);
  const [eventBookings, setEventBookings] = useState([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [reviewData, setReviewData] = useState({ rating: 5, comment: '' });
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [activeTab, setActiveTab] = useState('orders');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '' });

  useEffect(() => {
    const loadOrders = async () => {
      if (user) {
        try {
          // Get orders from Supabase
          const { data: allOrders } = await getOrdersFromSupabase(100, 0);
                              
          // Show all orders (no filtering since userEmail not in database)
          setUserOrders(allOrders || []);
        } catch (error) {
                                        // Fallback to localStorage
          const orders = database.getUserOrders(user.id);
          setUserOrders(orders);
        }

        // Load event bookings from Supabase
        try {
          const { getEventBookingsFromSupabase } = await import('../utils/supabase');
          const { data: eventBookingsData } = await getEventBookingsFromSupabase(100, 0);
          // Filter by user email
          const userEvents = eventBookingsData.filter(booking => booking.useremail === user.email);
          setEventBookings(userEvents);
        } catch (error) {
          console.error('Error loading event bookings from Supabase:', error);
        }

        // Load notifications from Supabase
        try {
          const { getNotificationsForUser } = await import('../utils/supabase');
          const userNotifications = await getNotificationsForUser(user.email);
          setNotifications(userNotifications);
        } catch (error) {
          console.error('Error loading notifications from Supabase:', error);
        }
      }
      setLoading(false);
    };

    loadOrders();

    // Real-time subscription for orders
    const unsubscribe = subscribeToOrders((supabaseOrders) => {
      if (!user) return;

      
      // Show all orders (no filtering since userEmail not in database)
      setUserOrders(supabaseOrders || []);
    });

    return () => unsubscribe();
  }, [user]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Delivered':
        return '#1a5f1a';
      case 'Shipped':
        return '#1a3a5f';
      case 'Processing':
        return '#5f4a1a';
      case 'Preparing':
        return '#3f1a5f';
      case 'pending':
        return '#5f2a1a';
      case 'approved':
        return '#1a5f5f';
      default:
        return '#333';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'N/A';
    }
  };

  const handleTrackOrder = (order) => {
    setSelectedOrder(order);
    setShowTracking(true);
  };

  const closeTracking = () => {
    setShowTracking(false);
    setSelectedOrder(null);
  };

  const handleOpenReviewModal = (product) => {
    setSelectedProduct(product);
    setReviewData({ rating: 5, comment: '' });
    setShowReviewModal(true);
  };

  const handleCloseReviewModal = () => {
    setShowReviewModal(false);
    setSelectedProduct(null);
    setReviewData({ rating: 5, comment: '' });
  };

  const handleDeleteOrder = async (orderId) => {
    setOrderToDelete(orderId);
    setShowDeleteModal(true);
  };

  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return;

    try {
      await deleteOrderFromSupabase(orderToDelete);
      setUserOrders(userOrders.filter(order => order.id !== orderToDelete));
      setShowDeleteModal(false);
      setOrderToDelete(null);
      if (showToast && typeof showToast === 'function') {
        showToast('Order deleted successfully', 'success');
      } else {
        setAlertModal({ isOpen: true, title: 'Success', message: 'Order deleted successfully' });
      }
    } catch (error) {
            if (showToast && typeof showToast === 'function') {
        showToast('Failed to delete order', 'error');
      } else {
        setAlertModal({ isOpen: true, title: 'Error', message: 'Failed to delete order' });
      }
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    try {
      await addReviewToSupabase({
        productId: selectedProduct.id,
        userId: user?.email || 'anonymous@example.com',
        userName: user?.email || 'Anonymous',
        rating: reviewData.rating,
        comment: reviewData.comment
      });
            handleCloseReviewModal();
    } catch (error) {
          }
  };

  // 🆕 Function to cancel order for user
  const cancelOrder = async (orderId) => {
    const orderToCancel = userOrders.find(order => order.id === orderId);
    if (!orderToCancel) return;

    // Only orders in Processing status can be cancelled
    if (orderToCancel.status !== 'Processing') {
      if (showToast && typeof showToast === 'function') {
        showToast('❌ You can only cancel orders that are still being processed.', 'error');
      } else {
        setAlertModal({ isOpen: true, title: 'Error', message: 'You can only cancel orders that are still being processed.' });
      }
      return;
    }

    if (window.confirm('Are you sure you want to cancel this order?')) {
      // Restore product quantities
      await restoreProductQuantities(orderToCancel);

      // Update local state
      setUserOrders(prev => prev.filter(o => o.id !== orderId));

      if (showToast && typeof showToast === 'function') {
        showToast('✅ Order cancelled successfully. Products returned to stock.', 'success');
      } else {
        setAlertModal({ isOpen: true, title: 'Success', message: 'Order cancelled successfully. Products returned to stock.' });
      }
    }
  };

  // Function to cancel order for user
  const handleCancelOrder = async (orderId) => {
    if (window.confirm('Are you sure you want to cancel this order?')) {
      try {
        const { updateOrderStatus } = await import('../utils/supabase');
        await updateOrderStatus(orderId, 'rejected', 'Cancelled by user');
        
        // Reload orders
        const { getOrdersFromSupabase } = await import('../utils/supabase');
        const { data: ordersData } = await getOrdersFromSupabase(100, 0);
        setUserOrders(ordersData || []);
        
        if (showToast && typeof showToast === 'function') {
          showToast('Order cancelled successfully', 'success');
        }
      } catch (error) {
        console.error('Error cancelling order:', error);
        if (showToast && typeof showToast === 'function') {
          showToast('Failed to cancel order', 'error');
        }
      }
    }
  };

  // Function to cancel event booking for user
  const handleCancelEventBooking = async (index) => {
    if (window.confirm('Are you sure you want to cancel this event booking?')) {
      try {
        const { updateEventBookingStatus } = await import('../utils/supabase');
        await updateEventBookingStatus(eventBookings[index].id, 'rejected', 'Cancelled by user');
        
        // Reload event bookings from Supabase
        const { getEventBookingsByUser } = await import('../utils/supabase');
        const userEvents = await getEventBookingsByUser(user.email);
        setEventBookings(userEvents);
        
        if (showToast && typeof showToast === 'function') {
          showToast('Event booking cancelled successfully', 'success');
        }
      } catch (error) {
        console.error('Error cancelling event booking:', error);
        if (showToast && typeof showToast === 'function') {
          showToast('Failed to cancel event booking', 'error');
        }
      }
    }
  };

  const getTrackingSteps = (status, order) => {
    const steps = [
      { id: 1, title: 'Order Placed', description: 'Your order has been received', completed: true },
      { id: 2, title: 'Pending', description: 'Waiting for admin approval', completed: status === 'approved' || status === 'Processing' || status === 'Preparing' || status === 'Shipped' || status === 'Delivered' },
      { id: 3, title: 'Processing', description: 'We are preparing your order', completed: status === 'Processing' || status === 'Preparing' || status === 'Shipped' || status === 'Delivered' },
      { id: 4, title: 'Shipped', description: 'Your order is on its way', completed: status === 'Shipped' || status === 'Delivered' },
      { id: 5, title: 'Delivered', description: 'Your order has been delivered', completed: status === 'Delivered' }
    ];
    return steps;
  };

  if (loading) {
    return (
      <div className="orders-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading your orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="orders-container">
      <div className="orders-header">
        <h1>My Orders</h1>
        <p>Track your orders and event bookings</p>
      </div>

      {/* Notifications Section */}
      {notifications.length > 0 && (
        <div className="notifications-section">
          <div className="section-header">
            <h2>🔔 Notifications ({notifications.filter(n => !n.read).length})</h2>
            <button className="clear-all-btn" onClick={async () => {
              try {
                const { markAllNotificationsAsReadInSupabase } = await import('../utils/supabase');
                await markAllNotificationsAsReadInSupabase(user.email);
                const updatedNotifications = notifications.map(n => ({ ...n, read: true }));
                setNotifications(updatedNotifications);
              } catch (error) {
                console.error('Error marking all notifications as read:', error);
              }
            }}>
              Mark All as Read
            </button>
          </div>
          <div className="notifications-list">
            {notifications.map(notification => (
              <div
                key={notification.id}
                className={`notification-item ${!notification.read ? 'unread' : ''}`}
                onClick={async () => {
                  try {
                    const { markNotificationAsReadInSupabase } = await import('../utils/supabase');
                    await markNotificationAsReadInSupabase(notification.id);
                    const updatedNotifications = notifications.map(n =>
                      n.id === notification.id ? { ...n, read: true } : n
                    );
                    setNotifications(updatedNotifications);
                  } catch (error) {
                    console.error('Error marking notification as read:', error);
                  }
                }}
              >
                <div className="notification-content">
                  <span className="notification-icon">
                    {notification.type === 'rejection' ? '❌' : notification.type === 'deletion' ? '🗑️' : '📦'}
                  </span>
                  <span className="notification-message">{notification.message}</span>
                  <span className="notification-time">
                    {new Date(notification.created_at).toLocaleString()}
                  </span>
                </div>
                <button
                  className="delete-notification-btn"
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      const { deleteNotificationFromSupabase } = await import('../utils/supabase');
                      await deleteNotificationFromSupabase(notification.id);
                      const updatedNotifications = notifications.filter(n => n.id !== notification.id);
                      setNotifications(updatedNotifications);
                    } catch (error) {
                      console.error('Error deleting notification:', error);
                    }
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Buttons */}
      <div className="tab-buttons">
        <button
          className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          Orders
          <span className="tab-count">{userOrders.filter(order => order.status !== 'rejected').length}</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'rejected' ? 'active' : ''}`}
          onClick={() => setActiveTab('rejected')}
        >
          ❌ Rejected Orders
          <span className="tab-count">{userOrders.filter(order => order.status === 'rejected').length}</span>
        </button>
      </div>

      {userOrders.length === 0 ? (
        <div className="no-orders">
          <div className="no-orders-icon">📦</div>
          <h3>No Orders Yet</h3>
          <p>You haven't placed any orders yet. Start shopping to see your orders here!</p>
          <Link to="/" className="start-shopping-btn">Start Shopping</Link>
        </div>
      ) : (
        <>
          {/* Regular Orders */}
          {activeTab === 'orders' && userOrders.filter(order => order.status !== 'rejected').length > 0 && (
            <div className="orders-list">
              <h3 style={{ color: '#e0e0e0', marginBottom: '20px' }}>Your Orders</h3>
              {userOrders.filter(order => order.status !== 'rejected').map((order) => (
                <div key={order.id} className={`order-card ${order.status === 'rejected' ? 'rejected' : ''}`} onClick={() => {
                  if (order.status === 'rejected' && order.rejectionreason) {
                    setRejectionReason(order.rejectionreason);
                    setShowRejectionModal(true);
                  }
                }}>
                  <div className="order-header">
                    <div className="order-info">
                      <h3>Order #{order.orderNumber || order.id}</h3>
                      <p className="order-date">{formatDate(order.date || order.created_at)}</p>
                    </div>
                    <div className="order-status">
                      {order.status === 'rejected' ? (
                        <span className="status-badge rejected-badge">
                          ❌ Cancelled
                        </span>
                      ) : (
                        <span
                          className="status-badge"
                          style={{ backgroundColor: getStatusColor(order.status) }}
                        >
                          {order.status}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="order-items">
                    {(() => {
                      let items = order.items || [];
                      if (!items.length && order.shipping) {
                        try {
                          const shippingData = typeof order.shipping === 'string' ? JSON.parse(order.shipping) : order.shipping;
                      items = shippingData.items || [];
                    } catch (error) {
                                          }
                  }
                  return items.length > 0 ? items.map((item, index) => (
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
                        <h4>{item.name || item.title || 'Unknown Product'}</h4>
                        <p className="item-price">Price: ${item.price || '0.00'}</p>
                        <p className="item-quantity">Quantity: {item.quantity || 0}</p>
                        <p className="item-total">Total: ${((item.price || 0) * (item.quantity || 0)).toFixed(2)}</p>
                      </div>
                    </div>
                  )) : null;
                })()}
              </div>

              {/* Shipping Details */}
              {order.shipping && (
                <div className="order-shipping">
                  <h4>📦 Shipping Details</h4>
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

              {/* Shipping Status */}
              {order.shippingStatus && (
                <div className="order-shipping-status">
                  <h4>🚚 Shipping Status</h4>
                  <p><strong>Status:</strong> {order.shippingStatus}</p>
                  {order.estimatedDeliveryTime && (
                    <p><strong>Estimated Delivery:</strong> {order.estimatedDeliveryTime}</p>
                  )}
                </div>
              )}

              <div className="order-footer">
                <div className="order-total">
                  <span>Total:</span>
                  <strong>${order.total.toFixed(2)}</strong>
                </div>
                <div className="order-actions">
                  <button
                    className="track-order-btn"
                    onClick={() => handleTrackOrder(order)}
                  >
                    Track Order
                  </button>
                  <button
                    className="cancel-order-btn"
                    onClick={() => handleCancelOrder(order.id)}
                  >
                    Cancel
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
          <h3 style={{ color: '#e0e0e0', marginBottom: '20px', marginTop: '30px' }}>🎉 Event Bookings</h3>
          {eventBookings.filter(booking => booking.status !== 'rejected').map((booking, index) => (
            <div key={index} className={`order-card ${booking.status === 'rejected' ? 'rejected' : ''}`} onClick={() => {
              if (booking.status === 'rejected' && booking.rejectionreason) {
                setRejectionReason(booking.rejectionreason);
                setShowRejectionModal(true);
              }
            }}>
              <div className="order-header">
                <div className="order-info">
                  <h3>🎉 Event Booking</h3>
                  <p className="order-date">{formatDate(booking.createdat)}</p>
                </div>
                <div className="order-status">
                  {booking.status === 'rejected' ? (
                    <span className="status-badge rejected-badge">
                      ❌ Cancelled
                    </span>
                  ) : (
                    <span
                      className="status-badge"
                      style={{ backgroundColor: '#9333ea' }}
                    >
                      {booking.status}
                    </span>
                  )}
                </div>
              </div>

              <div className="event-details">
                <h4>📅 Event Information</h4>
                <p><strong>Date & Time:</strong> {formatDate(booking.eventdate)}</p>
                <p><strong>Place:</strong> {booking.eventplace}</p>
                {booking.orderdetails && (
                  <p><strong>Details:</strong> {booking.orderdetails}</p>
                )}
              </div>

              <div className="order-items">
                <h4>📦 Products</h4>
                {booking.products && booking.products.map((product, pIndex) => (
                  <div key={pIndex} className="order-item">
                    <div className="item-image">
                      <img
                        src={product.image || 'https://via.placeholder.com/60x60?text=No+Image'}
                        alt={product.title}
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/60x60?text=No+Image';
                        }}
                      />
                    </div>
                    <div className="item-details">
                      <h5>{product.title}</h5>
                      <p>Price: ${product.price}</p>
                      <p>Quantity: {product.quantity}</p>
                      <p>Total: ${(product.price * product.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="order-details">
                <div className="order-total">
                  <span>Total:</span>
                  <strong>${booking.total.toFixed(2)}</strong>
                </div>
                {booking.status !== 'rejected' && (
                  <button
                    className="cancel-order-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancelEventBooking(index);
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tracking Modal */}
      {showTracking && selectedOrder && (
        <div className="tracking-modal-overlay" onClick={closeTracking}>
          <div className="tracking-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tracking-header">
              <h2>Track Order {selectedOrder.orderNumber}</h2>
              <button className="close-tracking-btn" onClick={closeTracking}>×</button>
            </div>
            
            <div className="tracking-steps">
              {getTrackingSteps(selectedOrder.status, selectedOrder).map((step, index) => (
                <div key={step.id} className={`tracking-step ${step.completed ? 'completed' : ''}`}>
                  <div className="step-number">{step.completed ? '✓' : step.id}</div>
                  <div className="step-content">
                    <h4>{step.title}</h4>
                    <p>{step.description}</p>
                  </div>
                  {index < getTrackingSteps(selectedOrder.status, selectedOrder).length - 1 && (
                    <div className={`step-connector ${step.completed ? 'completed' : ''}`}></div>
                  )}
                </div>
              ))}
            </div>

            <div className="tracking-footer">
              <p>Estimated delivery: {formatDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))}</p>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedProduct && (
        <div className="tracking-modal-overlay" onClick={handleCloseReviewModal}>
          <div className="tracking-modal review-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tracking-header">
              <h2>Rate Product</h2>
              <button className="close-tracking-btn" onClick={handleCloseReviewModal}>×</button>
            </div>

            <form onSubmit={handleSubmitReview} className="edit-order-form">
              <div className="form-group">
                <label>Product</label>
                <p style={{ color: 'rgba(255, 255, 255, 0.8)' }}>{selectedProduct.name || selectedProduct.title}</p>
              </div>

              <div className="form-group">
                <label>Rating</label>
                <select
                  value={reviewData.rating}
                  onChange={(e) => setReviewData({ ...reviewData, rating: parseInt(e.target.value) })}
                  required
                >
                  <option value={5}>⭐⭐⭐⭐⭐ (5)</option>
                  <option value={4}>⭐⭐⭐⭐ (4)</option>
                  <option value={3}>⭐⭐⭐ (3)</option>
                  <option value={2}>⭐⭐ (2)</option>
                  <option value={1}>⭐ (1)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Comment (Optional)</label>
                <textarea
                  value={reviewData.comment}
                  onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                  placeholder="Share your experience with this product..."
                  rows={4}
                  style={{
                    background: '#1a1a2e',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    padding: '10px',
                    color: '#ffffff',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="track-order-btn">Submit Review</button>
                <button
                  type="button"
                  className="cancel-order-btn"
                  onClick={handleCloseReviewModal}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </>
      )}

      {/* Rejected Orders Section */}
      {activeTab === 'rejected' && userOrders.filter(order => order.status === 'rejected').length > 0 && (
        <div className="orders-list">
          <h3 style={{ color: '#e0e0e0', marginBottom: '20px', marginTop: '30px' }}>❌ Rejected Orders</h3>
          {userOrders.filter(order => order.status === 'rejected').map((order) => (
            <div key={order.id} className="order-card rejected-order-card" onClick={() => {
              if (order.rejectionreason) {
                setRejectionReason(order.rejectionreason);
                setShowRejectionModal(true);
              }
            }}>
              <div className="order-header">
                <div className="order-info">
                  <h3>Order #{order.orderNumber || order.id}</h3>
                  <p className="order-date">{formatDate(order.date || order.created_at)}</p>
                </div>
                <div className="order-status">
                  <span className="status-badge rejected-badge">
                    ❌ Rejected
                  </span>
                </div>
              </div>

              {order.rejectionreason && (
                <div className="rejection-info">
                  <p><strong>Reason:</strong> {order.rejectionreason}</p>
                </div>
              )}

              <div className="order-items">
                {(() => {
                  let items = order.items || [];
                  if (!items.length && order.shipping) {
                    try {
                      const shippingData = typeof order.shipping === 'string' ? JSON.parse(order.shipping) : order.shipping;
                      items = shippingData.items || [];
                    } catch (error) {
                                          }
                  }
                  return items.length > 0 ? items.map((item, index) => (
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
                        <h4>{item.name || item.title || 'Unknown Product'}</h4>
                        <p className="item-price">Price: ${item.price || '0.00'}</p>
                        <p className="item-quantity">Quantity: {item.quantity || 0}</p>
                      </div>
                    </div>
                  )) : null;
                })()}
              </div>

              <div className="order-actions">
                <button
                  className="delete-order-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteOrder(order.id);
                  }}
                >
                  Delete Permanently
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rejected Event Bookings Section */}
      {activeTab === 'rejected' && eventBookings.filter(booking => booking.status === 'rejected').length > 0 && (
        <div className="orders-list">
          <h3 style={{ color: '#e0e0e0', marginBottom: '20px', marginTop: '30px' }}>❌ Rejected Event Bookings</h3>
          {eventBookings.filter(booking => booking.status === 'rejected').map((booking, index) => (
            <div key={index} className="order-card rejected-order-card" onClick={() => {
              if (booking.rejectionreason) {
                setRejectionReason(booking.rejectionreason);
                setShowRejectionModal(true);
              }
            }}>
              <div className="order-header">
                <div className="order-info">
                  <h3 style={{ color: '#ffffff' }}>🎉 Event Booking</h3>
                  <p className="order-date">{formatDate(booking.createdat)}</p>
                </div>
                <div className="order-status">
                  <span className="status-badge rejected-badge">
                    ❌ Rejected
                  </span>
                </div>
              </div>

              {booking.rejectionreason && (
                <div className="rejection-info">
                  <p><strong>Reason:</strong> {booking.rejectionreason}</p>
                </div>
              )}

              <div className="event-details">
                <h4>📅 Event Information</h4>
                <p><strong>Date & Time:</strong> {formatDate(booking.eventdate)}</p>
                <p><strong>Place:</strong> {booking.eventplace}</p>
                {booking.orderdetails && (
                  <p><strong>Details:</strong> {booking.orderdetails}</p>
                )}
              </div>

              <div className="order-actions">
                <button
                  className="delete-order-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Delete event booking from localStorage
                    const eventBookings = JSON.parse(localStorage.getItem('eventBookings') || '[]');
                    const updatedBookings = eventBookings.filter((b, i) => i !== index);
                    localStorage.setItem('eventBookings', JSON.stringify(updatedBookings));
                    setEventBookings(updatedBookings);
                    if (showToast && typeof showToast === 'function') {
                      showToast('Event booking deleted successfully', 'success');
                    } else {
                      setAlertModal({ isOpen: true, title: 'Success', message: 'Event booking deleted successfully' });
                    }
                  }}
                >
                  Delete Permanently
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="tracking-modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="tracking-modal review-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tracking-header">
              <h2>Delete Order</h2>
              <button className="close-tracking-btn" onClick={() => setShowDeleteModal(false)}>×</button>
            </div>

            <div className="rejection-content">
              <p>Are you sure you want to permanently delete this order? This action cannot be undone.</p>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="cancel-order-btn"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="track-order-btn"
                onClick={confirmDeleteOrder}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectionModal && (
        <div className="tracking-modal-overlay" onClick={() => setShowRejectionModal(false)}>
          <div className="tracking-modal review-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tracking-header">
              <h2>❌ Order Rejected</h2>
              <button className="close-tracking-btn" onClick={() => setShowRejectionModal(false)}>×</button>
            </div>

            <div className="rejection-content">
              <div className="form-group">
                <label>Reason for Rejection:</label>
                <p className="rejection-reason">{rejectionReason}</p>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="track-order-btn"
                onClick={() => setShowRejectionModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ isOpen: false, title: '', message: '' })}
        title={alertModal.title}
        message={alertModal.message}
        type="alert"
      />

    </div>
  );
}