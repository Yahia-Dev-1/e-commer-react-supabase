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
const Admin = lazy(() => import('./components/Admin'))
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

  const addToCart = async (product) => {
    if (!user) {
      setPendingProduct(product)
      setShowModal(true)
      return
    }
    
    // التحقق من الكمية المتاحة
    const availableQuantity = checkAvailableQuantity(product.id)
    if (availableQuantity <= 0) {
      alert('Sorry, this product is out of stock and cannot be added to cart!')
      return
    }
    
    // Add product to cart first, then show modal
    const existingItem = cartItems.find(item => item.id === product.id)
    
    if (existingItem) {
      // التحقق من أن الكمية المطلوبة لا تتجاوز المتاح
      const newQuantity = existingItem.quantity + 1
      if (newQuantity > availableQuantity) {
        alert(`Sorry, only ${availableQuantity} items available for this product.`)
        return
      }
      
      // 🆕 حجز كمية 1 إضافية
      await reserveProductQuantity(product.id, 1)
      
      setCartItems(prevItems => {
        const updatedItems = prevItems.map(item => 
          item.id === product.id 
            ? { ...item, quantity: newQuantity }
            : item
        )
        
        // Save to localStorage immediately after updating state
        try {
          // Limit cart items to prevent memory issues
          const limitedItems = updatedItems.slice(-20)
          localStorage.setItem('cartItems', JSON.stringify(limitedItems))
          return limitedItems
        } catch (error) {
          if (error.name === 'QuotaExceededError') {
            console.warn('LocalStorage quota exceeded in addToCart, clearing old data...')
            cleanupLocalStorage()
            alert('Storage was full, some data was cleared. Please try adding the product again.')
          }
          return updatedItems
        }
      })
    } else {
      // 🆕 حجز كمية 1 للمنتج الجديد
      await reserveProductQuantity(product.id, 1)
      
      setCartItems(prevItems => {
        const updatedItems = [...prevItems, { ...product, quantity: 1 }]
        
        // Save to localStorage immediately after updating state
        try {
          // Limit cart items to prevent memory issues
          const limitedItems = updatedItems.slice(-20)
          localStorage.setItem('cartItems', JSON.stringify(limitedItems))
          return limitedItems
        } catch (error) {
          if (error.name === 'QuotaExceededError') {
            console.warn('LocalStorage quota exceeded in addToCart, clearing old data...')
            cleanupLocalStorage()
            alert('Storage was full, some data was cleared. Please try adding the product again.')
          }
          return updatedItems
        }
      })
    }
    
    // Show modal asking if user wants to go to cart or continue shopping
    setShowAddToCartModal(true)
  }



  // 🆕 دالة لحجز الكمية (عند الإضافة للسلة)
  const reserveProductQuantity = async (productId, quantity) => {
    try {
      const existingProducts = JSON.parse(localStorage.getItem('ecommerce_products') || '[]')
      const productIndex = existingProducts.findIndex(p => p.id === productId)
      
      if (productIndex !== -1) {
        const oldQuantity = existingProducts[productIndex].quantity || 0
        const newQuantity = Math.max(0, oldQuantity - quantity)
        
        existingProducts[productIndex].quantity = newQuantity
        localStorage.setItem('ecommerce_products', JSON.stringify(existingProducts))
        
        // Update Supabase for real-time sync
        try {
          await updateProductInSupabase(productId, { quantity: newQuantity })
          console.log(`✅ Reserved ${quantity} items from product ${productId}, remaining: ${newQuantity}`)
        } catch (error) {
          console.warn('Could not update Supabase:', error.message)
        }
        
        // Update local state
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, quantity: newQuantity } : p))
        window.dispatchEvent(new Event('productsUpdated'))
      }
    } catch (error) {
      console.error('Error reserving quantity:', error)
    }
  }

  // 🆕 دالة لإرجاع الكمية المحجوزة (عند الإزالة من السلة أو رفض الأوردر)
  const releaseProductQuantity = async (productId, quantity) => {
    try {
      const existingProducts = JSON.parse(localStorage.getItem('ecommerce_products') || '[]')
      const productIndex = existingProducts.findIndex(p => p.id === productId)
      
      if (productIndex !== -1) {
        const oldQuantity = existingProducts[productIndex].quantity || 0
        const newQuantity = oldQuantity + quantity
        
        existingProducts[productIndex].quantity = newQuantity
        localStorage.setItem('ecommerce_products', JSON.stringify(existingProducts))
        
        // Update Supabase for real-time sync
        try {
          await updateProductInSupabase(productId, { quantity: newQuantity })
          console.log(`✅ Released ${quantity} items back to product ${productId}, new total: ${newQuantity}`)
        } catch (error) {
          console.warn('Could not update Supabase:', error.message)
        }
        
        // Update local state
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, quantity: newQuantity } : p))
        window.dispatchEvent(new Event('productsUpdated'))
      }
    } catch (error) {
      console.error('Error releasing quantity:', error)
    }
  }

  // 🆕 دالة لإرجاع كميات متعددة (للأوردر كامل)
  const releaseOrderQuantities = async (items) => {
    for (const item of items) {
      await releaseProductQuantity(item.id, item.quantity)
    }
  }

  // دالة للتحقق من الكمية المتاحة
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

  const updateCartItemQuantity = async (id, newQuantity) => {
    // 🆕 احصل على الكمية الحالية في السلة قبل التغيير
    const currentItem = cartItems.find(item => item.id === id)
    const currentQuantity = currentItem ? currentItem.quantity : 0
    
    if (newQuantity <= 0) {
      // 🆕 إرجاع الكمية المحجوزة بالكامل عند إزالة المنتج
      if (currentQuantity > 0) {
        await releaseProductQuantity(id, currentQuantity)
      }
      
      setCartItems(prevItems => {
        const updatedItems = prevItems.filter(item => item.id !== id)
        
        // Save to localStorage immediately
        try {
          // Limit cart items to prevent memory issues
          const limitedItems = updatedItems.slice(-20)
          localStorage.setItem('cartItems', JSON.stringify(limitedItems))
          return limitedItems
        } catch (error) {
          if (error.name === 'QuotaExceededError') {
            console.warn('LocalStorage quota exceeded, clearing old data...')
            cleanupLocalStorage()
            alert('Storage was full, some data was cleared. Please try again.')
          }
          return updatedItems
        }
      })
    } else {
      // 🆕 حساب الفرق في الكمية
      const quantityDiff = newQuantity - currentQuantity
      
      // لو الكمية زادت، نحجز الفرق
      if (quantityDiff > 0) {
        const availableQuantity = checkAvailableQuantity(id)
        if (quantityDiff > availableQuantity) {
          alert(`Sorry, only ${availableQuantity} more items available for this product.`)
          return
        }
        await reserveProductQuantity(id, quantityDiff)
      }
      // لو الكمية قلت، نرجع الفرق
      else if (quantityDiff < 0) {
        await releaseProductQuantity(id, Math.abs(quantityDiff))
      }
      
      setCartItems(prevItems => {
        const updatedItems = prevItems.map(item => 
          item.id === id ? { ...item, quantity: newQuantity } : item
        )
        
        // Save to localStorage immediately
        try {
          // Limit cart items to prevent memory issues
          const limitedItems = updatedItems.slice(-20)
          localStorage.setItem('cartItems', JSON.stringify(limitedItems))
          return limitedItems
        } catch (error) {
          if (error.name === 'QuotaExceededError') {
            console.warn('LocalStorage quota exceeded, clearing old data...')
            cleanupLocalStorage()
            alert('Storage was full, some data was cleared. Please try again.')
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

  const clearCart = async () => {
    // 🆕 إرجاع كل الكميات المحجوزة قبل مسح السلة
    for (const item of cartItems) {
      await releaseProductQuantity(item.id, item.quantity)
    }
    
    setCartItems([])
    localStorage.removeItem('cartItems')
  }

  const createOrder = async (shippingData = null) => {
    if (cartItems.length === 0) return
    
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
    
    // ✅ الكمية محجوزة فعلاً، بنعمل sync بس مع Supabase
    await updateProductQuantities(cartItems)
    
    setCartItems([])
    localStorage.removeItem('cartItems')
  }

  // 🔄 دالة م同步 للكميات مع Supabase بعد الشراء (الكمية محجوزة فعلاً)
  const updateProductQuantities = async (purchasedItems) => {
    try {
      // 📝 الكمية محجوزة فعلاً في السلة، فنحن بس بنـ Sync مع Supabase
      // مش بنطرح تاني عشان نتجنب الـ Double Subtraction
      
      for (const item of purchasedItems) {
        try {
          // Get current quantity from localStorage
          const existingProducts = JSON.parse(localStorage.getItem('ecommerce_products') || '[]')
          const product = existingProducts.find(p => p.id === item.id)
          
          if (product) {
            // Sync with Supabase (quantity already reserved in cart)
            await updateProductInSupabase(item.id, { quantity: product.quantity })
            console.log(`✅ Synced product ${item.id} quantity: ${product.quantity}`)
          }
        } catch (error) {
          console.warn(`Could not sync product ${item.id}:`, error.message)
        }
      }
      
      console.log('Product quantities synced after purchase')
      
    } catch (error) {
      console.error('Error syncing product quantities:', error)
    }
  }

  const handleLogin = (userData) => {
    setUser(userData)
    // Save current user email to localStorage for admin access
    localStorage.setItem('currentUserEmail', userData.email)
    // Check if there's a pending product to add to cart
    if (pendingProduct) {
      // Add the pending product to cart first
      const existingItem = cartItems.find(item => item.id === pendingProduct.id)
      
      if (existingItem) {
        setCartItems(prevItems => {
          const updatedItems = prevItems.map(item => 
            item.id === pendingProduct.id 
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
          
          // Save to localStorage immediately
          try {
            localStorage.setItem('cartItems', JSON.stringify(updatedItems))
          } catch (error) {
            if (error.name === 'QuotaExceededError') {
              console.warn('LocalStorage quota exceeded in handleLogin, clearing old data...')
              cleanupLocalStorage()
              alert('Storage was full, some data was cleared. Please try again.')
            }
          }
          
          return updatedItems
        })
      } else {
        setCartItems(prevItems => {
          const updatedItems = [...prevItems, { ...pendingProduct, quantity: 1 }]
          
          // Save to localStorage immediately
          try {
            localStorage.setItem('cartItems', JSON.stringify(updatedItems))
          } catch (error) {
            if (error.name === 'QuotaExceededError') {
              console.warn('LocalStorage quota exceeded in handleLogin, clearing old data...')
              cleanupLocalStorage()
              alert('Storage was full, some data was cleared. Please try again.')
            }
          }
          
          return updatedItems
        })
      }
      
      // Then show the modal
      setShowAddToCartModal(true)
    }
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
