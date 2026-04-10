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
            
            {/* Admin Links - Only for specific admin accounts */}
            {['yahiapro400@gmail.com', 'yahiacool2009@gmail.com'].includes(user.email) && (
              <>
                <Link to='/admin' onClick={closeMenu} className="admin-link">Admin</Link>
                <Link to='/add-products' onClick={closeMenu} className="admin-link">Add Products</Link>
                <Link to='/order-management' onClick={closeMenu} className="admin-link">Order Management</Link>
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
      <Link to='/' className={`nav-brand ${user && ['yahiapro400@gmail.com', 'yahiacool2009@gmail.com'].includes(user.email) ? 'admin-brand' : ''}`} onClick={closeMenu}>
        <img 
          src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cdefs%3E%3ClinearGradient id='grad1' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23667eea'/%3E%3Cstop offset='100%25' style='stop-color:%23764ba2'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100' height='100' rx='15' fill='url(%23grad1)'/%3E%3Ctext x='50' y='55' font-size='45' font-weight='bold' text-anchor='middle' fill='white'%3EEC%3C/text%3E%3C/svg%3E"
          alt="Logo" 
          className="nav-logo"
        />
        <span className={`nav-brand-text ${user && ['yahiapro400@gmail.com', 'yahiacool2009@gmail.com'].includes(user.email) ? 'admin-text' : ''}`}>
          Store
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
