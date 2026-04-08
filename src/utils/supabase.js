import { createClient } from '@supabase/supabase-js';

// REPLACE WITH YOUR SUPABASE URL AND KEY
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://pmcqryrwpsacyehmedla.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY || 'sb_publishable_39dbjDLc4vkU6TXsfqRx2w_JghYcvuy';

const supabase = createClient(supabaseUrl, supabaseKey);

// Products table operations
export const addProductToSupabase = async (product) => {
  try {
    // Generate ID if not provided
    const productWithId = {
      ...product,
      id: product.id || crypto.randomUUID(),
      created_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('products')
      .insert([productWithId])
      .select();
    
    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('Error adding product:', error);
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
    console.error('Error updating product:', error);
    throw error;
  }
};

export const getProductsFromSupabase = async () => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting products:', error);
    throw error;
  }
};

// Real-time subscription
export const subscribeToProducts = (callback) => {
  const subscription = supabase
    .channel('products_changes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'products' },
      async (payload) => {
        // Refresh all products on any change
        const { data } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });
        callback(data || []);
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    subscription.unsubscribe();
  };
};

export { supabase };
