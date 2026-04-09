import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Orders.css';
import database from '../utils/database';
import { updateProductInSupabase, getOrdersFromSupabase, subscribeToOrders } from '../utils/supabase';


export default function Orders({ user, orders = [], darkMode = false }) {
  const [loading, setLoading] = useState(true);
  const [showTracking, setShowTracking] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [userOrders, setUserOrders] = useState([]);

  useEffect(() => {
    const loadOrders = async () => {
      if (user) {
        try {
          // Get orders from Supabase
          const { data: allOrders } = await getOrdersFromSupabase(100, 0);
          console.log('=== ORDERS FROM SUPABASE (USER PAGE) ===');
          console.log('📥 Orders loaded from Supabase:', allOrders.length);
          console.log('All orders data:', allOrders);
          
          // Filter orders for current user (by userEmail)
          const currentUserEmail = localStorage.getItem('currentUserEmail') || user.email;
          console.log('Current user email:', currentUserEmail);
          
          const filteredOrders = allOrders.filter(order => 
            order.userEmail === currentUserEmail
          );
          
          console.log('📦 User orders:', filteredOrders.length);
          console.log('Filtered orders:', filteredOrders);
          setUserOrders(filteredOrders);
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
      
      // Filter orders for current user (by userEmail)
      const currentUserEmail = localStorage.getItem('currentUserEmail') || user.email;
      const filteredOrders = supabaseOrders.filter(order => 
        order.userEmail === currentUserEmail
      );
      
      console.log('📦 User orders updated:', filteredOrders.length);
      setUserOrders(filteredOrders || []);
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

  // 🆕 دالة إلغاء الطلب للمستخدم
  const cancelOrder = async (orderId) => {
    const orderToCancel = userOrders.find(order => order.id === orderId);
    if (!orderToCancel) return;

    // فقط الطلبات في حالة Processing ممكن تتCancel
    if (orderToCancel.status !== 'Processing') {
      alert('❌ You can only cancel orders that are still being processed.');
      return;
    }

    if (window.confirm('Are you sure you want to cancel this order?')) {
      // 1. إرجاع الكميات للمخزون
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

      // 2. حذف الطلب من localStorage
      const allOrders = JSON.parse(localStorage.getItem('ecommerce_orders') || '[]');
      const updatedOrders = allOrders.filter(o => o.id !== orderId);
      localStorage.setItem('ecommerce_orders', JSON.stringify(updatedOrders));

      // 3. Update local state
      setUserOrders(prev => prev.filter(o => o.id !== orderId));

      alert('✅ Order cancelled successfully. Products returned to stock.');
    }
  };

  const getTrackingSteps = (status) => {
    const steps = [
      { id: 1, title: 'Order Placed', description: 'Your order has been received', completed: true },
      { id: 2, title: 'Processing', description: 'We are preparing your order', completed: status === 'Processing' || status === 'Preparing' || status === 'Shipped' || status === 'Delivered' },
      { id: 3, title: 'Preparing', description: 'Your items are being prepared', completed: status === 'Preparing' || status === 'Shipped' || status === 'Delivered' },
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
                {order.items.map((item, index) => (
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
              {getTrackingSteps(selectedOrder.status).map((step, index) => (
                <div key={step.id} className={`tracking-step ${step.completed ? 'completed' : ''}`}>
                  <div className="step-number">{step.completed ? '✓' : step.id}</div>
                  <div className="step-content">
                    <h4>{step.title}</h4>
                    <p>{step.description}</p>
                  </div>
                  {index < getTrackingSteps(selectedOrder.status).length - 1 && (
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
      
      
    </div>
  );
} 