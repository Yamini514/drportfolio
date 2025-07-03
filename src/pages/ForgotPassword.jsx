import React, { useState, useEffect, memo } from 'react';
import { auth, db } from '../firebase/config';
import { sendPasswordResetEmail } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { currentTheme } = useTheme();

  // Check if email exists in Firestore
  const checkEmailExists = async (email) => {
    try {
      const trimmedEmail = email.trim();
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', trimmedEmail));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking email:', error);
      return false;
    }
  };

  // Handle password reset submission
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setError('Email address is required');
      setLoading(false);
      return;
    } else if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      const emailExists = await checkEmailExists(email);
      if (!emailExists) {
        setError('No account found with this email address.');
        setLoading(false);
        return;
      }

      await sendPasswordResetEmail(auth, email.trim());
      setMessage('Password reset email sent! Please check your inbox.');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      switch (error.code) {
        case 'auth/invalid-email':
          setError('Invalid email format');
          break;
        case 'auth/user-not-found':
          setError('No account found with this email address.');
          break;
        case 'auth/too-many-requests':
          setError('Too many requests. Please try again later.');
          break;
        default:
          setError('Failed to send password reset email. Please try again.');
      }
      console.error('Password reset error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Add structured data for SEO
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': 'Forgot Password - Dr. Laxminadh Sivaraju',
      'description': 'Reset your password for Dr. Laxminadh Sivaraju’s patient portal.',
      'url': window.location.href,
      'publisher': {
        '@type': 'Person',
        'name': 'Dr. Laxminadh Sivaraju',
      },
    });
    document.head.appendChild(script);

    // Cleanup
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return (
    <>
      {/* SEO Meta Tags */}
      <meta
        name="description"
        content="Reset your password for Dr. Laxminadh Sivaraju’s patient portal to access neurosurgery services."
      />
      <meta
        name="keywords"
        content="forgot password, Dr. Laxminadh Sivaraju, neurosurgeon, patient portal, password reset"
      />
      <meta name="author" content="Dr. Laxminadh Sivaraju" />

      {/* Open Graph Meta Tags for SMO */}
      <meta
        property="og:title"
        content="Forgot Password - Dr. Laxminadh Sivaraju"
      />
      <meta
        property="og:description"
        content="Reset your password to access patient services provided by Dr. Laxminadh Sivaraju."
      />
      <meta property="og:image" content="/assets/drimg.png" />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={window.location.href} />

      {/* Twitter Card Meta Tags for SMO */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta
        name="twitter:title"
        content="Forgot Password - Dr. Laxminadh Sivaraju"
      />
      <meta
        name="twitter:description"
        content="Reset your password for Dr. Laxminadh Sivaraju’s patient portal."
      />
      <meta name="twitter:image" content="/assets/drimg.png" />

      <section
        className="min-h-screen flex items-center justify-center p-4 sm:p-6"
        style={{
          backgroundColor: currentTheme.background || '#f9fafb',
          color: currentTheme.text?.primary || '#111827',
        }}
        aria-labelledby="forgot-password-heading"
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
              id="forgot-password-heading"
              className="text-3xl font-bold mb-6"
              style={{ color: currentTheme.text?.primary || '#111827' }}
            >
              Reset Password
            </h1>
            {error && (
              <div
                className="text-sm mb-6 p-3 rounded-md"
                style={{
                  backgroundColor: currentTheme.background?.error || '#fee2e2',
                  color: currentTheme.text?.error || '#b91c1c',
                }}
                role="alert"
                aria-live="assertive"
              >
                {error}
              </div>
            )}
            {message && (
              <div
                className="text-sm mb-6 p-3 rounded-md"
                style={{
                  backgroundColor: currentTheme.background?.success || '#d1fae5',
                  color: currentTheme.text?.success || '#065f46',
                }}
                role="alert"
                aria-live="assertive"
              >
                {message}
              </div>
            )}
          </header>
          <form className="space-y-6" onSubmit={handleResetPassword} noValidate>
            <CustomInput
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email address"
              style={{
                color: currentTheme.text?.primary || '#111827',
                backgroundColor: currentTheme.inputBackground || '#f9fafb',
                borderColor: error ? '#dc2626' : currentTheme.border || '#d1d5db',
              }}
              aria-describedby={error ? 'email-error' : undefined}
            />
            {error && (
              <p id="email-error" className="text-sm" style={{ color: currentTheme.text?.error || '#dc2626' }}>
                {error}
              </p>
            )}
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
              aria-label={loading ? 'Sending reset email' : 'Reset Password'}
            >
              {loading ? 'Sending...' : 'Reset Password'}
            </CustomButton>
            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-sm font-medium hover:underline transition-colors duration-200"
                style={{ color: currentTheme.primary || '#6366f1' }}
                aria-label="Back to login page"
              >
                Back to Login
              </button>
            </div>
          </form>
        </div>
      </section>
    </>
  );
};

export default memo(ForgotPassword);