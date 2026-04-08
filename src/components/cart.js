import React, { useState,useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import '../styles/cart.css'

export default function Cart({ cartItems, updateQuantity, clearCart, createOrder, darkMode = false, products = [] }) {
  const navigate = useNavigate()
  const [showAnimation, setShowAnimation] = useState(false)
  const [showShippingForm, setShowShippingForm] = useState(false)
  const [shippingData, setShippingData] = useState({
    fullName: '',
    phone: '',
    governorate: '',
    city: '',
    street: '',
    building: '',
    addressInCountry: '',
    additionalInfo: ''
  })
  // Check cart items against Supabase products (real-time stock)
  useEffect(() => {
    cartItems.forEach(item => {
      const product = products.find(p => p.id === item.id);
      // If product not found in Supabase or quantity is 0, remove from cart
      if (!product || product.quantity === 0) {
        updateQuantity(item.id, 0);
      } else if (item.quantity > product.quantity) {
        // If cart quantity exceeds available stock, adjust it
        updateQuantity(item.id, product.quantity);
      }
    });
  }, [cartItems, updateQuantity, products]);



  // دالة للتحقق من الكمية المتاحة (from Supabase products)
  const checkAvailableQuantity = (itemId, requestedQuantity) => {
    try {
      // First check Supabase products (real-time)
      const product = products.find(p => p.id === itemId)
      if (product) {
        return Math.min(requestedQuantity || 1, product.quantity || 0)
      }
      
      // Fallback to localStorage if not in Supabase yet
      const existingProducts = JSON.parse(localStorage.getItem('ecommerce_products') || '[]')
      const localProduct = existingProducts.find(p => p.id === itemId)
      if (localProduct) {
        return Math.min(requestedQuantity || 1, localProduct.quantity || 0)
      }
      
      return 0
    } catch (error) {
      console.error('Error checking available quantity:', error)
      return 0
    }
  }

  // دالة محدثة لتحديث الكمية مع التحقق من المتاح
  const handleQuantityUpdate = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      updateQuantity(itemId, 0)
      return
    }
    
    const availableQuantity = checkAvailableQuantity(itemId, newQuantity)
    if (availableQuantity < newQuantity) {
      alert(`Sorry, only ${availableQuantity} items available for this product.`)
      updateQuantity(itemId, availableQuantity)
    } else {
      updateQuantity(itemId, newQuantity)
    }
  }

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      return total + (parseFloat(item.price) * item.quantity)
    }, 0).toFixed(2)
  }

  const handleCheckout = () => {
    setShowShippingForm(true)
  }

  const handleShippingSubmit = (e) => {
    e.preventDefault()
    setShowAnimation(true)
    setTimeout(() => {
      createOrder(shippingData) // Pass shipping data to createOrder
      setShowAnimation(false)
      navigate('/') // Navigate to home page after order confirmation
    }, 3000) // Show animation for 3 seconds
  }

  const handleInputChange = (e) => {
    setShippingData({
      ...shippingData,
      [e.target.name]: e.target.value
    })
  }

  if (showAnimation) {
    return (
      <div className="checkout-animation">
        <div className="animation-container">
          <DotLottieReact
            src="https://lottie.host/88b8c6eb-8d1e-40f5-a584-b70d6400a4ec/47p7hcqPIB.lottie"
            loop
            autoplay
          />
          <h2>Processing Your Order...</h2>
          <p>Thank you for your purchase!</p>
        </div>
      </div>
    )
  }

  if (showShippingForm) {
    return (
      <div className={`shipping-form-container ${darkMode ? 'dark-mode' : ''}`}>
        <div className="shipping-form">
          <div className="form-header">
            <h2>📦 Shipping Information</h2>
            <p>Please provide your delivery details</p>
          </div>
          
          <form onSubmit={handleShippingSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="fullName">Full Name *</label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={shippingData.fullName}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter your full name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="phone">Phone Number *</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={shippingData.phone}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter your phone number"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="governorate">Governorate *</label>
                <select
                  id="governorate"
                  name="governorate"
                  value={shippingData.governorate}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Governorate</option>
                  <option value="Cairo">Cairo</option>
                  <option value="Giza">Giza</option>
                  <option value="Alexandria">Alexandria</option>
                  <option value="Dakahlia">Dakahlia</option>
                  <option value="Red Sea">Red Sea</option>
                  <option value="Beheira">Beheira</option>
                  <option value="Fayoum">Fayoum</option>
                  <option value="Gharbiya">Gharbiya</option>
                  <option value="Ismailia">Ismailia</option>
                  <option value="Menofia">Menofia</option>
                  <option value="Minya">Minya</option>
                  <option value="Qaliubiya">Qaliubiya</option>
                  <option value="New Valley">New Valley</option>
                  <option value="Suez">Suez</option>
                  <option value="Aswan">Aswan</option>
                  <option value="Assiut">Assiut</option>
                  <option value="Beni Suef">Beni Suef</option>
                  <option value="Port Said">Port Said</option>
                  <option value="Damietta">Damietta</option>
                  <option value="Sharkia">Sharkia</option>
                  <option value="South Sinai">South Sinai</option>
                  <option value="Kafr Al sheikh">Kafr Al sheikh</option>
                  <option value="Matrouh">Matrouh</option>
                  <option value="Luxor">Luxor</option>
                  <option value="Qena">Qena</option>
                  <option value="North Sinai">North Sinai</option>
                  <option value="Sohag">Sohag</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="city">City *</label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={shippingData.city}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter your city"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="street">Street Address *</label>
                <input
                  type="text"
                  id="street"
                  name="street"
                  value={shippingData.street}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter street name and number"
                />
              </div>
            </div>

                         <div className="form-row">
               <div className="form-group">
                 <label htmlFor="building">Building/Block *</label>
                 <input
                   type="text"
                   id="building"
                   name="building"
                   value={shippingData.building}
                   onChange={handleInputChange}
                   required
                   placeholder="Enter building or block number"
                 />
               </div>
               <div className="form-group">
                 <label htmlFor="addressInCountry">Address Inside Country *</label>
                 <input
                   type="text"
                   id="addressInCountry"
                   name="addressInCountry"
                   value={shippingData.addressInCountry}
                   onChange={handleInputChange}
                   required
                   placeholder="Enter detailed address inside the country"
                 />
               </div>
             </div>

            <div className="form-group">
              <label htmlFor="additionalInfo">Additional Information</label>
              <textarea
                id="additionalInfo"
                name="additionalInfo"
                value={shippingData.additionalInfo}
                onChange={handleInputChange}
                placeholder="Any additional delivery instructions (optional)"
                rows="3"
              />
            </div>

            <div className="form-actions">
              <button 
                type="button" 
                className="back-btn"
                onClick={() => setShowShippingForm(false)}
              >
                ← Back to Cart
              </button>
              <button type="submit" className="submit-btn">
                Confirm Order - ${calculateTotal()}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className={`cart-page ${darkMode ? 'dark-mode' : ''}`}>
      <div className="cart-header">
        <h1>🛒 Shopping Cart</h1>
        <Link to="/" className="continue-shopping">
          ← Continue Shopping
        </Link>
      </div>

      {cartItems.length === 0 ? (
        <div className="empty-cart">
          <h2>Your cart is empty</h2>
          <p>Add some products to get started!</p>
          <Link to="/" className="shop-now-btn">
            Shop Now
          </Link>
        </div>
      ) : (
        <div className="cart-content">
          <div className="cart-items">
            {cartItems.map((item) => (
              <div key={item.id} className="cart-item">
                <div className="item-image">
                  <img src={item.image} alt={item.title} />
                </div>
                <div className="item-details">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  <div className="item-price">${item.price}</div>
                  <div className="item-availability">
                    <span className={`availability-badge ${checkAvailableQuantity(item.id) > 0 ? 'in-stock' : 'out-of-stock'}`}>
                      {checkAvailableQuantity(item.id) > 0 ? `${checkAvailableQuantity(item.id)} Available` : ''}
                    </span>
                  </div>
                </div>
                <div className="item-quantity">
                  <button 
                    onClick={() => handleQuantityUpdate(item.id, item.quantity - 1)}
                    className="quantity-btn"
                  >
                    -
                  </button>
                  <span className="quantity">{item.quantity}</span>
                  <button 
                    onClick={() => handleQuantityUpdate(item.id, item.quantity + 1)}
                    className="quantity-btn"
                  >
                    +
                  </button>
                </div>
                <div className="item-total">
                  ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                </div>
                <button 
                  onClick={() => updateQuantity(item.id, 0)}
                  className="remove-btn"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <h3>Order Summary</h3>
            <div className="summary-item">
              <span>Subtotal:</span>
              <span>${calculateTotal()}</span>
            </div>
            <div className="summary-item">
              <span>Shipping:</span>
              <span>Free</span>
            </div>
            <div className="summary-item total">
              <span>Total:</span>
              <span>${calculateTotal()}</span>
            </div>
            <button onClick={handleCheckout} className="checkout-btn">
              Proceed to Checkout
            </button>
          </div>
        </div>
      )}
    </div>
  )
}   