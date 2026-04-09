import { createClient } from '@supabase/supabase-js';

// REPLACE WITH YOUR SUPABASE URL AND KEY
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://pmcqryrwpsacyehmedla.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY || 'sb_publishable_39dbjDLc4vkU6TXsfqRx2w_JghYcvuy';

const supabase = createClient(supabaseUrl, supabaseKey);

// Products table operations
export const addProductToSupabase = async (product) => {
  try {
    // Include all fields that AddProducts.js sends
    const productData = {
      title: product.title,
      price: product.price,
      quantity: product.quantity,
      image: product.image,
      description: product.description || '',
      category: product.category || 'other',
      createdBy: product.createdBy || 'Admin',
      isProtected: product.isProtected || false
    };
    
    console.log('📝 Adding product to Supabase:', productData);
    
    const { data, error } = await supabase
      .from('products')
      .insert([productData])
      .select();
    
    if (error) throw error;
    console.log('✅ Product added to Supabase:', data[0]);
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
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', productId)
      .select();
    
    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('❌ Error updating product in Supabase:', error);
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
      name: user.name,
      isAdmin: user.isAdmin || false
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
    // Save ALL order data to database
    const orderData = {
      status: 'pending',
      total: parseFloat(order.total) || 0,
      orderNumber: order.orderNumber,
      userEmail: order.userEmail,
      items: order.items || [],
      shipping: order.shipping || {}
    };
    
    console.log('=== FULL SOLUTION: Inserting order with ALL data ===');
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
    return { data: data || [], count };
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

export { supabase };
