import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Orders.css';
import { useToast } from '../contexts/ToastContext';
import database from '../utils/database';
import { updateProductInSupabase, getOrdersFromSupabase, subscribeToOrders, getOrdersByUser } from '../utils/supabase';


export default function Orders({ user, orders = [], darkMode = false }) {
  const showToast = useToast();
  const [loading, setLoading] = useState(true);
  const [showTracking, setShowTracking] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [userOrders, setUserOrders] = useState([]);

  useEffect(() => {
    const loadOrders = async () => {
      if (user) {
        try {
          // Get orders from Supabase filtered by user email
          const userEmail = user.email || localStorage.getItem('currentUserEmail') || localStorage.getItem('loggedInUser');
          if (userEmail) {
            const orders = await getOrdersByUser(userEmail);
            console.log('=== ORDERS FROM SUPABASE (USER PAGE) ===');
            console.log('📥 Orders loaded from Supabase:', orders.length);
            console.log('All orders data:', orders);
            setUserOrders(orders || []);
          } else {
            // Fallback to all orders if no email
            const { data: allOrders } = await getOrdersFromSupabase(100, 0);
            setUserOrders(allOrders || []);
          }
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
      
      // Filter by user email
      const userEmail = user.email || localStorage.getItem('currentUserEmail') || localStorage.getItem('loggedInUser');
      if (userEmail) {
        const userSpecificOrders = supabaseOrders.filter(order => order.user_email === userEmail);
        setUserOrders(userSpecificOrders || []);
      } else {
        setUserOrders(supabaseOrders || []);
      }
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
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleTrackOrder = (order) => {
    setSelectedOrder(order);
    setShowTracking(true);
  };

  const closeTracking = () => {
    setShowTracking(false);
    setSelectedOrder(null);
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
      // 1. Return quantities to stock
      for (const item of orderToCancel.items || []) {
        try {
          const existingProducts = JSON.parse(localStorage.getItem('ecommerce_products') || '[]');
          const productIndex = existingProducts.findIndex(p => p.id === item.id);
          
          if (productIndex !== -1) {
            const currentQty = existingProducts[productIndex].quantity || 0;
            existingProducts[productIndex].quantity = currentQty + (item.quantity || 1);
            localStorage.setItem('ecommerce_products', JSON.stringify(existingProducts));
            
            // Update Supabase
            await updateProductInSupabase(item.id, { quantity: existingProducts[productIndex].quantity });
          }
        } catch (error) {
          console.warn('Could not restore quantity for item:', item.id, error.message);
        }
      }

      // 2. Delete order from localStorage
      const allOrders = JSON.parse(localStorage.getItem('ecommerce_orders') || '[]');
      const updatedOrders = allOrders.filter(o => o.id !== orderId);
      localStorage.setItem('ecommerce_orders', JSON.stringify(updatedOrders));

      // 3. Update local state
      setUserOrders(prev => prev.filter(o => o.id !== orderId));

      showToast('✅ Order cancelled successfully. Products returned to stock.', 'success');
    }
  };

  const getTrackingSteps = (status, order) => {
    const steps = [
      { id: 1, title: 'Order Placed', description: 'Your order has been received', completed: true },
      { id: 2, title: 'Pending Approval', description: 'Waiting for admin approval', completed: status === 'approved' || status === 'Processing' || status === 'Preparing' || status === 'Shipped' || status === 'Delivered' },
      { id: 3, title: 'Processing', description: 'We are preparing your order', completed: status === 'Processing' || status === 'Preparing' || status === 'Shipped' || status === 'Delivered' },
      { id: 4, title: 'Preparing', description: order?.preparation_start_date && order?.preparation_end_date 
        ? `Preparing from ${formatDate(order.preparation_start_date)} to ${formatDate(order.preparation_end_date)}`
        : 'Your items are being prepared', 
        completed: status === 'Preparing' || status === 'Shipped' || status === 'Delivered' },
      { id: 5, title: 'Shipped', description: order?.shipping_start_date && order?.shipping_end_date 
        ? `Shipping from ${formatDate(order.shipping_start_date)} to ${formatDate(order.shipping_end_date)}`
        : 'Your order is on its way', 
        completed: status === 'Shipped' || status === 'Delivered' },
      { id: 6, title: 'Delivered', description: order?.estimated_delivery_date 
        ? `Expected delivery by ${formatDate(order.estimated_delivery_date)}`
        : 'Your order has been delivered', 
        completed: status === 'Delivered' }
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
    <div className={`orders-container ${darkMode ? 'dark-mode' : ''}`}>
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
                  <h3>Order #{order.orderNumber}</h3>
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
                {order.items && order.items.map((item, index) => (
                  <div key={index} className="order-item">
                    <div className="item-image">
                      <img src={item.image} alt={item.name} />
                    </div>
                    <div className="item-details">
                      <h4>{item.name}</h4>
                      <p className="item-price">${item.price}</p>
                      <p className="item-quantity">Quantity: {item.quantity}</p>
                      <p className="item-total">Total: ${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
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
              <h2>Track Order #{selectedOrder.orderNumber}</h2>
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
              <p>Estimated delivery: {selectedOrder?.estimated_delivery_date ? formatDate(selectedOrder.estimated_delivery_date) : formatDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))}</p>
              {selectedOrder?.shipping_location && (
                <p>Shipping from: {selectedOrder.shipping_location}</p>
              )}
            </div>
          </div>
        </div>
      )}
      
      
    </div>
  );
} 