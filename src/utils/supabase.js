import { createClient } from '@supabase/supabase-js';

// REPLACE WITH YOUR SUPABASE URL AND KEY
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials. Please set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_KEY in your .env file.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Products table operations
export const addProductToSupabase = async (product) => {
  try {
    const productData = {
      title: product.title,
      price: product.price,
      quantity: product.quantity,
      image: product.image,
      description: product.description || ''
    };

            
    const { data, error } = await supabase
      .from('products')
      .insert([productData])
      .select();

    if (error) throw error;
        
    if (data && data[0]) {
      data[0].createdBy = product.createdBy || 'Admin';
      data[0].isProtected = product.isProtected || false;
    }

    return data[0];
  } catch (error) {
        throw error;
  }
};

export const deleteProductFromSupabase = async (productId) => {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);
    
    if (error) throw error;
    return true;
  } catch (error) {
        throw error;
  }
};

export const updateProductInSupabase = async (productId, updates) => {
  try {
                
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', productId)
      .select();
    
    if (error) throw error;
    
        return data[0];
  } catch (error) {
            throw error;
  }
};

// 🆕 Optimized: Get products with pagination (default 50 products)
export const getProductsFromSupabase = async (limit = 50, offset = 0) => {
  try {
    const { data, error, count } = await supabase
      .from('products')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return { data: data || [], count };
  } catch (error) {
        throw error;
  }
};

// 🆕 Optimized: Real-time subscription with limit
export const subscribeToProducts = (callback, limit = 50) => {
  const subscription = supabase
    .channel('products_changes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'products' },
      async (payload) => {
        // 🆕 Only refresh limited products instead of all
        const { data } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);
        callback(data || []);
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    subscription.unsubscribe();
  };
};

// User functions
export const addUserToSupabase = async (user) => {
  try {
    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('email')
      .eq('email', user.email)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // Error other than "not found"
      throw checkError;
    }

    // If user exists, return the existing user
    if (existingUser) {
            return existingUser;
    }

    // 🆕 Only basic columns that definitely exist
    const userData = {
      email: user.email,
      password: user.password,
      name: user.name
    };

    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select();

    if (error) throw error;
        return data[0];
  } catch (error) {
        throw error;
  }
};

export const getUsersFromSupabase = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*');
    
    if (error) throw error;
    return data || [];
  } catch (error) {
        throw error;
  }
};

export const deleteUserFromSupabase = async (userId) => {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);
    
    if (error) throw error;
    return true;
  } catch (error) {
        throw error;
  }
};

