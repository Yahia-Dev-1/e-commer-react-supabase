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
    const loadUnreadNotifications = async () => {
      if (user) {
        try {
          const { getNotificationsForUser } = await import('../utils/supabase');
          const userNotifications = await getNotificationsForUser(user.email);
          const unreadCount = userNotifications.filter(n => !n.read).length;
          setUnreadNotifications(unreadCount);
        } catch (error) {
          console.error('Error loading notifications from Supabase:', error);
        }
      }
    }
    
    loadUnreadNotifications()
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
            <Link to='/event-booking' onClick={closeMenu}>🎉 Event Booking</Link>

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

      {/* Notifications Panel */}
        {showNotifications && user && (
          <>
            <div className="notifications-overlay" onClick={closeNotifications}></div>
            <div className="notifications-panel">
              <button className="notifications-close-btn" onClick={closeNotifications}>
                ×
              </button>
              <Notifications userEmail={user.email} onNotificationsUpdate={async () => {
                // Update unread count when notifications are updated
                try {
                  const { getNotificationsForUser } = await import('../utils/supabase');
                  const userNotifications = await getNotificationsForUser(user.email);
                  const unreadCount = userNotifications.filter(n => !n.read).length;
                  setUnreadNotifications(unreadCount);
                } catch (error) {
                  console.error('Error updating notifications count:', error);
                }
              }} darkMode={darkMode} />
            </div>
          </>
        )}
    </div>
  )
}
