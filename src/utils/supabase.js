import { createClient } from '@supabase/supabase-js';

// REPLACE WITH YOUR SUPABASE URL AND KEY
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://pmcqryrwpsacyehmedla.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY || 'sb_publishable_39dbjDLc4vkU6TXsfqRx2w_JghYcvuy';

const supabase = createClient(supabaseUrl, supabaseKey);

// Products table operations
export const addProductToSupabase = async (product) => {
  try {
    // Use ONLY basic columns that definitely exist
    const productData = {
      title: product.title,
      price: product.price,
      quantity: product.quantity,
      image: product.image
    };
    
    console.log('📝 Adding product to Supabase (minimal):', productData);
    
    const { data, error } = await supabase
      .from('products')
      .insert([productData])
      .select();
    
    if (error) throw error;
    console.log('✅ Product added to Supabase:', data[0]);
    
    // Add extra fields for UI only
    if (data && data[0]) {
      data[0].description = product.description || '';
      data[0].category = product.category || 'other';
      data[0].createdBy = product.createdBy || 'Admin';
      data[0].isProtected = product.isProtected || false;
    }
    
    return data[0];
  } catch (error) {
    console.error('❌ Error adding product to Supabase:', error);
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
    console.error('Error deleting product:', error);
    throw error;
  }
};

export const updateProductInSupabase = async (productId, updates) => {
  try {
    console.log('=== UPDATING PRODUCT IN SUPABASE ===');
    console.log('Product ID:', productId);
    console.log('Updates:', updates);
    
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', productId)
      .select();
    
    if (error) throw error;
    
    console.log('✅ Product updated successfully in Supabase:', data[0]);
    return data[0];
  } catch (error) {
    console.error('❌ Error updating product in Supabase:', error);
    console.error('Error details:', error.message);
    throw error;
  }
};

// 🆕 Optimized: Get products with pagination (default 50 products)
export const getProductsFromSupabase = async (limit = 50, offset = 0, category = null) => {
  try {
    let query = supabase
      .from('products')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Add category filter if provided
    if (category && category !== 'All') {
      query = query.eq('category', category);
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) throw error;
    return { data: data || [], count };
  } catch (error) {
    console.error('Error getting products:', error);
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
    console.error('❌ Error adding user to Supabase:', error);
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
    console.error('Error getting users:', error);
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
    console.error('Error deleting user:', error);
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

    console.log('=== INSERTING ORDER TO SUPABASE ===');
    console.log('Original order:', order);
    console.log('Order data to save:', orderData);
    
    const { data, error } = await supabase
      .from('orders')
      .insert([orderData])
      .select();
    
    console.log('Supabase response:', { data, error });
    
    if (error) {
      console.error('=== ERROR DETAILS ===');
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      console.error('Error hint:', error.hint);
      throw error;
    }
    
    console.log('✅ Order inserted successfully:', data);
    
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
    console.error('=== CATCH ERROR ===');
    console.error('Full error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
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
    console.error('Error deleting order:', error);
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
    
    return { data: parsedData, count };
  } catch (error) {
    console.error('Error getting orders:', error);
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
export const updateOrderStatus = async (orderId, status, trackingInfo = {}, estimatedDelivery = null) => {
  try {
    const updateData = {
      status: status
    };

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
        console.warn('Estimated delivery field may not exist in orders table, trying without it:', error.message);
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
    console.error('Error updating order status:', error);
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
    console.error('Error getting orders by user:', error);
    throw error;
  }
};

// 🆕 Restore product quantities after order cancellation/rejection
export const restoreProductQuantities = async (order) => {
  try {
    // Get current products from Supabase first (correct source of truth)
    const { data: currentProducts, error: fetchError } = await getProductsFromSupabase(100, 0);
    
    if (fetchError || !currentProducts) {
      console.error('Could not fetch products from Supabase:', fetchError);
      return;
    }
    
    // Calculate new quantities
    const updatedProducts = [...currentProducts];
    
    order.items.forEach(item => {
      const productIndex = updatedProducts.findIndex(p => p.id === item.id);
      if (productIndex !== -1) {
        // Add back the quantity
        const newQuantity = updatedProducts[productIndex].quantity + item.quantity;
        updatedProducts[productIndex].quantity = newQuantity;
        console.log(`🔄 Restored ${item.quantity} to ${item.name}, new stock: ${newQuantity}`);
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
        console.warn('Could not update quantity in Supabase:', error.message);
      }
    }
    
    // Trigger update event
    window.dispatchEvent(new Event('productsUpdated'));
    
    console.log('✅ Product quantities restored after order cancellation/rejection');
  } catch (error) {
    console.error('Error restoring product quantities:', error);
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

    console.log('=== ADDING REVIEW TO SUPABASE ===');
    console.log('Review data:', reviewData);

    const { data, error } = await supabase
      .from('reviews')
      .insert([reviewData])
      .select();

    if (error) {
      console.error('=== ERROR ADDING REVIEW ===');
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      throw error;
    }

    console.log('✅ Review added successfully:', data);
    return data[0];
  } catch (error) {
    console.error('Error adding review to Supabase:', error);
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

    console.log('=== REVIEWS FROM SUPABASE ===');
    console.log(`Reviews count: ${data?.length || 0}`);
    return data || [];
  } catch (error) {
    console.error('Error fetching reviews from Supabase:', error);
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
    console.error('Error getting product rating:', error);
    return { averageRating: 0, reviewCount: 0 };
  }
};

export { supabase };
