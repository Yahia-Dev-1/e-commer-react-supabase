import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import '../styles/EventBooking.css';
import Modal from './Modal';

export default function EventBooking({ darkMode = false, products = [] }) {
  const showToast = useToast();
  const navigate = useNavigate();
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [eventDate, setEventDate] = useState('');
  const [eventPlace, setEventPlace] = useState('');
  const [orderDetails, setOrderDetails] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '' });

  useEffect(() => {
    const currentUserEmail = localStorage.getItem('currentUserEmail');
    if (!currentUserEmail) {
      navigate('/login');
      return;
    }
    setUser({ email: currentUserEmail });
  }, [navigate]);

  const handleProductSelect = (product) => {
    setSelectedProducts(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing) {
        return prev.filter(p => p.id !== product.id);
      } else {
        return [...prev, { ...product, quantity: 1 }];
      }
    });
  };

  const handleQuantityChange = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      setSelectedProducts(prev => prev.filter(p => p.id !== productId));
    } else {
      setSelectedProducts(prev => prev.map(p => 
        p.id === productId ? { ...p, quantity: newQuantity } : p
      ));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedProducts.length === 0) {
      if (showToast && typeof showToast === 'function') {
        showToast('Please select at least one product', 'error');
      } else {
        setAlertModal({ isOpen: true, title: 'Error', message: 'Please select at least one product' });
      }
      return;
    }

    if (!eventDate || !eventPlace) {
      if (showToast && typeof showToast === 'function') {
        showToast('Please fill in event date and place', 'error');
      } else {
        setAlertModal({ isOpen: true, title: 'Error', message: 'Please fill in event date and place' });
      }
      return;
    }

    // Validate date is at least 2 days in the future
    const selectedDate = new Date(eventDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const minDate = new Date(today);
    minDate.setDate(minDate.getDate() + 2);

    if (selectedDate < minDate) {
      if (showToast && typeof showToast === 'function') {
        showToast('Event date must be at least 2 days in the future', 'error');
      } else {
        setAlertModal({ isOpen: true, title: 'Error', message: 'Event date must be at least 2 days in the future' });
      }
      return;
    }

    const eventData = {
      userEmail: user?.email,
      eventDate,
      eventPlace,
      orderDetails,
      products: selectedProducts.map(p => ({
        id: p.id,
        title: p.title,
        price: p.price,
        quantity: p.quantity,
        image: p.image
      })),
      total: selectedProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0),
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    // Save to Supabase
    setLoading(true);
    try {
      const { addEventBookingToSupabase } = await import('../utils/supabase');
      await addEventBookingToSupabase(eventData);

      if (showToast && typeof showToast === 'function') {
        showToast('Event booking submitted successfully!', 'success');
      } else {
        setAlertModal({ isOpen: true, title: 'Success', message: 'Event booking submitted successfully!' });
      }
      
      // Clear form
      setSelectedProducts([]);
      setEventDate('');
      setEventPlace('');
      setOrderDetails('');
      
      // Navigate to home or orders
      navigate('/orders');
    } catch (error) {
      console.error('Error saving event booking to Supabase:', error);
      if (showToast && typeof showToast === 'function') {
        showToast('Failed to submit event booking. Please try again.', 'error');
      } else {
        setAlertModal({ isOpen: true, title: 'Error', message: 'Failed to submit event booking. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className={`event-booking-page ${darkMode ? 'dark-mode' : ''}`}>
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Submitting your event booking...</p>
        </div>
      )}
      <div className="event-booking-container">
        <div className="event-booking-header">
          <h1>🎉 Event Booking</h1>
          <p>Book products for your special event</p>
        </div>

        <form onSubmit={handleSubmit} className="event-booking-form">
          {/* Event Details */}
          <div className="event-details-section">
            <h2>Event Information</h2>
            
            <div className="form-group">
              <label htmlFor="eventDate">Event Date & Time *</label>
              <input
                type="datetime-local"
                id="eventDate"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="eventPlace">Event Place *</label>
              <input
                type="text"
                id="eventPlace"
                value={eventPlace}
                onChange={(e) => setEventPlace(e.target.value)}
                placeholder="Enter event location"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="orderDetails">Order Details</label>
              <textarea
                id="orderDetails"
                value={orderDetails}
                onChange={(e) => setOrderDetails(e.target.value)}
                placeholder="Any special requirements or details"
                rows="3"
              />
            </div>
          </div>

          {/* Product Selection */}
          <div className="product-selection-section">
            <h2>Select Products</h2>
            
            <div className="products-grid">
              {products.map(product => (
                <div 
                  key={product.id} 
                  className={`product-card ${selectedProducts.find(p => p.id === product.id) ? 'selected' : ''}`}
                  onClick={() => handleProductSelect(product)}
                >
                  <img src={product.image} alt={product.title} />
                  <h3>{product.title}</h3>
                  <p className="price">${product.price}</p>
                  
                  {selectedProducts.find(p => p.id === product.id) && (
                    <div className="quantity-control">
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const item = selectedProducts.find(p => p.id === product.id);
                          handleQuantityChange(product.id, item.quantity - 1);
                        }}
                      >
                        -
                      </button>
                      <span>{selectedProducts.find(p => p.id === product.id)?.quantity || 1}</span>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const item = selectedProducts.find(p => p.id === product.id);
                          handleQuantityChange(product.id, (item?.quantity || 0) + 1);
                        }}
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Selected Products Summary */}
          {selectedProducts.length > 0 && (
            <div className="selected-products-summary">
              <h3>Selected Products</h3>
              <ul>
                {selectedProducts.map(p => (
                  <li key={p.id}>
                    {p.title} x {p.quantity} - ${p.price * p.quantity}
                  </li>
                ))}
              </ul>
              <p className="total">
                Total: ${selectedProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0)}
              </p>
            </div>
          )}

          <div className="form-actions">
            <button 
              type="button" 
              className="back-btn"
              onClick={() => navigate('/')}
            >
              ← Back to Home
            </button>
            <button type="submit" className="submit-btn">
              Submit Booking
            </button>
          </div>
        </form>
      </div>

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
