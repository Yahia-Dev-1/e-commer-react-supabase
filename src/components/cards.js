import React, { useState, useEffect, useMemo } from 'react'
import { useToast } from '../contexts/ToastContext';
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import SEO from './SEO'
import '../styles/cards.css'
import { getReviewsFromSupabase } from '../utils/supabase'

// Function to check if current user is admin
const isCurrentUserAdmin = () => {
  const currentUserEmail = localStorage.getItem('currentUserEmail');
  if (!currentUserEmail) return false;
  
  const adminEmails = JSON.parse(localStorage.getItem('admin_emails') || '[]');
  const defaultAdminEmails = ['yahiapro400@gmail.com'];
  const allAdminEmails = adminEmails.length > 0 ? adminEmails : defaultAdminEmails;
  
  return allAdminEmails.includes(currentUserEmail);
};

// Optimized Card Component with lazy loading images
function Card({ image, title, description, price, quantity, status, onAddToCart, onIncreaseQuantity, onDecreaseQuantity, cartQuantity = 0 }) {
  // Ensure all required properties exist
  const safeTitle = title || 'Untitled Product';
  const safeDescription = description || 'No description available';
  const safePrice = price || '0.00';
  const safeQuantity = typeof quantity === 'number' ? quantity : 0;
  const safeImage = image || 'https://via.placeholder.com/400x400?text=No+Image';
  const safeStatus = status || 'available';

  const handleClick = () => {
    if (safeQuantity > 0 && safeStatus === 'available') {
      onAddToCart();
    }
  }

  const isOutOfStock = safeQuantity <= 0 || safeStatus === 'out_of_stock';
  const isDiscontinued = safeStatus === 'discontinued';
  const isInCart = cartQuantity > 0;
  const isPending = safeStatus === 'pending';
  const isLowStock = safeQuantity > 0 && safeQuantity <= 5;
  const isInStock = safeQuantity > 5 && safeStatus === 'available';
  const isAdmin = isCurrentUserAdmin();

  return (
    <div className={`card ${isOutOfStock || isPending ? 'out-of-stock' : ''}`} style={{ 
      cursor: isOutOfStock || isPending ? 'not-allowed' : 'default',
      opacity: isOutOfStock || isPending ? 0.6 : 1,
      pointerEvents: isOutOfStock || isPending ? 'none' : 'auto'
    }}>
      <div className="card-img">
        <img 
          className="img" 
          src={safeImage} 
          alt={safeTitle}
          loading="lazy"
          style={{ 
            filter: isOutOfStock ? 'grayscale(100%)' : 'none',
          }}
        />
        {isOutOfStock && (
          <div className="out-of-stock-overlay">
            <span>Out of Stock</span>
          </div>
        )}
        {isDiscontinued && (
          <div className="discontinued-overlay">
            <span>Discontinued</span>
          </div>
        )}
        {isPending && (
          <div className="pending-overlay">
            <span>Pending Review</span>
          </div>
        )}
      </div>
      <div className="card-title">{safeTitle}</div>
      <div className="card-subtitle">{safeDescription}</div>
      <div className="quantity-badge-container" style={{ textAlign: 'center', margin: '8px 0' }}>
        <span className={`quantity-badge ${isPending ? 'pending' : isOutOfStock ? 'out-of-stock' : safeQuantity <= 5 ? 'low-stock' : 'in-stock'}`}>
          {isPending ? 'Pending Review' : 
           isDiscontinued ? 'Discontinued' : 
           isOutOfStock ? 'Out of Stock' : 
           isAdmin ? (safeQuantity <= 5 ? `Low (${safeQuantity})` : `${safeQuantity}`) : 
           'In Stock'}
        </span>
      </div>
      <hr className="card-divider"/>
      <div className="card-footer">
        <div className="card-price">
          <span className="currency-symbol">$</span>
          <span className="price-value">{safePrice}</span>
          <div className="price-decoration"></div>
        </div>
        {isInCart ? (
          <div className="quantity-controls">
            <button 
              className="quantity-btn decrease-btn"
              onClick={(e) => {
                e.stopPropagation();
                onDecreaseQuantity();
              }}
            >
              -
            </button>
            <span className="quantity-display">{cartQuantity}</span>
            <button 
              className="quantity-btn increase-btn"
              onClick={(e) => {
                e.stopPropagation();
                onIncreaseQuantity();
              }}
            >
              +
            </button>
          </div>
        ) : (
          <button 
            className="add-to-cart-btn"
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart();
            }}
          >
            Add to Cart
          </button>
        )}
      </div>
    </div>
  )
}

