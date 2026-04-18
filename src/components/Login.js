import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Login.css';
import database from '../utils/database';
import { addUserToSupabase, getUsersFromSupabase } from '../utils/supabase';


export default function Login({ onLogin, darkMode = false }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!formData.email || !formData.password) {
        setError('Please fill in all fields');
        return;
      }

      if (!isLogin && formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      if (!isLogin && formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }

      if (isLogin) {
        // Login - Try Supabase first
        let user = null;

        // Try to get user from Supabase
        try {
          const supabaseUsers = await getUsersFromSupabase();
          if (Array.isArray(supabaseUsers)) {
            const supabaseUser = supabaseUsers.find(u =>
              u.email.toLowerCase() === formData.email.toLowerCase() &&
              u.password === formData.password
            );
            if (supabaseUser) {
              user = supabaseUser;
              // Sync to localStorage
              const localUsers = database.getUsers();
              const localUserExists = localUsers.some(u => u.email === supabaseUser.email);
              if (!localUserExists) {
                database.registerUser({
                  email: supabaseUser.email,
                  password: supabaseUser.password,
                  name: supabaseUser.name
                });
              }
            }
          }
        } catch (error) {
                  }

        // Fallback to localStorage
        if (!user) {
          user = database.validateLogin(formData.email, formData.password);
        }

        if (user) {
          setSuccess('Login successful!');
          // Save current user email to localStorage for admin access
          localStorage.setItem('currentUserEmail', user.email);
          setTimeout(() => {
            onLogin(user);
            navigate('/');
          }, 1000);
        } else {
          setError('Invalid email or password');
        }
      } else {
        // Register new user - Try Supabase first
        try {
          // Check if user exists in Supabase
          const existingUsers = await getUsersFromSupabase();
          if (Array.isArray(existingUsers) && existingUsers.some(user => user.email === formData.email)) {
            setError('User already exists');
            return;
          }
          
          // Add to Supabase
          const newUser = await addUserToSupabase({
            email: formData.email,
            password: formData.password,
            name: formData.email.split('@')[0],
            isAdmin: false
          });
          
          // Also add to localStorage for offline
          database.registerUser({
            email: formData.email,
            password: formData.password,
            name: formData.email.split('@')[0]
          });
          
          setSuccess('Account created successfully!');
          localStorage.setItem('currentUserEmail', newUser.email);
          setTimeout(() => {
            onLogin(newUser);
            navigate('/');
          }, 1000);
        } catch (error) {
                    // Fallback to localStorage only
          try {
            const newUser = database.registerUser({
              email: formData.email,
              password: formData.password,
              name: formData.email.split('@')[0]
            });
            setSuccess('Account created locally!');
            localStorage.setItem('currentUserEmail', newUser.email);
            setTimeout(() => {
              onLogin(newUser);
              navigate('/');
            }, 1000);
          } catch (localError) {
            setError(localError.message);
          }
        }
      }
    } catch (error) {
      setError('An unexpected error occurred');
          } finally {
      setIsLoading(false);
    }
  };

  const handleToggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setSuccess('');
    setFormData({ email: '', password: '', confirmPassword: '' });
  };

  return (
    <div className={`login-container ${darkMode ? 'dark-mode' : ''}`}>
      <div className="login-card">
        <div className="login-header">
          <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
          <p>{isLogin ? 'Sign in to your account' : 'Join us today'}</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Enter your email"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter your password"
              required
              disabled={isLoading}
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm your password"
                required
                disabled={isLoading}
              />
            </div>
          )}

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <button 
            type="submit" 
            className="submit-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="login-footer">
          <p>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              className="toggle-btn"
              onClick={handleToggleMode}
              disabled={isLoading}
            >
              {isLogin ? 'Create Account' : 'Sign In'}
            </button>
          </p>
        </div>

       
      </div>
      
      
    </div>
  );
} 