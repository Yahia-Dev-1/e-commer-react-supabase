import './styles/App.css';
import Nav from './components/nav';
import Cart from './components/cart';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async';
import { useState, useEffect, Suspense, lazy } from 'react'
import database from './utils/database'
import { subscribeToProducts, subscribeToOrders, getOrdersFromSupabase, addOrderToSupabase, updateProductInSupabase } from './utils/supabase'
import React from 'react';
// import { ProductsProvider } from './context/ProductsContext';

// Lazy load components for better performance
const About = lazy(() => import('./components/About'))
const Services = lazy(() => import('./components/Services'))
const AddProducts = lazy(() => import('./components/AddProducts'))
const CategoryManagement = lazy(() => import('./components/CategoryManagement'))
const Cards = lazy(() => import('./components/cards'))
const Login = lazy(() => import('./components/Login'))
const Orders = lazy(() => import('./components/Orders'))
const Modal = lazy(() => import('./components/Modal'))
const AlertModal = lazy(() => import('./components/AlertModal'))
const Admin = lazy(() => import('./components/Admin'))
const FloatingButtons = lazy(() => import('./components/FloatingButtons'))
const Footer = lazy(() => import('./components/Footer'))

// Loading component
const LoadingSpinner = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    width: '100vw',
    background: '#667eea',
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 9999
  }}>
    <div style={{
      textAlign: 'center',
      color: '#ffffff'
    }}>
      <div style={{
        width: '50px',
        height: '50px',
        border: '5px solid #ffffff',
        borderTop: '5px solid #1a1a2e',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: '0 auto 20px'
      }}></div>
      <h2 style={{color: '#ffffff', margin: 0, fontSize: '28px', fontWeight: '700'}}>E-Commerce</h2>
      <p style={{color: '#ffffff', marginTop: '10px', opacity: 0.9}}>Loading...</p>
    </div>
  </div>
)