function FilterButton({ category, isActive, onClick }) {
  return (
    <button 
      className={`filter-btn ${isActive ? 'active' : ''}`}
      onClick={() => onClick(category)}
    >
      {category}
    </button>
  )
}

// Main Cards Container Component
export default function Cards({ addToCart, cartItems = [], updateCartItemQuantity, darkMode = false, products = [], productsVersion = 0 }) {
  const showToast = useToast();
  const [activeFilter, setActiveFilter] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [reviews, setReviews] = useState([])

  // Products are now passed from App.js, no need to load from localStorage

  // Load reviews from Supabase
  useEffect(() => {
    const loadReviews = async () => {
      try {
        const reviewsData = await getReviewsFromSupabase(null, 50, 0);
        setReviews(reviewsData);
      } catch (error) {
        console.error('Error loading reviews:', error);
      }
    };
    loadReviews();
  }, []);

  // Get unique categories (memoized)
  const categories = useMemo(() => {
    try {
      const savedCategories = JSON.parse(localStorage.getItem('ecommerce_categories') || '[]');
      if (savedCategories.length === 0) {
        return ['All', ...new Set(products.map(product => product.category))];
      }
      return savedCategories;
    } catch (error) {
      console.error('Error loading categories:', error);
      return ['All', ...new Set(products.map(product => product.category))];
    }
  }, [products])

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        product.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = activeFilter === 'All' || product.category === activeFilter
    return matchesSearch && matchesFilter
  })

  // Handle filter change
  const handleFilterChange = (category) => {
    setActiveFilter(category)
  }

  // Handle add to cart
  const handleAddToCart = (product) => {
    if (addToCart) {
      addToCart(product)
    }
  }

  // Handle increase quantity
  const handleIncreaseQuantity = (productId) => {
    if (updateCartItemQuantity) {
      const cartItem = cartItems.find(item => item.id === productId)
      if (cartItem) {
        updateCartItemQuantity(productId, cartItem.quantity + 1)
      }
    }
  }

  // Handle decrease quantity
  const handleDecreaseQuantity = (productId) => {
    if (updateCartItemQuantity) {
      const cartItem = cartItems.find(item => item.id === productId)
      if (cartItem && cartItem.quantity > 1) {
        updateCartItemQuantity(productId, cartItem.quantity - 1)
      } else if (cartItem && cartItem.quantity === 1) {
        updateCartItemQuantity(productId, 0)
      }
    }
  }

  // Get cart quantity for a product
  const getCartQuantity = (productId) => {
    const cartItem = cartItems.find(item => item.id === productId)
    return cartItem ? cartItem.quantity : 0
  }

  // Function to refresh products (now triggers App.js to reload)
  const refreshProducts = () => {
    console.log('🔄 Cards: Requesting refresh from App.js...')
    window.dispatchEvent(new CustomEvent('productsUpdated'))
  }

  // Function to clear all products from localStorage
  const clearAllProducts = () => {
    if (window.confirm('Are you sure you want to clear all products? This action cannot be undone.')) {
      try {
        localStorage.removeItem('ecommerce_products')
        localStorage.removeItem('has_default_products')
        // Trigger App.js to reload products
        window.dispatchEvent(new CustomEvent('productsUpdated'))
        console.log('🗑️ All products cleared from localStorage')
        showToast('All products have been cleared successfully!', 'success')
      } catch (error) {
        console.error('Error clearing products:', error)
        showToast('Error clearing products', 'error')
      }
    }
  }

  const isAdmin = isCurrentUserAdmin();

  return (
    <>
      <SEO 
        title="E-Commerce Store - Safe and Fast Shopping"
        description="Discover a wide range of clothing, shoes, and accessories in our e-commerce store. Safe and fast shopping with excellent customer service and competitive prices."
        keywords="e-commerce store, clothing, shoes, accessories, online shopping, offers, discounts, hoodie, t-shirt, jeans, running shoes, watch, backpack, cap"
        url="https://yahia-dev-1.github.io/E-Commer-React"
      />
      <div className={`cards-section ${darkMode ? 'dark-mode' : ''}`}>
        {/* Lottie Animation at Top */}
        <div className="lottie-container">
          <DotLottieReact
            src="https://lottie.host/9e31c819-612c-4f38-b3fd-2e53e6a10104/EEfP3i9LcG.lottie"
            loop
            autoplay
          />
        </div>

   
      {/* Search Bar */}
      <div className="search-container">
        <div className="search-box">
          <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button 
              className="clear-search"
              onClick={() => setSearchTerm('')}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="filter-container">
        <h3 className="filter-title">Filter by Category:</h3>
        <div className="filter-buttons">
          {categories.map((category) => (
            <FilterButton
              key={category}
              category={category}
              isActive={activeFilter === category}
              onClick={handleFilterChange}
            />
          ))}
        </div>
        {/* Show products count for regular users */}
        {!isAdmin && (
          <div className="products-count-simple">
            <p>Products Count: {filteredProducts.length}</p>
          </div>
        )}
      </div>

      {/* Products Count and Stock Stats - Only for Admins */}
      {isAdmin && (
        <div className="products-count">
          <div className="count-header">
            <p>Products Count: {filteredProducts.length}</p>
            <button 
              className="refresh-btn"
              onClick={refreshProducts}
              title="Refresh Products"
            >
              🔄 Refresh
            </button>
            <button 
              className="clear-btn"
              onClick={clearAllProducts}
              title="Clear All Products"
            >
              🗑️ Clear All
            </button>
          </div>
          <div className="stock-stats">
            <span className="stat-item in-stock">
              In Stock: {filteredProducts.filter(p => p.quantity > 5).length}
            </span>
            <span className="stat-item low-stock">
              Low Stock: {filteredProducts.filter(p => p.quantity > 0 && p.quantity <= 5).length}
            </span>
            <span className="stat-item out-of-stock">
              Out of Stock: {filteredProducts.filter(p => p.quantity <= 0).length}
            </span>
          </div>
        </div>
      )}

      {/* Products Grid */}
      <div className='cards-container'>
        {filteredProducts.map((product) => (
          <Card 
            key={product.id}
            image={product.image}
            title={product.title}
            status={product.status}
            description={product.description}
            price={product.price}
            quantity={product.quantity}
            cartQuantity={getCartQuantity(product.id)}
            onAddToCart={() => handleAddToCart(product)}
            onIncreaseQuantity={() => handleIncreaseQuantity(product.id)}
            onDecreaseQuantity={() => handleDecreaseQuantity(product.id)}
          />
        ))}
      </div>

      {/* No Products Message */}
      {filteredProducts.length === 0 && (
        <div className="no-products">
          <p>No products found in this category</p>
        </div>
      )}

      {/* Reviews Section */}
      {reviews.length > 0 && (
        <div className="reviews-section">
          <h2 className="reviews-title">Customer Reviews</h2>
          <div className="reviews-container">
            {reviews.map((review) => (
              <div key={review.id} className="review-card">
                <div className="review-header">
                  <div className="review-user">
                    <span className="review-username">{review.username || 'Anonymous'}</span>
                    <div className="review-rating">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={i < review.rating ? 'star filled' : 'star'}>
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="review-date">
                    {new Date(review.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                {review.comment && (
                  <div className="review-comment">
                    <p>{review.comment}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}


    </div>

    </>
  )
}
