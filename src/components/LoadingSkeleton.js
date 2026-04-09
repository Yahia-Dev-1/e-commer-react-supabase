import React from 'react';
import '../styles/LoadingSkeleton.css';

// Product Card Skeleton
export const ProductSkeleton = () => (
  <div className="skeleton-card">
    <div className="skeleton-image"></div>
    <div className="skeleton-content">
      <div className="skeleton-title"></div>
      <div className="skeleton-price"></div>
      <div className="skeleton-button"></div>
    </div>
  </div>
);

// Order Card Skeleton
export const OrderSkeleton = () => (
  <div className="skeleton-order">
    <div className="skeleton-order-header">
      <div className="skeleton-order-number"></div>
      <div className="skeleton-order-date"></div>
    </div>
    <div className="skeleton-order-items">
      <div className="skeleton-item"></div>
      <div className="skeleton-item"></div>
    </div>
    <div className="skeleton-order-footer">
      <div className="skeleton-total"></div>
      <div className="skeleton-status"></div>
    </div>
  </div>
);

// Admin Stats Skeleton
export const StatsSkeleton = () => (
  <div className="skeleton-stats">
    <div className="skeleton-stat-card"></div>
    <div className="skeleton-stat-card"></div>
    <div className="skeleton-stat-card"></div>
  </div>
);

// Table Row Skeleton
export const TableRowSkeleton = () => (
  <tr className="skeleton-table-row">
    <td><div className="skeleton-text"></div></td>
    <td><div className="skeleton-text"></div></td>
    <td><div className="skeleton-text"></div></td>
    <td><div className="skeleton-text"></div></td>
  </tr>
);

// Grid of Product Skeletons
export const ProductGridSkeleton = ({ count = 8 }) => (
  <div className="skeleton-grid">
    {Array.from({ length: count }).map((_, i) => (
      <ProductSkeleton key={i} />
    ))}
  </div>
);

// List of Order Skeletons
export const OrderListSkeleton = ({ count = 5 }) => (
  <div className="skeleton-list">
    {Array.from({ length: count }).map((_, i) => (
      <OrderSkeleton key={i} />
    ))}
  </div>
);
