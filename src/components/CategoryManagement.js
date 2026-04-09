import React, { useState, useEffect } from 'react';
import '../styles/CategoryManagement.css';
import { useToast } from '../contexts/ToastContext';

export default function CategoryManagement({ darkMode = true }) {
  const showToast = useToast();
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = () => {
    try {
      const savedCategories = JSON.parse(localStorage.getItem('ecommerce_categories') || '[]');
      if (savedCategories.length === 0) {
        // Default categories if none exist
        const defaultCategories = [
          'Electronics',
          'Clothing',
          'Books',
          'Home & Garden',
          'Sports',
          'Beauty',
          'Toys',
          'Other'
        ];
        setCategories(defaultCategories);
        localStorage.setItem('ecommerce_categories', JSON.stringify(defaultCategories));
      } else {
        setCategories(savedCategories);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      setCategories([]);
    }
  };

  const addCategory = () => {
    if (!newCategory.trim()) {
      showToast('Please enter a category name', 'error');
      return;
    }

    if (categories.includes(newCategory.trim())) {
      showToast('Category already exists', 'warning');
      return;
    }

    const updatedCategories = [...categories, newCategory.trim()];
    setCategories(updatedCategories);
    localStorage.setItem('ecommerce_categories', JSON.stringify(updatedCategories));
    setNewCategory('');
    showToast('Category added successfully!', 'success');
  };

  const deleteCategory = (categoryName) => {
    if (window.confirm(`Are you sure you want to delete "${categoryName}"?`)) {
      const updatedCategories = categories.filter(cat => cat !== categoryName);
      setCategories(updatedCategories);
      localStorage.setItem('ecommerce_categories', JSON.stringify(updatedCategories));
      showToast('Category deleted successfully!', 'success');
    }
  };

  const startEdit = (categoryName) => {
    setEditingCategory(categoryName);
    setEditName(categoryName);
  };

  const saveEdit = () => {
    if (!editName.trim()) {
      showToast('Please enter a category name', 'error');
      return;
    }

    if (categories.includes(editName.trim()) && editName.trim() !== editingCategory) {
      showToast('Category already exists', 'warning');
      return;
    }

    const updatedCategories = categories.map(cat => 
      cat === editingCategory ? editName.trim() : cat
    );
    setCategories(updatedCategories);
    localStorage.setItem('ecommerce_categories', JSON.stringify(updatedCategories));
    setEditingCategory(null);
    setEditName('');
    alert('Category updated successfully!');
  };

  const cancelEdit = () => {
    setEditingCategory(null);
    setEditName('');
  };

  const getCategoryStats = () => {
    try {
      const products = JSON.parse(localStorage.getItem('ecommerce_products') || '[]');
      const stats = {};
      categories.forEach(category => {
        stats[category] = products.filter(product => product.category === category).length;
      });
      return stats;
    } catch (error) {
      console.error('Error getting category stats:', error);
      return {};
    }
  };

  const categoryStats = getCategoryStats();

  return (
    <div className={`category-management-container ${darkMode ? 'dark-mode' : ''}`}>
      <div className="category-header">
        <div className="header-content">
          <div className="header-text">
            <h1>Category Management</h1>
            <p>Manage your product categories</p>
          </div>
          <button 
            className="back-btn"
            onClick={() => window.location.href = '/add-products'}
            style={{
              background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
              marginLeft: '10px'
            }}
          >
            🔙 Back to Add Products
          </button>
        </div>
      </div>

      <div className="category-form">
        <h2>Add New Category</h2>
        <div className="form-group">
          <label htmlFor="newCategory">Category Name:</label>
          <input
            type="text"
            id="newCategory"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Enter category name"
            onKeyPress={(e) => e.key === 'Enter' && addCategory()}
          />
          <button onClick={addCategory} className="add-btn">
            Add Category
          </button>
        </div>
      </div>

      <div className="categories-list">
        <h2>Current Categories ({categories.length})</h2>
        {categories.length === 0 ? (
          <p className="no-categories">No categories found.</p>
        ) : (
          <div className="categories-grid">
            {categories.map((category, index) => (
              <div key={index} className="category-card">
                <div className="category-info">
                  {editingCategory === category ? (
                    <div className="edit-form">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                      />
                      <div className="edit-actions">
                        <button onClick={saveEdit} className="save-btn">
                          Save
                        </button>
                        <button onClick={cancelEdit} className="cancel-btn">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3>{category}</h3>
                      <p className="category-count">
                        Products: {categoryStats[category] || 0}
                      </p>
                    </>
                  )}
                </div>
                <div className="category-actions">
                  {editingCategory !== category && (
                    <>
                      <button 
                        className="edit-btn"
                        onClick={() => startEdit(category)}
                      >
                        Edit
                      </button>
                      <button 
                        className="delete-btn"
                        onClick={() => deleteCategory(category)}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="category-stats">
        <h2>Category Statistics</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Categories</h3>
            <p>{categories.length}</p>
          </div>
          <div className="stat-card">
            <h3>Total Products</h3>
            <p>{Object.values(categoryStats).reduce((sum, count) => sum + count, 0)}</p>
          </div>
          <div className="stat-card">
            <h3>Most Popular Category</h3>
            <p>
              {(() => {
                const entries = Object.entries(categoryStats);
                if (entries.length === 0) return 'None';
                const maxEntry = entries.reduce((max, current) => 
                  current[1] > max[1] ? current : max
                );
                return maxEntry[1] > 0 ? maxEntry[0] : 'None';
              })()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 