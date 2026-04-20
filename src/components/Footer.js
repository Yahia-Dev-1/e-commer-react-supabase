import React from 'react';
import '../styles/Footer.css';

export default function Footer({ darkMode = true }) {
  return (
    <footer className={`footer ${darkMode ? 'dark-mode' : ''}`}>
      <div className="footer-content">
        <div className="footer-contact-section">
          <h3 className="footer-section-title">Contact Us</h3>
          <div className="footer-contact-info">
            <a href={`mailto:${process.env.REACT_APP_ADMIN_EMAIL || 'admin@example.com'}`} className="contact-link">
              <i className="fa fa-envelope"></i> {process.env.REACT_APP_ADMIN_EMAIL || 'admin@example.com'}
            </a>
            <a href="tel:+201273445173" className="contact-link">
              <i className="fa fa-phone"></i> +20 127 344 5173
            </a>
            <span className="contact-text">
              <i className="fa fa-map-marker"></i> Alexandria, Egypt
            </span>
          </div>
        </div>

        <div className="footer-bottom-row">
          <div className="footer-copyright">
            © 2025 E-Shop
          </div>
        </div>
      </div>
    </footer>
  );
} 