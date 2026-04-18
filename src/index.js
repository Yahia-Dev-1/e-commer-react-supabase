import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.css';
import App from './App';

// Register service worker for performance optimization
// Temporarily disabled to fix Firebase issues
/*
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
              })
      .catch((registrationError) => {
              });
  });
}
*/

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <App />
);

