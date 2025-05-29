import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase/config';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const AdminLogin = () => {
  const { currentTheme } = useTheme();
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Dummy admin credentials
  const exampleData = {
    email: "admin@gmail.com",
    password: "admin@123"
  };

  useEffect(() => {
    // Check for saved credentials when component mounts
    const savedEmail = localStorage.getItem('adminEmail');
    const savedRememberMe = localStorage.getItem('rememberMe') === 'true';
    
    if (savedEmail && savedRememberMe) {
      setCredentials(prev => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password
      );

      if (userCredential.user) {
        // Handle remember me functionality
        if (rememberMe) {
          localStorage.setItem('adminEmail', credentials.email);
          localStorage.setItem('rememberMe', 'true');
        } else {
          localStorage.removeItem('adminEmail');
          localStorage.removeItem('rememberMe');
        }

        localStorage.setItem('adminToken', await userCredential.user.getIdToken());
        localStorage.setItem('isAdminLoggedIn', 'true');
        
        navigate('/admin/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" 
      style={{ backgroundColor: currentTheme.background }}>
      <div 
        className="max-w-md w-full space-y-8 p-8 rounded-xl"
        style={{ 
          backgroundColor: currentTheme.surface,
          boxShadow: `0 4px 6px -1px ${currentTheme.shadow || 'rgba(0, 0, 0, 0.1)'}, 0 2px 4px -1px ${currentTheme.shadow || 'rgba(0, 0, 0, 0.06)'}`,
        }}
      >
        <div className="text-center">
          <h2 className="text-3xl font-bold" style={{ color: currentTheme.text.primary }}>
            Admin Login
          </h2>
          {/* Display dummy credentials for development */}
          {/* <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm">
            <p className="text-blue-800 font-medium">Demo Credentials:</p>
            <p className="text-blue-600">Email: {exampleData.email}</p>
            <p className="text-blue-600">Password: {exampleData.password}</p>
          </div> */}
        </div>
        <form onSubmit={handleLogin} className="mt-8 space-y-6">
          <div className="space-y-4">
            <CustomInput
              type="email"
              name="email"
              placeholder="Email address"
              value={credentials.email}
              onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
              required
            />
            <div className="relative">
              <CustomInput
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
                onClick={() => setShowPassword(!showPassword)}
                style={{ color: currentTheme.text.primary }}
              >
                {showPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2 block text-sm"
                  style={{ color: currentTheme.text.primary }}
                >
                  Remember me
                </label>
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}
          </div>
          
          <CustomButton
            type="submit"
            loading={loading}
            className="w-full py-2 justify-center"
          >
            {loading ? "Signing in..." : "Sign in"}
          </CustomButton>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;