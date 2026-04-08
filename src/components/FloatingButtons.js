import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/FloatingButtons.css';

export default function FloatingButtons({ 
  cartItemsCount = 0, 
  unreadNotifications = 0, 
  onNotificationClick 
}) {
  return (
    <div className="floating-buttons-container">
      {/* Cart Button */}
      <Link to='/cart' className='floating-btn cart-float-btn'>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
          <path d="m397.78 316h-205.13a15 15 0 0 1 -14.65-11.67l-34.54-150.48a15 15 0 0 1 14.62-18.36h274.27a15 15 0 0 1 14.65 18.36l-34.6 150.48a15 15 0 0 1 -14.62 11.67zm-193.19-30h181.25l27.67-120.48h-236.6z"></path>
          <path d="m222 450a57.48 57.48 0 1 1 57.48-57.48 57.54 57.54 0 0 1 -57.48 57.48zm0-84.95a27.48 27.48 0 1 0 27.48 27.47 27.5 27.5 0 0 0 -27.48-27.47z"></path>
          <path d="m368.42 450a57.48 57.48 0 1 1 57.48-57.48 57.54 57.54 0 0 1 -57.48 57.48zm0-84.95a27.48 27.48 0 1 0 27.48 27.47 27.5 27.5 0 0 0 -27.48-27.47z"></path>
          <path d="m158.08 165.49a15 15 0 0 1 -14.23-10.26l-25.71-77.23h-47.44a15 15 0 1 1 0-30h58.3a15 15 0 0 1 14.23 10.26l29.13 87.49a15 15 0 0 1 -14.23 19.74z"></path>
        </svg>
        {cartItemsCount > 0 && (
          <span className="floating-badge cart-float-badge">{cartItemsCount}</span>
        )}
      </Link>

      {/* Notifications Button */}
      <button 
        className='floating-btn notification-float-btn' 
        onClick={onNotificationClick}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        {unreadNotifications > 0 && (
          <span className="floating-badge notification-float-badge">{unreadNotifications}</span>
        )}
      </button>
    </div>
  );
}