export const subscribeToUsers = (callback) => {
  const subscription = supabase
    .channel('users_changes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'users' },
      async (payload) => {
        const { data } = await supabase
          .from('users')
          .select('*');
        callback(data || []);
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
};

// Order functions
export const addOrderToSupabase = async (order) => {
  try {
    // Use only columns that exist in orders table: id, status, total, shipping, created_at
    const shippingData = {
      ...order.shipping,
      items: order.items || []
    };

    const orderData = {
      status: 'pending',
      total: parseFloat(order.total) || 0,
      shipping: JSON.stringify(shippingData)
    };

                
    const { data, error } = await supabase
      .from('orders')
      .insert([orderData])
      .select();
    
        
    if (error) {
                                    throw error;
    }
    
        
    // Parse shipping back to object for UI
    if (data && data[0]) {
      try {
        data[0].shipping = JSON.parse(data[0].shipping || '{}');
      } catch (e) {
        data[0].shipping = {};
      }
      data[0].orderNumber = order.orderNumber;
      data[0].userEmail = order.userEmail;
      data[0].items = order.items;
    }
    
    return data[0];
  } catch (error) {
                    throw error;
  }
};

export const deleteOrderFromSupabase = async (orderId) => {
  try {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);
    
    if (error) throw error;
    return true;
  } catch (error) {
        throw error;
  }
};

export const getOrdersFromSupabase = async (limit = 50, offset = 0) => {
  try {
    const { data, error, count } = await supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Parse shipping and items fields from TEXT back to JSON for UI
    const parsedData = (data || []).map(order => {
      try {
        return {
          ...order,
          shipping: JSON.parse(order.shipping || '{}'),
          items: order.items ? (typeof order.items === 'string' ? JSON.parse(order.items) : order.items) : []
        };
      } catch (e) {
        return {
          ...order,
          shipping: {},
          items: order.items ? (typeof order.items === 'string' ? JSON.parse(order.items) : order.items) : []
        };
      }
    });

    return { data: parsedData, count };
  } catch (error) {
        throw error;
  }
};

export const subscribeToOrders = (callback) => {
  // Use unique channel name to avoid conflicts
  const channelName = `orders_changes_${Date.now()}`;
  const channel = supabase.channel(channelName);
  
  channel.on('postgres_changes', 
    { event: '*', schema: 'public', table: 'orders' },
    async (payload) => {
      const { data } = await supabase
        .from('orders')
        .select('*');
      callback(data || []);
    }
  );
  
  const subscription = channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

// 🆕 Update order status (only status column exists)
export const updateOrderStatus = async (orderId, status, trackingInfo = {}, estimatedDelivery = null, rejectionReason = null) => {
  try {
    const updateData = {
      status: status
    };

    // Add rejectionReason if provided
    if (rejectionReason) {
      updateData.rejectionreason = rejectionReason;
    }

    // Try to update with estimatedDelivery first
    if (estimatedDelivery) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .update({ ...updateData, estimatedDelivery: estimatedDelivery })
          .eq('id', orderId)
          .select();

        if (error) throw error;
        return data[0];
      } catch (error) {
              }
    }

    // Fallback: update only status
    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
        throw error;
  }
};

// 🆕 Get orders by user email
export const getOrdersByUser = async (userEmail) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_email', userEmail)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Parse shipping field from TEXT back to JSON for UI
    const parsedData = (data || []).map(order => {
      try {
        return {
          ...order,
          shipping: JSON.parse(order.shipping || '{}')
        };
      } catch (e) {
        return {
          ...order,
          shipping: {}
        };
      }
    });
    
    return parsedData;
  } catch (error) {
        throw error;
  }
};

// 🆕 Restore product quantities after order cancellation/rejection
export const restoreProductQuantities = async (order) => {
  try {
        
    // Extract items from order - handle both order.items and order.shipping.items
    let items = order.items || [];
    if (!items.length && order.shipping) {
      try {
        const shippingData = typeof order.shipping === 'string' ? JSON.parse(order.shipping) : order.shipping;
        items = shippingData.items || [];
      } catch (error) {
        // Error parsing shipping data
      }
    }

    // Check if order has items
    if (!order || !items || !Array.isArray(items) || items.length === 0) {
            return;
    }

    // Get current products from Supabase first (correct source of truth)
    const { data: currentProducts, error: fetchError } = await getProductsFromSupabase(100, 0);

    if (fetchError || !currentProducts) {
            return;
    }

    // Calculate new quantities
    const updatedProducts = [...currentProducts];

            
    items.forEach(item => {
            const productIndex = updatedProducts.findIndex(p => p.id === item.id);
      
      if (productIndex !== -1) {
        // Add back the quantity that was ordered
        const newQuantity = updatedProducts[productIndex].quantity + item.quantity;
        updatedProducts[productIndex].quantity = newQuantity;
              } else {
              }
    });
    
    // Update localStorage
    localStorage.setItem('ecommerce_products', JSON.stringify(updatedProducts));
    
    // Update Supabase for real-time sync across all devices
    for (const item of order.items) {
      try {
        const product = updatedProducts.find(p => p.id === item.id);
        if (product) {
          await updateProductInSupabase(item.id, { quantity: product.quantity });
        }
      } catch (error) {
              }
    }
    
    // Trigger update event
    window.dispatchEvent(new Event('productsUpdated'));
    
      } catch (error) {
      }
};

