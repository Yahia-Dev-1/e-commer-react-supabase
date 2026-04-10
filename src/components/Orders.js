import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Orders.css';
import { useToast } from '../contexts/ToastContext';
import database from '../utils/database';
import { updateProductInSupabase, getOrdersFromSupabase, subscribeToOrders, restoreProductQuantities, addReviewToSupabase } from '../utils/supabase';


export default function Orders({ user, orders = [] }) {
  const showToast = useToast();
  const [loading, setLoading] = useState(true);
  const [showTracking, setShowTracking] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [userOrders, setUserOrders] = useState([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [reviewData, setReviewData] = useState({ rating: 5, comment: '' });

  useEffect(() => {
    const loadOrders = async () => {
      if (user) {
        try {
          // Get orders from Supabase
          const { data: allOrders } = await getOrdersFromSupabase(100, 0);
          console.log('=== ORDERS FROM SUPABASE (USER PAGE) ===');
          console.log('📥 Orders loaded from Supabase:', allOrders.length);
          console.log('All orders data:', allOrders);
          
          // Show all orders (no filtering since userEmail not in database)
          setUserOrders(allOrders || []);
        } catch (error) {
          console.log('=== ERROR LOADING ORDERS (USER PAGE) ===');
          console.log('Using localStorage orders:', error.message);
          console.log('Error:', error);
          // Fallback to localStorage
          const orders = database.getUserOrders(user.id);
          setUserOrders(orders);
        }
      }
      setLoading(false);
    };
    
    loadOrders();

    // Real-time subscription for orders
    const unsubscribe = subscribeToOrders((supabaseOrders) => {
      if (!user) return;
      
      console.log('🔄 Orders updated from Supabase:', supabaseOrders.length);
      
      // Show all orders (no filtering since userEmail not in database)
      setUserOrders(supabaseOrders || []);
    });

    return () => unsubscribe();
  }, [user]);

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

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    try {
      await addReviewToSupabase({
        productId: selectedProduct.id,
        userId: user?.id,
        userName: user?.email || 'Anonymous',
        rating: reviewData.rating,
        comment: reviewData.comment
      });
      showToast('✅ Review submitted successfully', 'success');
      handleCloseReviewModal();
    } catch (error) {
      console.error('Error submitting review:', error);
      showToast('❌ Failed to submit review', 'error');
    }
  };

  // 🆕 Function to cancel order for user
  const cancelOrder = async (orderId) => {
    const orderToCancel = userOrders.find(order => order.id === orderId);
    if (!orderToCancel) return;

    // Only orders in Processing status can be cancelled
    if (orderToCancel.status !== 'Processing') {
      showToast('❌ You can only cancel orders that are still being processed.', 'error');
      return;
    }

    if (window.confirm('Are you sure you want to cancel this order?')) {
      // Restore product quantities
      await restoreProductQuantities(orderToCancel);

      // Update local state
      setUserOrders(prev => prev.filter(o => o.id !== orderId));

      showToast('✅ Order cancelled successfully. Products returned to stock.', 'success');
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
        <p>Welcome back, {user?.name || 'User'}!</p>
      </div>

      {userOrders.length === 0 ? (
        <div className="no-orders">
          <div className="no-orders-icon">📦</div>
          <h3>No Orders Yet</h3>
          <p>You haven't placed any orders yet. Start shopping to see your orders here!</p>
          <Link to="/" className="start-shopping-btn">Start Shopping</Link>
        </div>
      ) : (
        <div className="orders-list">
          {userOrders.map((order) => (
            <div key={order.id} className="order-card">
              <div className="order-header">
                <div className="order-info">
                  <h3>{order.orderNumber}</h3>
                  <p className="order-date">{formatDate(order.date)}</p>
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

              <div className="order-items">
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
                  {order.status === 'Processing' && (
                    <button
                      className="cancel-order-btn"
                      onClick={() => cancelOrder(order.id)}
                    >
                      Cancel Order
                    </button>
                  )}
                  {order.status === 'Delivered' && (() => {
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
                      <button
                        className="track-order-btn"
                        onClick={() => handleOpenReviewModal(items[0])}
                      >
                        Rate Product
                      </button>
                    ) : null;
                  })()}
                </div>
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
          <div className="tracking-modal" onClick={(e) => e.stopPropagation()}>
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


    </div>
  );
} 