function AppContent() {
  const navigate = useNavigate()
  const location = useLocation();
  const [cartItems, setCartItems] = useState([])
  const [user, setUser] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [pendingProduct, setPendingProduct] = useState(null)
  const [showAddToCartModal, setShowAddToCartModal] = useState(false)
  const [orders, setOrders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [products, setProducts] = useState([])
  const [productsVersion, setProductsVersion] = useState(0) // For forcing re-renders
  
  // 🆕 Alert Modal state
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: null,
    showConfirm: false
  })
  
  // 🆕 دالة مساعدة لعرض الـ Alert
  const showAlert = (title, message, type = 'info') => {
    setAlertModal({
      isOpen: true,
      title,
      message,
      type,
      onConfirm: null,
      showConfirm: false
    })
  }
  
  // 🆕 دالة مساعدة لعرض Confirm
  const showConfirm = (title, message, onConfirm, type = 'warning') => {
    setAlertModal({
      isOpen: true,
      title,
      message,
      type,
      onConfirm,
      showConfirm: true
    })
  }
  
  const closeAlert = () => {
    setAlertModal(prev => ({ ...prev, isOpen: false }))
  }
  
  const handleAlertConfirm = () => {
    if (alertModal.onConfirm) {
      alertModal.onConfirm()
    }
    closeAlert()
  }
  
  // Dark mode is always enabled

  // Load products from Supabase (real-time sync!)
  useEffect(() => {
    // First, fetch existing products from Supabase
    const fetchProducts = async () => {
      try {
        const { getProductsFromSupabase } = await import('./utils/supabase')
        const supabaseProducts = await getProductsFromSupabase()
        console.log('📥 Initial fetch:', supabaseProducts.length, 'products')
        
        // ✅ استخدم قيمة Supabase مباشرة
        setProducts(supabaseProducts)
        try {
          localStorage.setItem('ecommerce_products', JSON.stringify(supabaseProducts.slice(0, 20)))
        } catch (e) {
          console.warn('localStorage quota exceeded, skipping cache')
        }
      } catch (error) {
        console.error('Error fetching products:', error)
      }
    }
    fetchProducts()

    // Subscribe to real-time updates from Supabase
    const unsubscribe = subscribeToProducts((supabaseProducts) => {
      console.log('🔄 Supabase: Products updated!', supabaseProducts.length, 'items')
      
      // ✅ استخدم قيمة Supabase مباشرة - هيها اللي فيها الحجز فعلاً
      setProducts(supabaseProducts)
      
      // Also save to localStorage for offline support (limit to 20 items)
      try {
        localStorage.setItem('ecommerce_products', JSON.stringify(supabaseProducts.slice(0, 20)))
      } catch (e) {
        console.warn('localStorage quota exceeded in realtime sync')
      }
    })

    // Cleanup subscription on unmount
    return () => unsubscribe()
  }, [])

  // Fallback: load from localStorage initially (for faster UI)
  const loadProducts = () => {
    try {
      const localStorageData = localStorage.getItem('ecommerce_products');
      if (localStorageData) {
        const allProducts = JSON.parse(localStorageData);
        const validProducts = Array.isArray(allProducts)
          ? allProducts.filter(p => p && p.id && p.title && p.price !== undefined)
          : [];
        if (validProducts.length > 0) {
          setProducts(validProducts);
        }
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
  }

  // Handle products update
  const handleProductsUpdate = () => {
    console.log('🔄 App.js: Products updated, reloading...')
    // Reload immediately and also with delay to ensure we get the latest data
    loadProducts()
    setProductsVersion(prev => prev + 1)
    console.log('✅ App.js: Products reloaded immediately')
    
    setTimeout(() => {
      loadProducts()
      setProductsVersion(prev => prev + 1)
      console.log('✅ App.js: Products reloaded with delay')
    }, 100)
  }

  // Check for saved user and cart data on component mount
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Create admin-test@gmail.com user if it doesn't exist
        const users = database.getUsers();
        if (!users.some(user => user.email === 'admin-test@gmail.com')) {
          try {
            database.registerUser({
              email: 'admin-test@gmail.com',
              password: 'admin123',
              name: 'Admin Test'
            });
            console.log('Created admin-test@gmail.com user in App.js');
          } catch (error) {
            console.log('admin-test@gmail.com already exists:', error.message);
          }
        }

        const savedUserEmail = localStorage.getItem('currentUserEmail')
        const savedCartItems = localStorage.getItem('cartItems')
        
        if (savedUserEmail) {
          const savedUser = database.getUsers().find(user => user.email === savedUserEmail)
          if (savedUser) {
            setUser(savedUser)
          }
        }
        
        if (savedCartItems) {
          try {
            const parsedCartItems = JSON.parse(savedCartItems)
            setCartItems(parsedCartItems)
          } catch (error) {
            console.error('Error loading cart items:', error)
            setCartItems([])
          }
        }

        // Load products initially
        loadProducts()
        
        // Load orders from Supabase (or localStorage as fallback)
        try {
          const supabaseOrders = await getOrdersFromSupabase()
          if (supabaseOrders && supabaseOrders.length > 0) {
            setOrders(supabaseOrders)
            // Sync to localStorage for offline
            localStorage.setItem('ecommerce_orders', JSON.stringify(supabaseOrders))
            console.log('📦 Loaded', supabaseOrders.length, 'orders from Supabase')
          } else {
            // Fallback to localStorage
            const localOrders = localStorage.getItem('ecommerce_orders')
            if (localOrders) {
              setOrders(JSON.parse(localOrders))
            }
          }
        } catch (error) {
          console.log('Using localStorage orders:', error.message)
          const localOrders = localStorage.getItem('ecommerce_orders')
          if (localOrders) {
            setOrders(JSON.parse(localOrders))
          }
        }
        
        // Listen for product updates
        window.addEventListener('productsUpdated', handleProductsUpdate)
        
        // Always use dark mode (no need to set since it's always true)
        
        // Clean up localStorage to prevent quota issues
        cleanupLocalStorage()
      } catch (error) {
        console.error('Error initializing app:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeApp()
    
    // Subscribe to orders real-time updates
    const unsubscribeOrders = subscribeToOrders((supabaseOrders) => {
      console.log('🔄 Supabase: Orders updated!', supabaseOrders.length, 'orders')
      setOrders(supabaseOrders)
      // Sync to localStorage for offline
      localStorage.setItem('ecommerce_orders', JSON.stringify(supabaseOrders))
    })
    
    // Cleanup function for event listeners
    return () => {
      window.removeEventListener('productsUpdated', handleProductsUpdate)
      unsubscribeOrders()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Additional effect to listen for localStorage changes
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'ecommerce_products') {
        console.log('🔄 App.js: localStorage changed, reloading products...')
        loadProducts()
        setProductsVersion(prev => prev + 1)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  const addToCart = (product) => {
    if (!user) {
      setPendingProduct(product)
      setShowModal(true)
      return
    }
    
    // 🆕 Check stock availability first
    const availableQuantity = checkAvailableQuantity(product.id)
    if (availableQuantity <= 0) {
      showAlert('Out of Stock', 'Sorry, this product is out of stock!', 'error')
      return
    }
    
    // Add product to cart (no reservation!)
    const existingItem = cartItems.find(item => item.id === product.id)
    
    if (existingItem) {
      const newQuantity = existingItem.quantity + 1
      // Check if we can add more
      if (newQuantity > availableQuantity) {
        showAlert('Limited Stock', `Sorry, only ${availableQuantity} items available.`, 'warning')
        return
      }
      
      setCartItems(prevItems => {
        const updatedItems = prevItems.map(item => 
          item.id === product.id 
            ? { ...item, quantity: newQuantity }
            : item
        )
        try {
          const limitedItems = updatedItems.slice(-20)
          localStorage.setItem('cartItems', JSON.stringify(limitedItems))
          return limitedItems
        } catch (error) {
          if (error.name === 'QuotaExceededError') {
            cleanupLocalStorage()
            showAlert('Storage Full', 'Storage was full. Please try again.', 'warning')
          }
          return updatedItems
        }
      })
    } else {
      setCartItems(prevItems => {
        const updatedItems = [...prevItems, { ...product, quantity: 1 }]
        try {
          const limitedItems = updatedItems.slice(-20)
          localStorage.setItem('cartItems', JSON.stringify(limitedItems))
          return limitedItems
        } catch (error) {
          if (error.name === 'QuotaExceededError') {
            cleanupLocalStorage()
            showAlert('Storage Full', 'Storage was full. Please try again.', 'warning')
          }
          return updatedItems
        }
      })
    }
    
    setShowAddToCartModal(true)
  }


  // دالة للتحقق من الكمية المتاحة (بدون حجز)
  const checkAvailableQuantity = (productId) => {
    try {
      // الأول نشوف في products state (من Supabase)
      const productFromState = products.find(p => p.id === productId)
      if (productFromState) {
        return Math.max(0, productFromState.quantity || 0)
      }
      
      // لو مش لقينا، نشوف في localStorage
      const existingProducts = JSON.parse(localStorage.getItem('ecommerce_products') || '[]')
      const product = existingProducts.find(p => p.id === productId)
      
      if (product) {
        return Math.max(0, product.quantity || 0)
      }
      
      return 0
    } catch (error) {
      console.error('Error checking available quantity:', error)
      return 0
    }
  }

  const updateCartItemQuantity = (id, newQuantity) => {
    if (newQuantity <= 0) {
      setCartItems(prevItems => {
        const updatedItems = prevItems.filter(item => item.id !== id)
        
        // Save to localStorage immediately
        try {
          const limitedItems = updatedItems.slice(-20)
          localStorage.setItem('cartItems', JSON.stringify(limitedItems))
          return limitedItems
        } catch (error) {
          if (error.name === 'QuotaExceededError') {
            console.warn('LocalStorage quota exceeded, clearing old data...')
            cleanupLocalStorage()
            showAlert('Storage Full', 'Storage was full, some data was cleared. Please try again.', 'warning')
          }
          return updatedItems
        }
      })
    } else {
      // 🆕 Check stock availability
      const availableQuantity = checkAvailableQuantity(id)
      if (newQuantity > availableQuantity) {
        showAlert('Limited Stock', `Sorry, only ${availableQuantity} items available.`, 'warning')
        return
      }
      
      setCartItems(prevItems => {
        const updatedItems = prevItems.map(item => 
          item.id === id ? { ...item, quantity: newQuantity } : item
        )
        
        // Save to localStorage immediately
        try {
          const limitedItems = updatedItems.slice(-20)
          localStorage.setItem('cartItems', JSON.stringify(limitedItems))
          return limitedItems
        } catch (error) {
          if (error.name === 'QuotaExceededError') {
            console.warn('LocalStorage quota exceeded, clearing old data...')
            cleanupLocalStorage()
            showAlert('Storage Full', 'Storage was full, some data was cleared. Please try again.', 'warning')
          }
          return updatedItems
        }
      })
    }
  }

  // Save cart items to localStorage whenever they change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (cartItems.length > 0) {
        try {
          // Limit cart items to prevent memory issues
          const limitedItems = cartItems.slice(-20)
          localStorage.setItem('cartItems', JSON.stringify(limitedItems))
        } catch (error) {
          if (error.name === 'QuotaExceededError') {
            console.warn('LocalStorage quota exceeded in useEffect, clearing old data...')
            try {
              // Clear old data and retry with minimal data
              localStorage.removeItem('cartItems')
              localStorage.removeItem('ecommerce_products')
              localStorage.removeItem('ecommerce_orders')
              localStorage.removeItem('ecommerce_users')
              
              const minimalCartItems = cartItems.slice(-10).map(item => ({
                id: item.id,
                title: item.title,
                price: item.price,
                quantity: item.quantity
              }))
              
              localStorage.setItem('cartItems', JSON.stringify(minimalCartItems))
            } catch (retryError) {
              console.error('Failed to save cart in useEffect:', retryError)
            }
          }
        }
      } else {
        localStorage.removeItem('cartItems')
      }
    }, 500) // Increased debounce to 500ms

    return () => clearTimeout(timeoutId)
  }, [cartItems])

  // دالة لتنظيف اللوكل ستورج
  const cleanupLocalStorage = () => {
    try {
      // حذف البيانات غير الضرورية
      const keysToRemove = [
        'react-devtools',
        'react-devtools::Dock',
        'react-devtools::Panel',
        'react-devtools::Tab',
        'react-devtools::Tab::DevTools',
        'react-devtools::Tab::Components',
        'react-devtools::Tab::Profiler',
        'react-devtools::Tab::Settings'
      ]
      
      keysToRemove.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key)
        }
      })
      
      console.log('LocalStorage cleaned successfully')
    } catch (error) {
      console.error('Error cleaning localStorage:', error)
    }
  }

  const clearCart = () => {
    // 🆕 بس نمسح السلة (مفيش حجز فمش لازم نرجع حاجة)
    setCartItems([])
    localStorage.removeItem('cartItems')
  }

  const createOrder = async (shippingData = null) => {
    if (cartItems.length === 0) return
    
    // 🆕 Check stock availability for all items BEFORE creating order
    const outOfStockItems = []
    for (const item of cartItems) {
      const availableQuantity = checkAvailableQuantity(item.id)
      if (item.quantity > availableQuantity) {
        outOfStockItems.push(`${item.title} (requested: ${item.quantity}, available: ${availableQuantity})`)
      }
    }
    
    // If any items are out of stock, show error and don't create order
    if (outOfStockItems.length > 0) {
      showAlert('Cannot Complete Order', `The following items are no longer available:\n\n${outOfStockItems.join('\n')}\n\nPlease update your cart.`, 'error')
      return
    }
    
    const newOrder = {
      orderNumber: `ORD-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString(),
      status: 'Processing',
      userId: user?.id,
      userEmail: user?.email,
      items: cartItems.map(item => ({
        id: item.id,
        name: item.title,
        price: item.price,
        quantity: item.quantity,
        image: item.image
      })),
      total: cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      shipping: shippingData || {}
    }
    
    // حفظ الطلب في Supabase أولاً
    try {
      const supabaseOrder = await addOrderToSupabase(newOrder)
      console.log('✅ Order saved to Supabase:', supabaseOrder.orderNumber)
      // Also save to localStorage for offline backup
      database.saveOrder(newOrder)
      setOrders(prevOrders => [supabaseOrder, ...prevOrders])
    } catch (error) {
      console.warn('⚠️ Could not save to Supabase, using localStorage only:', error.message)
      // Fallback to localStorage only
      const savedOrder = database.saveOrder(newOrder)
      setOrders(prevOrders => [savedOrder, ...prevOrders])
    }
    
    // 🆕 Subtract quantities from Supabase after successful order
    await subtractProductQuantities(cartItems)
    
    setCartItems([])
    localStorage.removeItem('cartItems')
  }

  // 🆕 دالة طرح الكمية من Supabase بعد الشراء الناجح
  const subtractProductQuantities = async (purchasedItems) => {
    try {
      for (const item of purchasedItems) {
        try {
          // Get current quantity from Supabase (latest)
          const product = products.find(p => p.id === item.id)
          if (product) {
            const newQuantity = Math.max(0, (product.quantity || 0) - item.quantity)
            await updateProductInSupabase(item.id, { quantity: newQuantity })
            console.log(`✅ Subtracted ${item.quantity} from product ${item.id}, new quantity: ${newQuantity}`)
          }
        } catch (error) {
          console.warn(`Could not update product ${item.id}:`, error.message)
        }
      }
      console.log('Product quantities updated after purchase')
    } catch (error) {
      console.error('Error updating product quantities:', error)
    }
  }

  const handleLogin = async (userData) => {
    setUser(userData)
    // Save current user email to localStorage for admin access
    localStorage.setItem('currentUserEmail', userData.email)
    
    // Save user to Supabase
    try {
      await addUserToSupabase(userData)
      console.log(' User saved to Supabase:', userData.email)
    } catch (error) {
      console.warn(' Could not save user to Supabase:', error.message)
    }
    
    // Merge cart items from this user with existing cart
    const existingCart = JSON.parse(localStorage.getItem('cartItems') || '[]')
    const userOrders = userData.orders || []
    
    if (userOrders.length > 0) {
      const orderItems = userOrders.flatMap(order => order.items || [])
      
      const mergedItems = [...existingCart]
      orderItems.forEach(orderItem => {
        const existingItem = mergedItems.find(item => item.id === orderItem.id)
        if (existingItem) {
          setCartItems(prevItems => {
            const updatedItems = prevItems.map(item => 
              item.id === orderItem.id 
                ? { ...item, quantity: item.quantity + (orderItem.quantity || 1) }
                : item
            )
            
            // Save to localStorage immediately
            try {
              localStorage.setItem('cartItems', JSON.stringify(updatedItems))
            } catch (error) {
              if (error.name === 'QuotaExceededError') {
                console.warn('LocalStorage quota exceeded in handleLogin, clearing old data...')
                cleanupLocalStorage()
                showAlert('Storage Full', 'Storage was full, some data was cleared. Please try again.', 'warning')
              }
            }
            
            return updatedItems
          })
        } else {
          setCartItems(prevItems => {
            const updatedItems = [...prevItems, { ...orderItem, quantity: orderItem.quantity || 1 }]
            
            // Save to localStorage immediately
            try {
              localStorage.setItem('cartItems', JSON.stringify(updatedItems))
            } catch (error) {
              if (error.name === 'QuotaExceededError') {
                console.warn('LocalStorage quota exceeded in handleLogin, clearing old data...')
                cleanupLocalStorage()
                showAlert('Storage Full', 'Storage was full, some data was cleared. Please try again.', 'warning')
              }
            }
            
            return updatedItems
          })
        }
      })
    }
    // Then show the modal
    setShowAddToCartModal(true)
  }

  const handleLogout = () => {
    setUser(null)
    setCartItems([])
    // Remove current user email and cart items from localStorage
    localStorage.removeItem('currentUserEmail')
    localStorage.removeItem('cartItems')
  }

  const handleModalConfirm = () => {
    setShowModal(false)
    navigate('/login')
  }

  const handleModalClose = () => {
    setShowModal(false)
    setPendingProduct(null)
  }

  const handleAddToCartAfterLogin = () => {
    // Product is already added to cart, navigate to cart
    setShowAddToCartModal(false)
    setPendingProduct(null)
    navigate('/cart')
  }

  const handleAddToCartModalClose = () => {
    setShowAddToCartModal(false)
    setPendingProduct(null)
  }

  // Calculate cart count - show number of unique items
  const cartCount = cartItems.length

  // Function to toggle dark mode (disabled - always dark)
  // Dark mode is always enabled (no toggle needed)

  // Apply dark mode to body (always dark)
  useEffect(() => {
    document.body.classList.add('dark-mode')
  }, [])

  // Show loading screen while checking saved user
  if (isLoading) {
    return <LoadingSpinner />
  }

  return (

    <div className="dark-mode">
      <Nav cartItemsCount={cartCount} user={user} onLogout={handleLogout} darkMode={true} toggleDarkMode={undefined} />
      <Routes>
        <Route path='/' element={
          <Suspense fallback={<LoadingSpinner />}>
            <Cards 
              addToCart={addToCart} 
              darkMode={true} 
              products={products}
              productsVersion={productsVersion}
            />
          </Suspense>
        } />
        <Route path='/about' element={
          <Suspense fallback={<LoadingSpinner />}>
            <About darkMode={true} />
          </Suspense>
        } />

        <Route path='/services' element={
          <Suspense fallback={<LoadingSpinner />}>
            <Services darkMode={true} />
          </Suspense>
        } />
        <Route path='/cart' element={
          user ? (
            <Suspense fallback={<LoadingSpinner />}>
              <Cart 
                cartItems={cartItems} 
                updateQuantity={updateCartItemQuantity}
                clearCart={clearCart}
                createOrder={createOrder}
                darkMode={true}
                products={products}
              />
            </Suspense>
          ) : (
            <div className="login-prompt">
              <h2>Login Required</h2>
              <p>Please login to view your cart</p>
              <button onClick={() => navigate('/login')} className="login-btn">
                Login
              </button>
            </div>
          )
        } />
        <Route path='/login' element={
          <Suspense fallback={<LoadingSpinner />}>
            <Login onLogin={handleLogin} darkMode={true} />
          </Suspense>
        } />
        <Route path='/orders' element={
          user ? (
            <Suspense fallback={<LoadingSpinner />}>
              <Orders user={user} orders={orders} darkMode={true} />
            </Suspense>
          ) : (
            <div className="login-prompt">
              <h2>Login Required</h2>
              <p>Please login to view your orders</p>
              <button onClick={() => navigate('/login')} className="login-btn">
                Login
              </button>
            </div>
          )
        } />
        <Route path='/admin' element={
          <Suspense fallback={<LoadingSpinner />}>
            <Admin darkMode={true} />
          </Suspense>
        } />
        <Route path='/add-products' element={
          <Suspense fallback={<LoadingSpinner />}>
            <AddProducts 
              darkMode={true} 
              products={products}
              productsVersion={productsVersion}
            />
          </Suspense>
        } />
        <Route path='/category-management' element={
          <Suspense fallback={<LoadingSpinner />}>
            <CategoryManagement darkMode={true} />
          </Suspense>
        } />
      </Routes>
      
      {/* 🆕 Floating Action Buttons (Cart & Notifications) */}
      {location.pathname !== '/login' && (
        <Suspense fallback={null}>
          <FloatingButtons 
            cartItemsCount={cartItems.length}
            unreadNotifications={notifications.filter(n => !n.read).length}
            onNotificationClick={() => setShowNotifications(!showNotifications)}
          />
        </Suspense>
      )}
      
      {/* إظهار الفوتر في كل الصفحات ما عدا صفحة اللوجين و My Orders والأدمن والسلة */}
      {location.pathname !== '/login' && 
       location.pathname !== '/orders' && 
       location.pathname !== '/admin' && 
       location.pathname !== '/add-products' && 
       location.pathname !== '/category-management' && 
       location.pathname !== '/cart' && 
        <Suspense fallback={<LoadingSpinner />}>
          <Footer darkMode={true} />
        </Suspense>
      }
      <Suspense fallback={<LoadingSpinner />}>
        <Modal
          isOpen={showModal}
          onClose={handleModalClose}
          title="Login Required"
          message="You need to login to add items to your cart. Would you like to go to the login page?"
          onConfirm={handleModalConfirm}
        />
        <Modal
          isOpen={showAddToCartModal}
          onClose={handleAddToCartModalClose}
          title="Product Added"
          message={`"${pendingProduct?.title}" has been added to your cart.`}
          onAddToCart={handleAddToCartAfterLogin}
          showAddToCart={true}
        />
      </Suspense>

      {/* 🆕 Alert Modal for replacing alert() */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={closeAlert}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        onConfirm={handleAlertConfirm}
        showConfirm={alertModal.showConfirm}
      />
      
    </div>
  );
}

function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </HelmetProvider>
  );
}

export default App;
