import React from 'react'
import SEO from './SEO'
import '../styles/Services.css'


export default function Services({ darkMode = false }) {
  return (
    <>
      <SEO 
        title="Our Services - E-Commerce Store | Premium Service"
        description="Discover our premium services: secure online shopping, fast delivery, secure payments, easy returns, personalized experience, and 24/7 support."
        keywords="store services, online shopping, fast delivery, secure payments, easy returns, customer support, personalized experience"
        url="https://yahia-dev-1.github.io/E-Commer-React/services"
      />
      <div className={`services-container ${darkMode ? 'dark-mode' : ''}`}>
      <div className="services-header">
        <h1>Our Services</h1>
        <p>Discover the amazing services we offer to enhance your shopping experience</p>
      </div>
      
      <div className="services-grid">
        <div className="service-card">
          <span className="service-icon">🛒</span>
          <h3>Online Shopping</h3>
          <p>Browse and purchase products from the comfort of your home with our user-friendly interface.</p>
          <ul className="service-features">
            <li>Wide product selection</li>
            <li>Secure payment options</li>
            <li>24/7 availability</li>
            <li>Mobile-friendly design</li>
          </ul>
        </div>

        <div className="service-card">
          <span className="service-icon">🚚</span>
          <h3>Fast Delivery</h3>
          <p>Get your orders delivered quickly and safely to your doorstep with our reliable delivery service.</p>
          <ul className="service-features">
            <li>Same-day delivery available</li>
            <li>Real-time tracking</li>
            <li>Nationwide coverage</li>
            <li>Professional delivery team</li>
          </ul>
        </div>

        <div className="service-card">
          <span className="service-icon">💳</span>
          <h3>Secure Payments</h3>
          <p>Shop with confidence using our secure payment system that protects your financial information.</p>
          <ul className="service-features">
            <li>Multiple payment methods</li>
            <li>SSL encryption</li>
            <li>Fraud protection</li>
            <li>Secure checkout process</li>
          </ul>
        </div>

        <div className="service-card">
          <span className="service-icon">🔄</span>
          <h3>Easy Returns</h3>
          <p>Not satisfied? No problem! We offer hassle-free returns and exchanges for all products.</p>
          <ul className="service-features">
            <li>30-day return policy</li>
            <li>Free return shipping</li>
            <li>Quick refund process</li>
            <li>No questions asked</li>
          </ul>
        </div>

        <div className="service-card">
          <span className="service-icon">🎯</span>
          <h3>Personalized Experience</h3>
          <p>Enjoy a tailored shopping experience with personalized recommendations and offers.</p>
          <ul className="service-features">
            <li>Smart recommendations</li>
            <li>Personalized offers</li>
            <li>Wishlist functionality</li>
            <li>Order history tracking</li>
          </ul>
        </div>

        <div className="service-card">
          <span className="service-icon">📞</span>
          <h3>24/7 Support</h3>
          <p>Our dedicated customer support team is available around the clock to help you with any questions.</p>
          <ul className="service-features">
            <li>Live chat support</li>
            <li>Phone assistance</li>
            <li>Email support</li>
            <li>FAQ section</li>
          </ul>
        </div>
      </div>
      
      
    </div>
    </>
  )
}
