import React, { useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { auth, db } from '../../firebase/config';
import { createUserWithEmailAndPassword, fetchSignInMethodsForEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs, setDoc, doc } from 'firebase/firestore';
import CustomButton from '../../components/CustomButton';
import CustomInput from '../../components/CustomInput';

// Constants
const INITIAL_FORM_DATA = {
  name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
};

const INITIAL_ERRORS = {
  name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  general: '',
};

const UserRegister = () => {
  // State
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState(INITIAL_ERRORS);
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [pid, setPid] = useState('');
  const [showWhatsAppPrompt, setShowWhatsAppPrompt] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const navigate = useNavigate();
  const { currentTheme } = useTheme();

  // Generate unique PID
  const generatePID = async () => {
    const currentYear = new Date().getFullYear();
    const maxAttempts = 5;
    let attempts = 0;
    let pid;
    let isUnique = false;

    while (!isUnique && attempts < maxAttempts) {
      const randomDigits = Math.floor(10000 + Math.random() * 90000);
      pid = `PID${currentYear}-${randomDigits}`;
      const usersRef = collection(db, 'users');
      const pidQuery = query(usersRef, where('pid', '==', pid));
      const pidSnapshot = await getDocs(pidQuery);
      isUnique = pidSnapshot.empty;
      attempts++;
    }

    if (!isUnique) {
      throw new Error('Unable to generate unique PID after multiple attempts.');
    }

    return pid;
  };

  // Validate form inputs
  const validateForm = async () => {
    const newErrors = { ...INITIAL_ERRORS };
    let isValid = true;

    // Name validation
    if (formData.name.trim().length < 3) {
      newErrors.name = 'Name must be at least 3 characters long';
      isValid = false;
    } else {
      const usersRef = collection(db, 'users');
      const nameQuery = query(usersRef, where('name', '==', formData.name.trim()));
      const nameSnapshot = await getDocs(nameQuery);
      if (!nameSnapshot.empty) {
        newErrors.name = 'This name is already taken. Please choose another.';
        isValid = false;
      }
    }

    // Phone validation
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
      isValid = false;
    }

    // Email validation (optional)
    if (formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
        isValid = false;
      }
    }

    // Password validation
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      newErrors.password =
        'Password must be at least 8 characters with a letter, number, and special character';
      isValid = false;
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // Handle Firebase errors
  const handleFirebaseError = (error) => {
    switch (error.code) {
      case 'auth/email-already-in-use':
        return { email: 'This email is already registered. Please login.' };
      case 'auth/invalid-email':
        return { email: 'Invalid email format' };
      case 'auth/weak-password':
        return { password: 'Password is too weak' };
      case 'auth/network-request-failed':
        return { general: 'Network error. Please check your connection.' };
      default:
        return { general: error.message || 'Registration error occurred' };
    }
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '', general: '' }));
    setSuccess('');
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!(await validateForm())) return;

    setErrors(INITIAL_ERRORS);
    setSuccess('');
    setLoading(true);

    try {
      const authEmail = formData.email || `${formData.phone}@example.com`;
      const usersRef = collection(db, 'users');
      const adminsRef = collection(db, 'admins');
      const emailQuery = query(usersRef, where('email', '==', formData.email));
      const phoneQuery = query(usersRef, where('phone', '==', formData.phone));
      const adminEmailQuery = query(adminsRef, where('email', '==', formData.email));

      const [emailSnapshot, phoneSnapshot, adminEmailSnapshot] = await Promise.all([
        getDocs(emailQuery),
        getDocs(phoneQuery),
        getDocs(adminEmailQuery),
      ]);

      if (!emailSnapshot.empty || !phoneSnapshot.empty || !adminEmailSnapshot.empty) {
        setErrors((prev) => ({
          ...prev,
          general: 'Account with this email or phone already exists.',
        }));
        setLoading(false);
        return;
      }

      const signInMethods = await fetchSignInMethodsForEmail(auth, authEmail);
      if (signInMethods.length > 0) {
        setErrors((prev) => ({
          ...prev,
          email: 'Account with this email/phone exists. Please login.',
        }));
        setLoading(false);
        return;
      }

      const generatedPid = await generatePID();
      setPid(generatedPid);

      const userCredential = await createUserWithEmailAndPassword(auth, authEmail, formData.password);
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone,
        pid: generatedPid,
        createdAt: new Date().toISOString(),
        registrationDate: new Date().toISOString(),
        role: 'user',
      });

      setSuccess(`Registration successful! Your PID is ${generatedPid}`);
      setShowWhatsAppPrompt(true);
      setCountdown(30); // Start countdown

      await signInWithEmailAndPassword(auth, authEmail, formData.password);
    } catch (error) {
      setErrors(handleFirebaseError(error));
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle WhatsApp confirmation
  const handleWhatsAppConfirm = () => {
    const message = `Hi ${formData.name}, Your PID is ${pid}. Thank you for registering!`;
    const encodedMessage = encodeURIComponent(message);
    const phoneNumber = formData.phone;
    const countryCode = '+91';
    const whatsAppUrl = `https://wa.me/${countryCode}${phoneNumber}?text=${encodedMessage}`;
    window.open(whatsAppUrl, '_blank');
    setShowWhatsAppPrompt(false);
    navigate('/login', { state: { phone: formData.phone } });
  };

  // Handle WhatsApp decline
  const handleWhatsAppDecline = () => {
    setShowWhatsAppPrompt(false);
    navigate('/login', { state: { phone: formData.phone } });
  };

  // Countdown timer for redirect
  useEffect(() => {
    if (showWhatsAppPrompt && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (showWhatsAppPrompt && countdown === 0) {
      setShowWhatsAppPrompt(false);
      navigate('/login', { state: { phone: formData.phone } });
    }
  }, [showWhatsAppPrompt, countdown, navigate, formData.phone]);

  // Add structured data for SEO
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': 'User Registration - Dr. Laxminadh Sivaraju',
      'description': 'Register for Dr. Laxminadh Sivaraju’s patient portal to access neurosurgery services.',
      'url': window.location.href,
      'publisher': {
        '@type': 'Person',
        'name': 'Dr. Laxminadh Sivaraju',
      },
    });
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return (
    <>
      {/* SEO Meta Tags */}
      <meta
        name="description"
        content="Register for Dr. Laxminadh Sivaraju’s patient portal to access neurosurgery services."
      />
      <meta
        name="keywords"
        content="user registration, Dr. Laxminadh Sivaraju, neurosurgeon, patient portal, Care Hospital"
      />
      <meta name="author" content="Dr. Laxminadh Sivaraju" />

      {/* Open Graph Meta Tags for SMO */}
      <meta
        property="og:title"
        content="User Registration - Dr. Laxminadh Sivaraju"
      />
      <meta
        property="og:description"
        content="Create an account to access patient services provided by Dr. Laxminadh Sivaraju."
      />
      <meta property="og:image" content="/assets/drimg.png" />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={window.location.href} />

      {/* Twitter Card Meta Tags for SMO */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta
        name="twitter:title"
        content="User Registration - Dr. Laxminadh Sivaraju"
      />
      <meta
        name="twitter:description"
        content="Register for Dr. Laxminadh Sivaraju’s patient portal."
      />
      <meta name="twitter:image" content="/assets/drimg.png" />

      <section
        className="min-h-screen flex items-center justify-center p-4 sm:p-6"
        style={{
          backgroundColor: currentTheme.background || '#f9fafb',
          color: currentTheme.text?.primary || '#111827',
        }}
        aria-labelledby="register-heading"
      >
        {showWhatsAppPrompt ? (
          <div
            className="w-full max-w-md p-8 rounded-lg shadow-md border"
            style={{
              backgroundColor: currentTheme.surface || '#ffffff',
              borderColor: currentTheme.border || '#d1d5db',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
            role="dialog"
            aria-labelledby="success-heading"
          >
            <div className="text-center">
              <h2
                id="success-heading"
                className="text-2xl font-bold mb-4"
                style={{ color: currentTheme.text?.primary || '#111827' }}
              >
                Registration Successful
              </h2>
              <p
                className="text-lg mb-6"
                style={{ color: currentTheme.text?.success || '#065f46' }}
              >
                Your PID: <strong>{pid}</strong>
              </p>
              <p
                className="text-sm mb-6"
                style={{ color: currentTheme.text?.secondary || '#6b7280' }}
              >
                Would you like to receive your PID via WhatsApp for easy access?
              </p>
              <p
                className="text-sm mb-6"
                style={{ color: currentTheme.text?.secondary || '#6b7280' }}
              >
                Redirecting to login in {countdown} seconds...
              </p>
              <div className="flex justify-center space-x-4">
                <CustomButton
                  onClick={handleWhatsAppConfirm}
                  className="justify-center py-2 px-4 text-sm font-medium transition-colors duration-200 hover:bg-opacity-90"
                  style={{
                    backgroundColor: currentTheme.success || '#10b981',
                    color: currentTheme.text?.button || '#ffffff',
                  }}
                  aria-label="Send PID to WhatsApp"
                >
                  Yes, Send to WhatsApp
                </CustomButton>
                <CustomButton
                  onClick={handleWhatsAppDecline}
                  className="justify-center py-2 px-4 text-sm font-medium transition-colors duration-200 hover:bg-opacity-90"
                  style={{
                    backgroundColor: currentTheme.secondary || '#6b7280',
                    color: currentTheme.text?.button || '#ffffff',
                  }}
                  aria-label="Skip WhatsApp prompt"
                >
                  No, Skip
                </CustomButton>
              </div>
            </div>
          </div>
        ) : (
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
                id="register-heading"
                className="text-3xl font-bold mb-6"
                style={{ color: currentTheme.text?.primary || '#111827' }}
              >
                Create Account
              </h1>
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
              {success && !showWhatsAppPrompt && (
                <div
                  className="text-sm mb-6 p-3 rounded-md"
                  style={{
                    backgroundColor: currentTheme.background?.success || '#d1fae5',
                    color: currentTheme.text?.success || '#065f46',
                  }}
                  role="alert"
                  aria-live="assertive"
                >
                  {success}
                </div>
              )}
            </header>
            <form className="space-y-6" onSubmit={handleSubmit} noValidate>
              <CustomInput
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Enter your full name"
                style={{
                  color: currentTheme.text?.primary || '#111827',
                  backgroundColor: currentTheme.inputBackground || '#f9fafb',
                  borderColor: errors.name ? '#dc2626' : currentTheme.border || '#d1d5db',
                }}
                aria-describedby={errors.name ? 'name-error' : undefined}
              />
              {errors.name && (
                <p id="name-error" className="text-sm" style={{ color: currentTheme.text?.error || '#dc2626' }}>
                  {errors.name}
                </p>
              )}
              <CustomInput
                label="Phone Number"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                placeholder="Enter your 10-digit phone number"
                pattern="\d{10}"
                style={{
                  color: currentTheme.text?.primary || '#111827',
                  backgroundColor: currentTheme.inputBackground || '#f9fafb',
                  borderColor: errors.phone ? '#dc2626' : currentTheme.border || '#d1d5db',
                }}
                aria-describedby={errors.phone ? 'phone-error' : undefined}
              />
              {errors.phone && (
                <p id="phone-error" className="text-sm" style={{ color: currentTheme.text?.error || '#dc2626' }}>
                  {errors.phone}
                </p>
              )}
              <CustomInput
                label="Email (Optional)"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email address"
                style={{
                  color: currentTheme.text?.primary || '#111827',
                  backgroundColor: currentTheme.inputBackground || '#f9fafb',
                  borderColor: errors.email ? '#dc2626' : currentTheme.border || '#d1d5db',
                }}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {errors.email && (
                <p id="email-error" className="text-sm" style={{ color: currentTheme.text?.error || '#dc2626' }}>
                  {errors.email}
                </p>
              )}
              <CustomInput
                label="Password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Enter your password"
                style={{
                  color: currentTheme.text?.primary || '#111827',
                  backgroundColor: currentTheme.inputBackground || '#f9fafb',
                  borderColor: errors.password ? '#dc2626' : currentTheme.border || '#d1d5db',
                }}
                aria-describedby={errors.password ? 'password-error' : undefined}
              />
              {errors.password && (
                <p id="password-error" className="text-sm" style={{ color: currentTheme.text?.error || '#dc2626' }}>
                  {errors.password}
                </p>
              )}
              <CustomInput
                label="Confirm Password"
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Confirm your password"
                style={{
                  color: currentTheme.text?.primary || '#111827',
                  backgroundColor: currentTheme.inputBackground || '#f9fafb',
                  borderColor: errors.confirmPassword ? '#dc2626' : currentTheme.border || '#d1d5db',
                }}
                aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
              />
              {errors.confirmPassword && (
                <p id="confirmPassword-error" className="text-sm" style={{ color: currentTheme.text?.error || '#dc2626' }}>
                  {errors.confirmPassword}
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
                  aria-label={loading ? 'Processing registration' : 'Register'}
                >
                  {loading ? 'Processing...' : 'Register'}
                </CustomButton>
                <p
                  className="text-center text-sm"
                  style={{ color: currentTheme.text?.secondary || '#6b7280' }}
                >
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="font-medium hover:underline transition-colors duration-200"
                    style={{ color: currentTheme.primary || '#6366f1' }}
                    aria-label="Navigate to login page"
                  >
                    Login
                  </button>
                </p>
              </div>
            </form>
          </div>
        )}
      </section>
    </>
  );
};

export default memo(UserRegister);