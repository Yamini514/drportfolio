import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../../firebase/config';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';

const UserLogin = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({ email: '', password: '', general: '' });
  const [loading, setLoading] = useState(false);
  const { currentTheme } = useTheme();

  // Session timeout logic
  const timeoutRef = useRef(null);
  const SESSION_TIMEOUT = 2 * 60 * 1000; // 2 minutes

  const resetTimeout = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(handleTimeout, SESSION_TIMEOUT);
  };

  const handleTimeout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('isUserLoggedIn');
      localStorage.removeItem('userRole');
      navigate('/login', { state: { sessionExpired: true } });
    } catch (error) {
      console.error('Logout error:', error.message);
      localStorage.removeItem('isUserLoggedIn');
      localStorage.removeItem('userRole');
      navigate('/login', { state: { sessionExpired: true } });
    }
  };

  const setupSessionTimeout = () => {
    const events = ['mousemove', 'click', 'keypress'];
    events.forEach((event) => window.addEventListener(event, resetTimeout));
    resetTimeout();
  };

  const clearSessionTimeout = () => {
    const events = ['mousemove', 'click', 'keypress'];
    events.forEach((event) => window.removeEventListener(event, resetTimeout));
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  useEffect(() => {
    console.log('Location state:', location.state);
    if (!auth || !db) {
      console.error('Firebase auth or Firestore is not initialized. Check firebase/config.js');
      setErrors((prev) => ({
        ...prev,
        general: 'Authentication or database service is not available. Please try again later.',
      }));
      return;
    }

    const isUserLoggedIn = localStorage.getItem('isUserLoggedIn') === 'true';
    if (isUserLoggedIn && auth.currentUser) {
      const checkUserRole = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
          if (userDoc.exists()) {
            const role = userDoc.data().role;
            const from = location.state?.from || location.state?.redirectTo;
            const restrictedPaths = ['/login', '/userregister'];
            let destination;
            if (typeof from === 'string' && !restrictedPaths.includes(from)) {
              destination = from;
            } else if (from?.pathname && !restrictedPaths.includes(from.pathname)) {
              destination = from.pathname;
            } else {
              destination = localStorage.getItem('redirectAfterLogin') || '/';
              localStorage.removeItem('redirectAfterLogin');
            }
            console.log(`Already logged in as ${role}, navigating to: ${destination}`);
            setupSessionTimeout();
            navigate(destination, { replace: true });
          } else {
            console.error('User data not found in Firestore');
            await signOut(auth);
            localStorage.removeItem('isUserLoggedIn');
            localStorage.removeItem('userRole');
            navigate('/login', { state: { error: 'User data not found. Please contact support.' } });
          }
        } catch (error) {
          console.error('Error checking user role:', error.message);
          await signOut(auth);
          localStorage.removeItem('isUserLoggedIn');
          localStorage.removeItem('userRole');
          navigate('/login', { state: { error: 'Failed to verify user. Please try again.' } });
        }
      };
      checkUserRole();
    }

    return () => clearSessionTimeout();
  }, [navigate, location.state?.from, location.state?.redirectTo]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '', general: '' }));
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = { email: '', password: '', general: '' };

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleFirebaseError = (error) => {
    switch (error.code) {
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return {
          email: 'Invalid email or password',
          password: 'Invalid email or password',
          general: 'Please check your credentials and try again.',
        };
      case 'auth/too-many-requests':
        return { general: 'Too many login attempts. Please try again later.' };
      case 'auth/network-request-failed':
        return { general: 'Network error. Please check your connection and try again.' };
      case 'auth/user-disabled':
        return { general: 'This account has been disabled. Please contact support.' };
      default:
        return { general: 'Failed to login. Please try again or contact support.' };
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrors({ email: '', password: '', general: '' });

    try {
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      // Fetch user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const role = userData.role;

        // Validate user role
        if (role !== 'user') {
          throw new Error('Invalid user role');
        }

        // Store login state and role in localStorage
        localStorage.setItem('isUserLoggedIn', 'true');
        localStorage.setItem('userRole', role);
        setupSessionTimeout();

        console.log(`Login successful as ${role}`);

        // Determine redirect destination
        let destination = '/';
        const storedRedirect = localStorage.getItem('redirectAfterLogin');
        if (storedRedirect) {
          destination = storedRedirect;
          localStorage.removeItem('redirectAfterLogin');
        } else if (location.state?.redirectTo) {
          destination = location.state.redirectTo;
        } else if (location.state?.from) {
          const from = location.state.from;
          const restrictedPaths = ['/login', '/userregister'];
          if (typeof from === 'string' && !restrictedPaths.includes(from)) {
            destination = from;
          } else if (from?.pathname && !restrictedPaths.includes(from.pathname)) {
            destination = from.pathname;
          }
        }

        console.log(`Navigating to: ${destination}`);
        navigate(destination, { replace: true });
      } else {
        // Check if user is an admin
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        if (adminDoc.exists()) {
          throw new Error('Please use the admin login page.');
        } else {
          throw new Error('User data not found in Firestore');
        }
      }
    } catch (error) {
      console.error('Login error:', error.code || 'custom-error', error.message);
      await signOut(auth).catch((err) => console.error('Sign out error:', err));
      localStorage.removeItem('isUserLoggedIn');
      localStorage.removeItem('userRole');
      if (error.message === 'User data not found in Firestore') {
        setErrors({ general: 'User data not found. Please contact support.' });
      } else if (error.message === 'Invalid user role') {
        setErrors({ general: 'Invalid user role. Please contact support.' });
      } else if (error.message === 'Please use the admin login page.') {
        setErrors({ general: 'Please use the admin login page.' });
      } else {
        setErrors(handleFirebaseError(error));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: currentTheme.background.primary }}
    >
      <div
        className="w-full max-w-md space-y-8 p-8 rounded-xl shadow-lg border-2"
        style={{
          backgroundColor: currentTheme.surface,
          borderColor: currentTheme.primary || '#8B5CF6',
          boxShadow: `0 4px 6px rgba(0, 0, 0, 0.3)`,
        }}
      >
        <div>
          <h2
            className="text-3xl font-bold text-center mb-8"
            style={{ color: currentTheme.text.primary }}
          >
            User Login
          </h2>
          {location.state?.sessionExpired && (
            <p
              className="text-center text-sm mb-4"
              style={{ color: currentTheme.text.error || '#EF4444' }}
            >
              Session expired due to inactivity. Please log in again.
            </p>
          )}
          {location.state?.error && (
            <p
              className="text-center text-sm mb-4"
              style={{ color: currentTheme.text.error || '#EF4444' }}
            >
              {location.state.error}
            </p>
          )}
          {errors.general && (
            <p
              className="text-center text-sm mb-4"
              style={{ color: currentTheme.text.error || '#EF4444' }}
            >
              {errors.general}
            </p>
          )}
        </div>
        <form className="space-y-6" onSubmit={handleLogin}>
          <CustomInput
            label="Email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            error={errors.email}
            noBackground={true}
          />
          <CustomInput
            label="Password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            error={errors.password}
          />
          <div className="flex flex-col space-y-4">
            <CustomButton
              type="submit"
              disabled={loading}
              className="justify-center"
            >
              {loading ? 'Logging in...' : 'Login'}
            </CustomButton>
            <p
              className="text-center text-sm"
              style={{ color: currentTheme.text.secondary }}
            >
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/userregister')}
                className="font-medium hover:underline text-center"
                style={{ color: currentTheme.primary }}
                aria-label="Navigate to registration page"
              >
                Register here
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserLogin;