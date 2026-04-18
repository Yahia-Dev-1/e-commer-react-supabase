import React from 'react';
import '../styles/Modal.css';

export default function Modal({ isOpen, onClose, title, message, onConfirm, onAddToCart, showAddToCart = false, type = 'default' }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-content ${type === 'alert' ? 'modal-alert' : ''}`} onClick={(e) => e.stopPropagation()}>
        {type === 'alert' ? (
          <>
            <div className="modal-header">
              <h3>{title}</h3>
              <button className="modal-close" onClick={onClose}>×</button>
            </div>
            <div className="modal-body">
              <p>{message}</p>
            </div>
            <div className="modal-footer">
              <button className="modal-btn modal-btn-confirm" onClick={onClose}>
                OK
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="modal-header">
              <h3>{title}</h3>
              <button className="modal-close" onClick={onClose}>×</button>
            </div>
            <div className="modal-body">
              <p>{message}</p>
            </div>
            <div className="modal-footer">
              {showAddToCart ? (
                <>
                  <button className="modal-btn modal-btn-cancel" onClick={onClose}>
                    Continue Shopping
                  </button>
                  <button className="modal-btn modal-btn-confirm" onClick={onAddToCart}>
                    Go to Cart Now
                  </button>
                </>
              ) : (
                <>
                  <button className="modal-btn modal-btn-cancel" onClick={onClose}>
                    Cancel
                  </button>
                  <button className="modal-btn modal-btn-confirm" onClick={onConfirm}>
                    Login
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
} 