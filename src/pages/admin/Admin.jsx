import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';

function Admin() {
  const { currentTheme } = useTheme();
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (credentials.username === 'admin' && credentials.password === 'password') {
      localStorage.setItem('isAdmin', 'true');
      navigate('/admin/dashboard');
    } else {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen pt-16 md:pt-24 pb-8 md:pb-16 px-4" style={{ backgroundColor: currentTheme.background }}>
      <div className="container mx-auto max-w-md">
        <div 
          className="p-6 md:p-8 rounded-lg border shadow-lg"
          style={{ backgroundColor: currentTheme.surface, borderColor: currentTheme.border }}
        >
          <h1 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">Admin Login</h1>
          <form onSubmit={handleLogin}>
            <div className="mb-3 md:mb-4">
              <label className="block text-sm md:text-base mb-1 md:mb-2">Username</label>
              <input
                type="text"
                value={credentials.username}
                onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                className="w-full px-3 md:px-4 py-2 rounded border text-sm md:text-base"
                style={{ borderColor: currentTheme.border }}
                required
              />
            </div>
            <div className="mb-4 md:mb-6">
              <label className="block text-sm md:text-base mb-1 md:mb-2">Password</label>
              <input
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                className="w-full px-3 md:px-4 py-2 rounded border text-sm md:text-base"
                style={{ borderColor: currentTheme.border }}
                required
              />
            </div>
            {error && <p className="text-red-500 text-sm md:text-base mb-3 md:mb-4">{error}</p>}
            <button 
              type="submit"
              className="w-full px-4 py-2 md:py-3 rounded text-sm md:text-base font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: currentTheme.primary, color: 'white' }}
            >
              Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Admin;