// Review functions
export const addReviewToSupabase = async (review) => {
  try {
    const reviewData = {
      productid: review.productId,
      userid: review.userId,
      username: review.userName || 'Anonymous',
      rating: review.rating,
      comment: review.comment || ''
    };

        
    const { data, error } = await supabase
      .from('reviews')
      .insert([reviewData])
      .select();

    if (error) {
                        throw error;
    }

        return data[0];
  } catch (error) {
        throw error;
  }
};

export const getReviewsFromSupabase = async (productId = null, limit = 50, offset = 0) => {
  try {
    let query = supabase.from('reviews').select('*');

    if (productId) {
      query = query.eq('productid', productId);
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) throw error;

            return data || [];
  } catch (error) {
        return [];
  }
};

export const getProductRating = async (productId) => {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('rating')
      .eq('productid', productId);

    if (error) throw error;

    if (!data || data.length === 0) {
      return { averageRating: 0, reviewCount: 0 };
    }

    const totalRating = data.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / data.length;

    return { averageRating, reviewCount: data.length };
  } catch (error) {
        return { averageRating: 0, reviewCount: 0 };
  }
};

// Chat functions
export const sendMessage = async (senderEmail, receiverEmail, message) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert([{
        sender_email: senderEmail,
        receiver_email: receiverEmail,
        message: message,
        created_at: new Date().toISOString(),
        read: false
      }])
      .select();

    if (error) {
            throw error;
    }
        return data[0];
  } catch (error) {
        throw error;
  }
};

