import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import {
  auth,
  db,
} from '../../firebase/config';
import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import CustomButton from '../../components/CustomButton';
import CustomInput from '../../components/CustomInput';

// Constants
const INITIAL_FORM_DATA = {
  name: '',
  email: '',
  phone: '',
  countryCode: '+1', // Default to US; adjust as needed
  password: '',
  confirmPassword: '',
};

const INITIAL_ERRORS = {
  name: '',
  email: '',
  phone: '',
  countryCode: '',
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
  const [pid, setPid] = useState(''); // Store PID for WhatsApp link

  // Hooks
  const navigate = useNavigate();
  const { currentTheme } = useTheme();

  // Helper Functions
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

    // Country code validation
    const countryCodeRegex = /^\+\d{1,3}$/;
    if (!countryCodeRegex.test(formData.countryCode)) {
      newErrors.countryCode = 'Please enter a valid country code (e.g., +1)';
      isValid = false;
    }

    // Email validation
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

  // Event Handlers
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '', general: '' }));
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!(await validateForm())) return;

    setErrors(INITIAL_ERRORS);
    setSuccess('');
    setLoading(true);

    const startTime = performance.now();

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
      setPid(generatedPid); // Store PID for WhatsApp link

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        authEmail,
        formData.password,
      );

      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone,
        pid: generatedPid,
        createdAt: new Date().toISOString(),
        registrationDate: new Date().toISOString(),
        role: 'user',
      });

      const endTime = performance.now();
      const registrationTime = ((endTime - startTime) / 1000).toFixed(2);

      // Generate WhatsApp Click to Chat URL
      const phoneNumber = `${formData.countryCode}${formData.phone}`; // E.g., +12025550123
      const message = encodeURIComponent(
        `Thank you for registering! Your PID is ${generatedPid}. Please keep it safe.`,
      );
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

      setSuccess(
        `Account created in ${registrationTime}s! Your PID is <strong>${generatedPid}</strong>. ` +
        `<a href="${whatsappUrl}" target="_blank" class="text-blue-500 underline">Click here to send PID to WhatsApp</a>.`,
      );

      await signInWithEmailAndPassword(auth, authEmail, formData.password);
    } catch (error) {
      setErrors(handleFirebaseError(error));
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Effects
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        navigate('/login', { state: { phone: formData.phone } });
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [success, navigate, formData.phone]);

  // Render
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: currentTheme.background.primary }}
    >
      <div
        className="max-w-md w-full space-y-8 p-8 rounded-xl shadow-lg border-2"
        style={{
          backgroundColor: currentTheme.surface,
          borderColor: currentTheme.primary || '#8B5CF6',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
        }}
      >
        <h2
          className="text-3xl font-bold text-center mb-8"
          style={{ color: currentTheme.text.primary }}
        >
          Create Account
        </h2>
        <form className="grid gap-6" onSubmit={handleSubmit}>
          <div className="grid gap-6">
            <div>
              <CustomInput
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">{errors.name}</p>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <CustomInput
                  label="Country Code"
                  name="countryCode"
                  value={formData.countryCode}
                  onChange={handleChange}
                  required
                  placeholder="+1"
                />
                {errors.countryCode && (
                  <p className="text-red-500 text-xs mt-1">{errors.countryCode}</p>
                )}
              </div>
              <div className="col-span-2">
                <CustomInput
                  label="Phone Number"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  pattern="\d{10}"
                />
                {errors.phone && (
                  <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
                )}
              </div>
            </div>
            <div>
              <CustomInput
                label="Email (Optional)"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
              )}
            </div>
            <div>
              <CustomInput
                label="Password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password}</p>
              )}
            </div>
            <div>
              <CustomInput
                label="Confirm Password"
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
              )}
            </div>
          </div>
          {errors.general && (
            <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded-md">
              {errors.general}
            </p>
          )}
          {success && (
            <p
              className="text-green-500 text-sm text-center bg-green-50 p-2 rounded-md"
              dangerouslySetInnerHTML={{ __html: success }}
            />
          )}
          <div className="flex flex-col space-y-4">
            <CustomButton type="submit" disabled={loading} className="justify-center">
              {loading ? 'Processing...' : 'Register'}
            </CustomButton>
            <p className="text-center text-sm" style={{ color: currentTheme.text.secondary }}>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="font-medium hover:underline"
                style={{ color: currentTheme.primary }}
              >
                Login
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserRegister;