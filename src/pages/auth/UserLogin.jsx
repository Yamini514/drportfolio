
import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../../firebase/config';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';
import bcrypt from 'bcryptjs';

const UserLogin = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ loginId: '', password: '' });
  const [errors, setErrors] = useState({ loginId: '', password: '', general: '' });
  const [loading, setLoading] = useState(false);
  const { currentTheme } = useTheme();

  const timeoutRef = useRef(null);
  const SESSION_TIMEOUT = 2 * 60 * 1000;

  const resetTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
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
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  useEffect(() => {
    if (!auth || !db) {
      console.error('Firebase auth or Firestore is not initialized.');
      setErrors((prev) => ({
        ...prev,
        general: 'Authentication or database service is not available.',
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
            const restrictedPaths = ['/login', '/userregister', '/userforgotpassword'];
            let destination;
            if (typeof from === 'string' && !restrictedPaths.includes(from)) {
              destination = from;
            } else if (from?.pathname && !restrictedPaths.includes(from.pathname)) {
              destination = from.pathname;
            } else {
              destination = localStorage.getItem('redirectAfterLogin') || '/';
              localStorage.removeItem('redirectAfterLogin');
            }
            setupSessionTimeout();
            navigate(destination, { replace: true });
          } else {
            console.error('User data not found in Firestore');
            await signOut(auth);
            localStorage.removeItem('isUserLoggedIn');
            localStorage.removeItem('userRole');
            navigate('/login', { state: { error: 'User data not found.' } });
          }
        } catch (error) {
          console.error('Error checking user role:', error.message);
          await signOut(auth);
          localStorage.removeItem('isUserLoggedIn');
          localStorage.removeItem('userRole');
          navigate('/login', { state: { error: 'Failed to verify user.' } });
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

  const isPhoneNumber = (input) => {
    return /^\+?\d{10,15}$/.test(input.replace(/\s/g, ''));
  };

  const isPID = (input) => {
    return /^PID\d{4}-\d{5}$/.test(input.trim());
  };

  const standardizePhoneNumber = (phone) => {
    let cleaned = phone.replace(/[\s\-\(\)]/g, '');
    if (!cleaned.startsWith('+')) {
      cleaned = `+91${cleaned}`;
    }
    return cleaned;
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = { loginId: '', password: '', general: '' };

    if (!formData.loginId.trim()) {
      newErrors.loginId = 'Email, phone number, or PID is required';
      isValid = false;
    } else if (
      !isPhoneNumber(formData.loginId) &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.loginId.trim()) &&
      !isPID(formData.loginId)
    ) {
      newErrors.loginId = 'Please enter a valid email, phone number, or PID';
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
          loginId: 'Invalid email, phone number, PID, or password',
          password: 'Invalid email, phone number, PID, or password',
          general: 'Please check your credentials and try again.',
        };
      case 'auth/too-many-requests':
        return { general: 'Too many login attempts. Please try again later.' };
      case 'auth/network-request-failed':
        return { general: 'Network error. Please check your connection.' };
      case 'auth/user-disabled':
        return { general: 'This account has been disabled.' };
      default:
        return { general: 'Failed to login. Please try again.' };
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrors({ loginId: '', password: '', general: '' });

    try {
      let userCredential;
      let userDoc;
      let email;

      if (isPhoneNumber(formData.loginId) || isPID(formData.loginId)) {
        const field = isPhoneNumber(formData.loginId) ? 'phone' : 'pid';
        const value = isPhoneNumber(formData.loginId)
          ? formData.loginId.replace(/[\s\-\(\)]/g, '')
          : formData.loginId.trim();
        console.log(`Querying Firestore for ${field}:`, value);
        const q = query(collection(db, 'users'), where(field, '==', value));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
          console.log(`No user found for ${field}:`, value);
          throw new Error(`No user found with this ${field === 'phone' ? 'phone number' : 'PID'}. Please check or register.`);
        }

        userDoc = querySnapshot.docs[0];
        const userId = userDoc.id;
        const userData = userDoc.data();

        // Verify password
        const isValidPassword = bcrypt.compareSync(formData.password, userData.password);
        if (!isValidPassword) {
          throw new Error('Invalid password.');
        }

        email = userData.email || `${userData.phone}@example.com`;
        userCredential = await signInWithEmailAndPassword(auth, email, formData.password);
      } else {
        email = formData.loginId.trim();
        userCredential = await signInWithEmailAndPassword(auth, email, formData.password);
        const userDocRef = doc(db, 'users', userCredential.user.uid);
        userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
          throw new Error('User data not found in Firestore');
        }
        const userData = userDoc.data();
        const isValidPassword = bcrypt.compareSync(formData.password, userData.password);
        if (!isValidPassword) {
          throw new Error('Invalid password.');
        }
      }

      const user = userCredential.user;
      const userDocRef = doc(db, 'users', user.uid);
      const userDocData = await getDoc(userDocRef);
      if (!userDocData.exists()) {
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        if (adminDoc.exists()) {
          throw new Error('Please use the admin login page.');
        }
        throw new Error('User data not found in Firestore');
      }
      if (userDocData.data().role !== 'user') {
        throw new Error('Invalid user role');
      }

      localStorage.setItem('isUserLoggedIn', 'true');
      localStorage.setItem('userRole', 'user');
      setupSessionTimeout();

      let destination = '/';
      const storedRedirect = localStorage.getItem('redirectAfterLogin');
      if (storedRedirect) {
        destination = storedRedirect;
        localStorage.removeItem('redirectAfterLogin');
      } else if (location.state?.redirectTo) {
        destination = location.state.redirectTo;
      } else if (location.state?.from) {
        const from = location.state.from;
        const restrictedPaths = ['/login', '/userregister', '/forgot-password'];
        if (typeof from === 'string' && !restrictedPaths.includes(from)) {
          destination = from;
        } else if (from?.pathname && !restrictedPaths.includes(from.pathname)) {
          destination = from.pathname;
        }
      }

      navigate(destination, { replace: true });
    } catch (error) {
      console.error('Login error:', error.message);
      await signOut(auth).catch((err) => console.error('Sign out error:', err));
      localStorage.removeItem('isUserLoggedIn');
      localStorage.removeItem('userRole');
      if (error.message.includes('No user found')) {
        setErrors({ general: error.message });
      } else if (error.message === 'Invalid user role') {
        setErrors({ general: 'Invalid user role. Please contact support.' });
      } else if (error.message === 'Please use the admin login page.') {
        setErrors({ general: 'Please use the admin login page.' });
      } else if (error.message === 'Invalid password.') {
        setErrors({ password: 'Invalid password', general: 'Please check your password and try again.' });
      } else {
        setErrors(handleFirebaseError(error));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 sm:p-6"
      style={{ backgroundColor: currentTheme.background.primary }}
    >
      <div
        className="w-full max-w-md space-y-8 p-8 sm:p-10 rounded-2xl shadow-xl border-2"
        style={{
          backgroundColor: currentTheme.background.primary,
          borderColor: currentTheme.primary || '#8B5CF6',
          boxShadow: '0 6px 12px rgba(0, 0, 0, 0.2)',
        }}
      >
        <div className="text-center">
          <h2
            className="text-3xl font-bold mb-6"
            style={{ color: currentTheme.text.primary }}
          >
            User Login
          </h2>
          {location.state?.sessionExpired && (
            <div
              className="text-sm mb-6 p-3 rounded-md"
              style={{
                backgroundColor: currentTheme.background.error || '#FEE2E2',
                color: currentTheme.text.error || '#EF4444',
              }}
              role="alert"
            >
              Your session has expired due to inactivity. Please log in again.
            </div>
          )}
          {location.state?.error && (
            <div
              className="text-sm mb-6 p-3 rounded-md"
              style={{
                backgroundColor: currentTheme.background.error || '#FEE2E2',
                color: currentTheme.text.error || '#EF4444',
              }}
              role="alert"
            >
              {location.state.error}
            </div>
          )}
          {errors.general && (
            <div
              className="text-sm mb-6 p-3 rounded-md"
              style={{
                backgroundColor: currentTheme.background.error || '#FEE2E2',
                color: currentTheme.text.error || '#EF4444',
              }}
              role="alert"
            >
              {errors.general}
            </div>
          )}
        </div>
        <form className="space-y-6" onSubmit={handleLogin}>
          <CustomInput
            label="Email, Phone Number, or PID"
            type="text"
            name="loginId"
            value={formData.loginId}
            onChange={handleChange}
            required
            error={errors.loginId}
            noBackground={true}
            placeholder="Enter your email, phone number, or PID"
            aria-describedby="loginId-error"
          />
          <CustomInput
            label="Password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            error={errors.password}
            noBackground={true}
            placeholder="Enter your password"
            aria-describedby="password-error"
          />
          <div className="space-y-4">
            <CustomButton
              type="submit"
              disabled={loading}
              className="w-full justify-center py-3 text-lg font-medium transition-colors duration-200 hover:bg-opacity-90"
              style={{
                backgroundColor: loading ? currentTheme.disabled : currentTheme.primary,
                color: currentTheme.text.button,
              }}
            >
              {loading ? 'Logging in...' : 'Sign In'}
            </CustomButton>
            <div className="flex justify-between text-sm">
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="font-medium hover:underline transition-colors duration-200"
                style={{ color: currentTheme.primary || '#8B5CF6' }}
                aria-label="Navigate to forgot password page"
              >
                Forgot Password?
              </button>
              <button
                type="button"
                onClick={() => navigate('/userregister')}
                className="font-medium hover:underline transition-colors duration-200"
                style={{ color: currentTheme.primary || '#8B5CF6' }}
                aria-label="Navigate to registration page"
              >
                Create an Account
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserLogin;
