import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import '../styles/FloatingButtons.css';

// 🆕 Optimized: Memoized to prevent unnecessary re-renders
const FloatingButtons = memo(function FloatingButtons({
  cartItemsCount = 0
}) {
  return (
    <div className="floating-buttons-container">
      {/* Cart Button */}
      <Link to='/cart' className='floating-btn cart-float-btn'>
        <i className="fas fa-shopping-cart"></i>
        {cartItemsCount > 0 && (
          <span className="floating-badge cart-float-badge">{cartItemsCount}</span>
        )}
      </Link>

      {/* Chat Button */}
      <Link to='/chat' className='floating-btn chat-float-btn'>
        <i className="fas fa-comments"></i>
      </Link>
    </div>
  );
});

export default FloatingButtons;