export const getMessages = async (userEmail) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_email.eq.${userEmail},receiver_email.eq.${userEmail}`)
      .order('created_at', { ascending: true });

    if (error) throw error;
        return data || [];
  } catch (error) {
        return [];
  }
};

export const markMessagesAsRead = async (senderEmail, receiverEmail) => {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('sender_email', senderEmail)
      .eq('receiver_email', receiverEmail)
      .eq('read', false);

    if (error) throw error;
      } catch (error) {
      }
};

export const getAllConversations = async () => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('sender_email, receiver_email')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get unique user emails (excluding admin)
    const adminEmail = process.env.REACT_APP_ADMIN_EMAIL || 'admin@example.com';
    const uniqueUsers = new Map();

    data.forEach(msg => {
      const userEmail = msg.sender_email === adminEmail ? msg.receiver_email : msg.sender_email;
      if (userEmail !== adminEmail && !uniqueUsers.has(userEmail)) {
        uniqueUsers.set(userEmail, {
          user_email: userEmail,
          unread_count: 0
        });
      }
    });

    // Convert to array and add unread count
    const conversations = Array.from(uniqueUsers.values());

    // Get unread count for each conversation
    for (const conv of conversations) {
      const { data: unreadData } = await supabase
        .from('messages')
        .select('id')
        .eq('sender_email', conv.user_email)
        .eq('receiver_email', adminEmail)
        .eq('read', false);

      conv.unread_count = unreadData?.length || 0;
    }

        return conversations;
  } catch (error) {
        return [];
  }
};

export const deleteConversation = async (userEmail) => {
  try {
    const adminEmail = process.env.REACT_APP_ADMIN_EMAIL || 'admin@example.com';
    const { error } = await supabase
      .from('messages')
      .delete()
      .or(`sender_email.eq.${userEmail},receiver_email.eq.${userEmail}`);

    if (error) throw error;
      } catch (error) {
        throw error;
  }
};

export const subscribeToMessages = (userEmail, callback) => {
  const channel = supabase
    .channel('messages-channel')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `sender_email=eq.${userEmail}|receiver_email=eq.${userEmail}`
      },
      (payload) => {
                callback(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

// ============================================
// EVENT FUNCTIONS
// ============================================

// Add event to Supabase
export const addEventToSupabase = async (event) => {
  try {
    const eventData = {
      title: event.title,
      description: event.description || '',
      place: event.place || '',
      event_date: event.event_date,
      event_time: event.event_time,
      max_participants: event.max_participants || 0,
      current_participants: 0,
      price: parseFloat(event.price) || 0,
      image: event.image || '',
      category: event.category || 'general',
      status: 'active',
      created_by: event.created_by || 'Admin',
      is_protected: event.is_protected || false
    };

    const { data, error } = await supabase
      .from('events')
      .insert([eventData])
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    throw error;
  }
};

// Get events from Supabase
export const getEventsFromSupabase = async (limit = 50, offset = 0) => {
  try {
    const { data, error, count } = await supabase
      .from('events')
      .select('*', { count: 'exact' })
      .eq('status', 'active')
      .order('event_date', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return { data: data || [], count };
  } catch (error) {
    throw error;
  }
};

// Get event by ID
export const getEventById = async (eventId) => {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw error;
  }
};

// Update event in Supabase
export const updateEventInSupabase = async (eventId, updates) => {
  try {
    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', eventId)
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    throw error;
  }
};

// Delete event from Supabase
export const deleteEventFromSupabase = async (eventId) => {
  try {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId);

    if (error) throw error;
    return true;
  } catch (error) {
    throw error;
  }
};

// ============================================
// EVENT BOOKING FUNCTIONS
// ============================================

// Add event booking to Supabase
export const addEventBookingToSupabase = async (booking) => {
  try {
    const bookingData = {
      useremail: booking.userEmail,
      eventdate: booking.eventDate,
      eventplace: booking.eventPlace,
      orderdetails: booking.orderDetails || '',
      products: booking.products || [],
      total: parseFloat(booking.total) || 0,
      status: booking.status || 'pending',
      createdat: booking.createdAt || new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('event_bookings')
      .insert([bookingData])
      .select();

    if (error) throw error;

    return data[0];
  } catch (error) {
    throw error;
  }
};

// Get event bookings from Supabase
export const getEventBookingsFromSupabase = async (limit = 50, offset = 0) => {
  try {
    const { data, error, count } = await supabase
      .from('event_bookings')
      .select('*', { count: 'exact' })
      .order('createdat', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return { data: data || [], count };
  } catch (error) {
    throw error;
  }
};

// Get event bookings by user email
export const getEventBookingsByUser = async (userEmail) => {
  try {
    const { data, error } = await supabase
      .from('event_bookings')
      .select('*')
      .eq('useremail', userEmail)
      .order('createdat', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw error;
  }
};

// Update event booking status
export const updateEventBookingStatus = async (bookingId, status, rejectionReason = null) => {
  try {
    const updateData = { status };
    if (rejectionReason) {
      updateData.rejectionreason = rejectionReason;
    }

    const { data, error } = await supabase
      .from('event_bookings')
      .update(updateData)
      .eq('id', bookingId)
      .select();

    if (error) throw error;

    return data[0];
  } catch (error) {
    throw error;
  }
};

// Get event booking by ID
export const getEventBookingById = async (bookingId) => {
  try {
    const { data, error } = await supabase
      .from('event_bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    throw error;
  }
};

// Delete event booking permanently
export const deleteEventBookingFromSupabase = async (bookingId) => {
  try {
    const { error } = await supabase
      .from('event_bookings')
      .delete()
      .eq('id', bookingId);

    if (error) throw error;
    return true;
  } catch (error) {
    throw error;
  }
};

// Helper function to update event participants count
const updateEventParticipants = async (eventId, change) => {
  try {
    const { data: eventData } = await getEventById(eventId);
    if (eventData) {
      const newCount = Math.max(0, eventData.current_participants + change);
      await updateEventInSupabase(eventId, { current_participants: newCount });
    }
  } catch (error) {
    // Silently fail on participant count update
  }
};

// ============================================
// EVENT PRODUCTS FUNCTIONS
// ============================================

// Add product to event
export const addProductToEvent = async (eventProduct) => {
  try {
    const productData = {
      event_id: eventProduct.event_id,
      product_id: eventProduct.product_id,
      product_title: eventProduct.product_title,
      product_price: parseFloat(eventProduct.product_price) || 0,
      quantity: eventProduct.quantity || 1
    };

    const { data, error } = await supabase
      .from('event_products')
      .insert([productData])
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    throw error;
  }
};

// Get products for an event
export const getEventProducts = async (eventId) => {
  try {
    const { data, error } = await supabase
      .from('event_products')
      .select('*')
      .eq('event_id', eventId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw error;
  }
};

// ============================================
// EVENT REVIEWS FUNCTIONS
// ============================================

// Add event review
export const addEventReviewToSupabase = async (review) => {
  try {
    const reviewData = {
      event_id: review.event_id,
      user_email: review.user_email,
      rating: review.rating,
      comment: review.comment || ''
    };

    const { data, error } = await supabase
      .from('event_reviews')
      .insert([reviewData])
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    throw error;
  }
};

// Get event reviews
export const getEventReviews = async (eventId, limit = 50, offset = 0) => {
  try {
    const { data, error } = await supabase
      .from('event_reviews')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw error;
  }
};

// Get event average rating
export const getEventRating = async (eventId) => {
  try {
    const { data, error } = await supabase
      .from('event_reviews')
      .select('rating')
      .eq('event_id', eventId);

    if (error) throw error;

    if (!data || data.length === 0) {
      return { averageRating: 0, reviewCount: 0 };
    }

    const totalRating = data.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / data.length;

    return { averageRating, reviewCount: data.length };
  } catch (error) {
    return { averageRating: 0, reviewCount: 0 };
  }
};

// ============================================
// EVENT SUBSCRIPTIONS
// ============================================

// Subscribe to events changes
export const subscribeToEvents = (callback, limit = 50) => {
  const subscription = supabase
    .channel('events_changes')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'events' },
      async () => {
        const { data } = await getEventsFromSupabase(limit, 0);
        callback(data);
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
};

// Subscribe to event bookings changes
export const subscribeToEventBookings = (callback) => {
  const subscription = supabase
    .channel('event_bookings_changes')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'event_bookings' },
      async () => {
        const { data } = await getEventBookingsFromSupabase(100, 0);
        callback(data);
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
};

// ============================================
// NOTIFICATIONS
// ============================================

// Add notification
export const addNotificationToSupabase = async (notification) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert([{
        user_email: notification.userEmail,
        type: notification.type,
        message: notification.message,
        read: notification.read || false,
        data: notification.data || {}
      }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    throw error;
  }
};

// Get notifications for a user
export const getNotificationsForUser = async (userEmail) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_email', userEmail)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    throw error;
  }
};

// Get all notifications (for admin)
export const getAllNotificationsFromSupabase = async (limit = 100, offset = 0) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    throw error;
  }
};

// Mark notification as read
export const markNotificationAsReadInSupabase = async (notificationId) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    throw error;
  }
};

// Mark all notifications as read for a user
export const markAllNotificationsAsReadInSupabase = async (userEmail) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_email', userEmail)
      .select();
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    throw error;
  }
};

// Delete notification
export const deleteNotificationFromSupabase = async (notificationId) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    throw error;
  }
};

// Subscribe to notifications changes
export const subscribeToNotifications = (callback, userEmail) => {
  const channel = userEmail ? `notifications_${userEmail}` : 'notifications_all';
  const subscription = supabase
    .channel(channel)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'notifications' },
      async () => {
        const data = userEmail 
          ? await getNotificationsForUser(userEmail)
          : await getAllNotificationsFromSupabase(100, 0);
        callback(data);
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
};

export { supabase };
