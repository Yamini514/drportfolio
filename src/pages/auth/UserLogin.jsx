import React, { useState, useEffect, useRef, memo } from 'react';
import { auth, db } from '../../firebase/config';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';

const UserLogin = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentTheme } = useTheme();
  const [formData, setFormData] = useState({ loginId: '', password: '' });
  const [errors, setErrors] = useState({ loginId: '', password: '', general: '' });
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef(null);
  const SESSION_TIMEOUT =  10* 60 * 1000; // 10 minutes

  // Reset session timeout on user activity
  const resetTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(handleTimeout, SESSION_TIMEOUT);
  };

  // Handle session timeout
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

  // Setup session timeout listeners
  const setupSessionTimeout = () => {
    const events = ['mousemove', 'click', 'keypress'];
    events.forEach((event) => window.addEventListener(event, resetTimeout));
    resetTimeout();
  };

  // Clear session timeout listeners
  const clearSessionTimeout = () => {
    const events = ['mousemove', 'click', 'keypress'];
    events.forEach((event) => window.removeEventListener(event, resetTimeout));
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  // Check if user is already logged in
  useEffect(() => {
    if (!auth || !db) {
      setErrors((prev) => ({
        ...prev,
        general: 'Authentication or database service is unavailable. Please try again later.',
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
            if (role !== 'user') {
              throw new Error('Invalid user role');
            }
            const restrictedPaths = ['/login', '/userregister', '/userforgotpassword'];
            let destination = '/';
            if (location.state?.from && !restrictedPaths.includes(location.state.from)) {
              destination = typeof location.state.from === 'string' ? location.state.from : location.state.from.pathname;
            } else if (location.state?.redirectTo && !restrictedPaths.includes(location.state.redirectTo)) {
              destination = location.state.redirectTo;
            } else if (localStorage.getItem('redirectAfterLogin')) {
              destination = localStorage.getItem('redirectAfterLogin');
              localStorage.removeItem('redirectAfterLogin');
            }
            setupSessionTimeout();
            navigate(destination, { replace: true });
          } else {
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
          navigate('/login', {
            state: {
              error: error.message === 'Invalid user role' ? 'Invalid user role. Please contact support.' : 'Failed to verify user.',
            },
          });
        }
      };
      checkUserRole();
    }

    // Add structured data for SEO
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': 'User Login - Dr. Laxminadh Sivaraju',
      'description': 'Secure login for patients of Dr. Laxminadh Sivaraju, a leading Consultant Neuro & Spine Surgeon at Care Hospital.',
      'url': window.location.href,
      'publisher': {
        '@type': 'Person',
        'name': 'Dr. Laxminadh Sivaraju',
      },
    });
    document.head.appendChild(script);

    // Cleanup
    return () => {
      clearSessionTimeout();
      document.head.removeChild(script);
    };
  }, [navigate, location.state]);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '', general: '' }));
  };

  // Validate phone number
  const isPhoneNumber = (input) => {
    return /^\+?\d{10,15}$/.test(input.replace(/\s/g, ''));
  };

  // Validate PID
  const isPID = (input) => {
    return /^PID\d{4}-\d{5}$/.test(input.trim());
  };

  // Validate form inputs
  const validateForm = () => {
    const newErrors = { loginId: '', password: '', general: '' };
    let isValid = true;

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

  // Handle Firebase authentication errors
  const handleFirebaseError = (error) => {
    switch (error.code) {
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return {
          loginId: 'Invalid credentials',
          password: 'Invalid credentials',
          general: 'Please check your email, phone number, PID, or password and try again.',
        };
      case 'auth/too-many-requests':
        return { general: 'Too many login attempts. Please try again later.' };
      case 'auth/network-request-failed':
        return { general: 'Network error. Please check your connection and try again.' };
      case 'auth/user-disabled':
        return { general: 'This account has been disabled. Please contact support.' };
      default:
        return { general: 'Failed to login. Please try again.' };
    }
  };

  // Handle form submission
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrors({ loginId: '', password: '', general: '' });

    try {
      let email;
      if (isPhoneNumber(formData.loginId) || isPID(formData.loginId)) {
        const field = isPhoneNumber(formData.loginId) ? 'phone' : 'pid';
        const value = isPhoneNumber(formData.loginId)
          ? formData.loginId.replace(/[\s\-\(\)]/g, '')
          : formData.loginId.trim();
        const q = query(collection(db, 'users'), where(field, '==', value));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
          throw new Error(`No user found with this ${field === 'phone' ? 'phone number' : 'PID'}.`);
        }
        const userDoc = querySnapshot.docs[0];
        email = userDoc.data().email;
        if (!email) {
          throw new Error('User email not found in Firestore.');
        }
      } else {
        email = formData.loginId.trim();
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, formData.password);
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        const adminDoc = await getDoc(doc(db, 'admins', userCredential.user.uid));
        if (adminDoc.exists()) {
          throw new Error('Please use the admin login page.');
        }
        throw new Error('User data not found in Firestore.');
      }

      const userData = userDoc.data();
      if (userData.role !== 'user') {
        throw new Error('Invalid user role.');
      }

      localStorage.setItem('isUserLoggedIn', 'true');
      localStorage.setItem('userRole', 'user');
      setupSessionTimeout();

      const restrictedPaths = ['/login', '/userregister', '/forgot-password'];
      let destination = '/';
      if (location.state?.redirectTo && !restrictedPaths.includes(location.state.redirectTo)) {
        destination = location.state.redirectTo;
      } else if (location.state?.from && !restrictedPaths.includes(location.state.from)) {
        destination = typeof location.state.from === 'string' ? location.state.from : location.state.from.pathname;
      } else if (localStorage.getItem('redirectAfterLogin')) {
        destination = localStorage.getItem('redirectAfterLogin');
        localStorage.removeItem('redirectAfterLogin');
      }

      navigate(destination, { replace: true });
    } catch (error) {
      console.error('Login error:', error.message);
      await signOut(auth).catch((err) => console.error('Sign out error:', err));
      localStorage.removeItem('isUserLoggedIn');
      localStorage.removeItem('userRole');
      if (error.message.includes('No user found') || error.message.includes('User email not found')) {
        setErrors({ general: error.message });
      } else if (error.message === 'Invalid user role.') {
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
    <>
      {/* SEO Meta Tags */}
      <meta
        name="description"
        content="Secure login for patients of Dr. Laxminadh Sivaraju, a leading Consultant Neuro & Spine Surgeon at Care Hospital."
      />
      <meta
        name="keywords"
        content="user login, Dr. Laxminadh Sivaraju, neurosurgeon, patient portal, Care Hospital"
      />
      <meta name="author" content="Dr. Laxminadh Sivaraju" />

      {/* Open Graph Meta Tags for SMO */}
      <meta
        property="og:title"
        content="User Login - Dr. Laxminadh Sivaraju"
      />
      <meta
        property="og:description"
        content="Log in to access patient services provided by Dr. Laxminadh Sivaraju, a renowned neurosurgeon."
      />
      <meta property="og:image" content="/assets/drimg.png" />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={window.location.href} />

      {/* Twitter Card Meta Tags for SMO */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta
        name="twitter:title"
        content="User Login - Dr. Laxminadh Sivaraju"
      />
      <meta
        name="twitter:description"
        content="Secure login for patients of Dr. Laxminadh Sivaraju's neurosurgery practice."
      />
      <meta name="twitter:image" content="/assets/drimg.png" />

      <section
        className="min-h-screen flex items-center justify-center p-4 sm:p-6"
        style={{
          backgroundColor: currentTheme.background || '#f9fafb',
          color: currentTheme.text?.primary || '#111827',
        }}
        aria-labelledby="login-heading"
      >
        <div
          className="w-full max-w-md space-y-8 p-8 sm:p-10 rounded-lg shadow-md border"
          style={{
            backgroundColor: currentTheme.surface || '#ffffff',
            borderColor: currentTheme.border || '#d1d5db',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          }}
        >
          <header className="text-center">
            <h1
              id="login-heading"
              className="text-3xl font-bold mb-6"
              style={{
                color: currentTheme.text?.primary || '#111827',
              }}
            >
              User Login
            </h1>
            {location.state?.sessionExpired && (
              <div
                className="text-sm mb-6 p-3 rounded-md"
                style={{
                  backgroundColor: currentTheme.background?.error || '#fee2e2',
                  color: currentTheme.text?.error || '#b91c1c',
                }}
                role="alert"
                aria-live="assertive"
              >
                Your session has expired due to inactivity. Please log in again.
              </div>
            )}
            {location.state?.error && (
              <div
                className="text-sm mb-6 p-3 rounded-md"
                style={{
                  backgroundColor: currentTheme.background?.error || '#fee2e2',
                  color: currentTheme.text?.error || '#b91c1c',
                }}
                role="alert"
                aria-live="assertive"
              >
                {location.state.error}
              </div>
            )}
            {errors.general && (
              <div
                className="text-sm mb-6 p-3 rounded-md"
                style={{
                  backgroundColor: currentTheme.background?.error || '#fee2e2',
                  color: currentTheme.text?.error || '#b91c1c',
                }}
                role="alert"
                aria-live="assertive"
              >
                {errors.general}
              </div>
            )}
          </header>
          <form className="space-y-6" onSubmit={handleLogin} noValidate>
            <CustomInput
              label="Email, Phone Number, or PID"
              type="text"
              name="loginId"
              value={formData.loginId}
              onChange={handleChange}
              required
              error={errors.loginId}
              noBackground={false}
              placeholder="Enter your email, phone number, or PID"
              aria-describedby={errors.loginId ? 'loginId-error' : undefined}
              style={{
                color: currentTheme.text?.primary || '#111827',
                backgroundColor: currentTheme.inputBackground || '#f9fafb',
                borderColor: errors.loginId ? '#dc2626' : currentTheme.border || '#d1d5db',
              }}
            />
            {errors.loginId && (
              <p id="loginId-error" className="text-sm" style={{ color: currentTheme.text?.error || '#dc2626' }}>
                {errors.loginId}
              </p>
            )}
            <CustomInput
              label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              error={errors.password}
              noBackground={false}
              placeholder="Enter your password"
              aria-describedby={errors.password ? 'password-error' : undefined}
              style={{
                color: currentTheme.text?.primary || '#111827',
                backgroundColor: currentTheme.inputBackground || '#f9fafb',
                borderColor: errors.password ? '#dc2626' : currentTheme.border || '#d1d5db',
              }}
            />
            {errors.password && (
              <p id="password-error" className="text-sm" style={{ color: currentTheme.text?.error || '#dc2626' }}>
                {errors.password}
              </p>
            )}
            <div className="space-y-4">
              <CustomButton
                type="submit"
                disabled={loading}
                className="w-full justify-center py-3 text-lg font-medium transition-colors duration-200 hover:bg-opacity-90"
                style={{
                  backgroundColor: loading
                    ? currentTheme.disabled || '#9ca3af'
                    : currentTheme.primary || '#6366f1',
                  color: currentTheme.text?.button || '#ffffff',
                }}
                aria-label={loading ? 'Logging in' : 'Sign In'}
              >
                {loading ? 'Logging in...' : 'Sign In'}
              </CustomButton>
              <div className="flex justify-between text-sm">
                <button
                  type="button"
                  onClick={() => navigate('/userforgotpassword')}
                  className="font-medium hover:underline transition-colors duration-200"
                  style={{
                    color: currentTheme.primary || '#6366f1',
                  }}
                  aria-label="Navigate to forgot password page"
                >
                  Forgot Password?
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/userregister')}
                  className="font-medium hover:underline transition-colors duration-200"
                  style={{
                    color: currentTheme.primary || '#6366f1',
                  }}
                  aria-label="Navigate to registration page"
                >
                  Create an Account
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>
    </>
  );
};

export default memo(UserLogin);