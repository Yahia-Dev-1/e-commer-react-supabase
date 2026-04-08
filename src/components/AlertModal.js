import React from 'react';
import '../styles/AlertModal.css';

export default function AlertModal({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  type = 'info', // 'info', 'success', 'error', 'warning'
  onConfirm,
  showConfirm = false,
  confirmText = 'OK',
  cancelText = 'Cancel'
}) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  };

  return (
    <div className="alert-modal-overlay" onClick={onClose}>
      <div className="alert-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className={`alert-modal-header alert-modal-${type}`}>
          <span className="alert-modal-icon">{getIcon()}</span>
          <h3>{title}</h3>
          <button className="alert-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="alert-modal-body">
          <p>{message}</p>
        </div>
        <div className="alert-modal-footer">
          {showConfirm ? (
            <>
              <button className="alert-modal-btn alert-modal-btn-cancel" onClick={onClose}>
                {cancelText}
              </button>
              <button className="alert-modal-btn alert-modal-btn-confirm" onClick={onConfirm}>
                {confirmText}
              </button>
            </>
          ) : (
            <button className="alert-modal-btn alert-modal-btn-confirm" onClick={onClose}>
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
