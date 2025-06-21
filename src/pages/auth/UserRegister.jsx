import React, { useState } from 'react';
import { auth, db } from '../../firebase/config';
import { createUserWithEmailAndPassword, fetchSignInMethodsForEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';

const UserRegister = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    general: '',
  });
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { currentTheme } = useTheme();

  // Function to generate PID in the format PID{currentYear}-XXXXX and ensure uniqueness
  const generatePID = async () => {
    const currentYear = new Date().getFullYear();
    let pid;
    let isUnique = false;
    const maxAttempts = 5; // Limit attempts to avoid infinite loops
    let attempts = 0;

    while (!isUnique && attempts < maxAttempts) {
      const randomDigits = Math.floor(10000 + Math.random() * 90000); // 5 random digits
      pid = `PID${currentYear}-${randomDigits}`;
      const usersRef = collection(db, 'users');
      const pidQuery = query(usersRef, where('pid', '==', pid));
      const pidSnapshot = await getDocs(pidQuery);
      isUnique = pidSnapshot.empty;
      attempts++;
    }

    if (!isUnique) {
      throw new Error('Unable to generate a unique PID after multiple attempts.');
    }

    return pid;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    setErrors({
      ...errors,
      [name]: '',
      general: '',
    });
    setSuccess('');
  };

  const validateForm = async () => {
    let isValid = true;
    const newErrors = {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      general: '',
    };

    // Validate name (minimum 3 characters and unique)
    if (formData.name.trim().length < 3) {
      newErrors.name = 'Name must be at least 3 characters long';
      isValid = false;
    } else {
      // Check if name is unique
      const usersRef = collection(db, 'users');
      const nameQuery = query(usersRef, where('name', '==', formData.name.trim()));
      const nameSnapshot = await getDocs(nameQuery);
      if (!nameSnapshot.empty) {
        newErrors.name = 'This name is already taken. Please choose a different name.';
        isValid = false;
      }
    }

    // Validate phone (mandatory)
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
      isValid = false;
    }

    // Validate email (optional, only if provided)
    if (formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
        isValid = false;
      }
    }

    // Validate password
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      newErrors.password =
        'Password must be at least 8 characters long and contain at least one letter, one number, and one special character';
      isValid = false;
    }

    // Validate confirm password
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
        return { email: 'This email is already registered. Please login instead.' };
      case 'auth/invalid-email':
        return { email: 'Invalid email format' };
      case 'auth/weak-password':
        return { password: 'Password is too weak' };
      case 'auth/network-request-failed':
        return { general: 'Network error. Please check your connection and try again.' };
      default:
        return { general: error.message || 'An error occurred during registration' };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!(await validateForm())) return;

    setErrors({ name: '', email: '', phone: '', password: '', confirmPassword: '', general: '' });
    setSuccess('');
    setLoading(true);

    // Start timer
    const startTime = performance.now();

    try {
      // Generate a placeholder email if none provided
      const authEmail = formData.email || `${formData.phone}@example.com`;

      // Check if email or phone already exists in users or admins
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
        setErrors({
          ...errors,
          general: 'An account with this email or phone number already exists.',
        });
        setLoading(false);
        return;
      }

      // Check if email already exists in Firebase Authentication
      const signInMethods = await fetchSignInMethodsForEmail(auth, authEmail);
      if (signInMethods.length > 0) {
        setErrors({
          ...errors,
          email: 'An account with this email or phone number already exists. Please login instead.',
        });
        setLoading(false);
        return;
      }

      // Generate unique PID
      const pid = await generatePID();

      // Create new user
      const userCredential = await createUserWithEmailAndPassword(auth, authEmail, formData.password);

      // Store user data in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone,
        pid: pid,
        createdAt: new Date().toISOString(),
        registrationDate: new Date().toISOString(),
        role: 'user',
      });

      // Calculate registration time
      const endTime = performance.now();
      const registrationTime = ((endTime - startTime) / 1000).toFixed(2); // Convert to seconds, 2 decimal places

      setSuccess(
        `Account created successfully in ${registrationTime} seconds! Your PID is <strong>${pid}</strong>. Logging you in...`
      );

      // Automatically log in the user
      await signInWithEmailAndPassword(auth, authEmail, formData.password);

      setTimeout(() => {
        navigate('/login');
      }, 1000);
    } catch (error) {
      setErrors(handleFirebaseError(error));
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

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
          boxShadow: `0 4px 6px rgba(0, 0, 0, 0.3)`,
        }}
      >
        <div>
          <h2
            className="text-3xl font-bold text-center mb-8"
            style={{ color: currentTheme.text.primary }}
          >
            Create Account
          </h2>
        </div>
        <form className="grid gap-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-6">
            <div>
              <CustomInput
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1 transition-all duration-200">{errors.name}</p>
              )}
            </div>
            <div>
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
                <p className="text-red-500 text-xs mt-1 transition-all duration-200">{errors.phone}</p>
              )}
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
                <p className="text-red-500 text-xs mt-1 transition-all duration-200">{errors.email}</p>
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
                <p className="text-red-500 text-xs mt-1 transition-all duration-200">{errors.password}</p>
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
                <p className="text-red-500 text-xs mt-1 transition-all duration-200">
                  {errors.confirmPassword}
                </p>
              )}
            </div>
          </div>
          {errors.general && (
            <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded-md transition-all duration-200">
              {errors.general}
            </p>
          )}
          {success && (
            <p
              className="text-green-500 text-sm text-center bg-green-50 p-2 rounded-md transition-all duration-200"
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