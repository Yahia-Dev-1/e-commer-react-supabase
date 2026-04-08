import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import '../styles/nav.css'
import '../styles/cart.css'
import Notifications from './Notifications'

export default function Nav({ cartItemsCount = 0, user = null, onLogout = null, darkMode = false, toggleDarkMode = null }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isCountUpdated, setIsCountUpdated] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const prevCountRef = useRef(cartItemsCount)
  

  


  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  const closeNotifications = () => {
    setShowNotifications(false)
  }

  // Handle count animation
  useEffect(() => {
    if (cartItemsCount !== prevCountRef.current) {
      setIsCountUpdated(true)
      setTimeout(() => setIsCountUpdated(false), 500)
    }
    prevCountRef.current = cartItemsCount
  }, [cartItemsCount])

  // Load unread notifications
  useEffect(() => {
    const loadUnreadNotifications = () => {
      if (user) {
        const allNotifications = JSON.parse(localStorage.getItem('order_notifications') || '[]')
        const userNotifications = allNotifications.filter(notification => 
          notification.userEmail === user.email && !notification.read
        )
        setUnreadNotifications(userNotifications.length)
      }
    }

    loadUnreadNotifications()
    // Check for new notifications every 30 seconds
    const interval = setInterval(loadUnreadNotifications, 30000)
    return () => clearInterval(interval)
  }, [user])

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showNotifications && !event.target.closest('.notifications-panel') && !event.target.closest('.notifications-btn')) {
        setShowNotifications(false)
      }
    }

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showNotifications])

  return (
    <div className='nav-container'>
      {/* Navigation Overlay */}
      {isMenuOpen && <div className="nav-overlay active" onClick={closeMenu}></div>}
      
      <div className='hamburger-menu' onClick={toggleMenu}>
        {isMenuOpen ? (
          <div className="close-icon">×</div>
        ) : (
          <>
            <div className={`hamburger-line ${isMenuOpen ? 'open' : ''}`}></div>
            <div className={`hamburger-line ${isMenuOpen ? 'open' : ''}`}></div>
            <div className={`hamburger-line ${isMenuOpen ? 'open' : ''}`}></div>
          </>
        )}
      </div>
      
      <div className={`nav-links ${isMenuOpen ? 'nav-open' : ''}`}>
        {/* Main Navigation Links */}
        <Link to='/' onClick={closeMenu}>Home</Link>
        <Link to='/about' onClick={closeMenu}>About</Link>  
        <Link to='/services' onClick={closeMenu}>Services</Link>
        
        {/* User-specific Links */}
        {user ? (
          <>
            <Link to='/orders' onClick={closeMenu}>My Orders</Link>
            
            {/* Cart Link */}
            <Link to='/cart' className='cart-nav-link' onClick={closeMenu}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="m397.78 316h-205.13a15 15 0 0 1 -14.65-11.67l-34.54-150.48a15 15 0 0 1 14.62-18.36h274.27a15 15 0 0 1 14.65 18.36l-34.6 150.48a15 15 0 0 1 -14.62 11.67zm-193.19-30h181.25l27.67-120.48h-236.6z"></path><path d="m222 450a57.48 57.48 0 1 1 57.48-57.48 57.54 57.54 0 0 1 -57.48 57.48zm0-84.95a27.48 27.48 0 1 0 27.48 27.47 27.5 27.5 0 0 0 -27.48-27.47z"></path><path d="m368.42 450a57.48 57.48 0 1 1 57.48-57.48 57.54 57.54 0 0 1 -57.48 57.48zm0-84.95a27.48 27.48 0 1 0 27.48 27.47 27.5 27.5 0 0 0 -27.48-27.47z"></path><path d="m158.08 165.49a15 15 0 0 1 -14.23-10.26l-25.71-77.23h-47.44a15 15 0 1 1 0-30h58.3a15 15 0 0 1 14.23 10.26l29.13 87.49a15 15 0 0 1 -14.23 19.74z"></path></svg>
              <span className={`cart-count ${isCountUpdated ? 'updated' : ''}`}>{cartItemsCount}</span>
            </Link>
            
            {/* Notifications Button */}
            <button 
              className='notifications-btn' 
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              {unreadNotifications > 0 && (
                <span className="notification-badge">{unreadNotifications}</span>
              )}
            </button>
            
            {/* Admin Links - Only for specific admin accounts */}
            {['yahiapro400@gmail.com', 'yahiacool2009@gmail.com', 'admin-test@gmail.com', 'admin@gmail.com'].includes(user.email) && (
              <>
                <Link to='/admin' onClick={closeMenu} className="admin-link">Admin</Link>
                <Link to='/add-products' onClick={closeMenu} className="admin-link">Add Products</Link>
              </>
            )}
            
            {/* User Actions */}
            <button className="logout-btn" onClick={() => { onLogout(); closeMenu(); }}>
              Logout ({user.name})
            </button>
          </>
        ) : (
          <Link to='/login' onClick={closeMenu}>Login</Link>
        )}
        
        {/* Dark Mode Toggle - Removed */}
      </div>
      
      {/* Brand/Logo - Right Side */}
      <Link to='/' className={`nav-brand ${user && ['yahiapro400@gmail.com', 'yahiacool2009@gmail.com', 'admin-test@gmail.com', 'admin@gmail.com'].includes(user.email) ? 'admin-brand' : ''}`} onClick={closeMenu}>
        <img 
          src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23667eea'/%3E%3Ctext x='50' y='50' font-size='40' text-anchor='middle' fill='white' dy='.3em'%3EYS%3C/text%3E%3C/svg%3E"
          alt="Yahia Store Logo" 
          className="nav-logo"
        />
        <span className={`nav-brand-text ${user && ['yahiapro400@gmail.com', 'yahiacool2009@gmail.com', 'admin-test@gmail.com', 'admin@gmail.com'].includes(user.email) ? 'admin-text' : ''}`}>
          Yahia Store
        </span>
      </Link>
       
      {/* Notifications Panel */}
        {showNotifications && user && (
          <>
            <div className="notifications-overlay" onClick={closeNotifications}></div>
            <div className="notifications-panel">
              <button className="notifications-close-btn" onClick={closeNotifications}>
                ×
              </button>
              <Notifications onNotificationsUpdate={() => {
                // Update unread count when notifications are updated
                const allNotifications = JSON.parse(localStorage.getItem('order_notifications') || '[]')
                const userNotifications = allNotifications.filter(notification => 
                  notification.userEmail === user.email && !notification.read
                )
                setUnreadNotifications(userNotifications.length)
              }} darkMode={darkMode} />
            </div>
          </>
        )}
    </div>
  )
}
