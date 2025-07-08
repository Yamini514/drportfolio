import React, { useState } from 'react';
import { auth, db } from '../../firebase/config';
import { sendPasswordResetEmail } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';

const UserForgotPassword = () => {
  const navigate = useNavigate();
  const { currentTheme } = useTheme();
  const [step, setStep] = useState(1); // 1: Verify, 2: Options, 3: Reset
  const [formData, setFormData] = useState({
    phoneNumber: '',
    pid: '',
    email: '',
  });
  const [errors, setErrors] = useState({
    phoneNumber: '',
    pid: '',
    general: '',
  });
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value.trim() }));
    setErrors((prev) => ({ ...prev, [name]: '', general: '' }));
  };

  const validateVerificationForm = () => {
    let isValid = true;
    const newErrors = { phoneNumber: '', pid: '', general: '' };

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
      isValid = false;
    } else if (!/^\+?[1-9]\d{1,14}$/.test(formData.phoneNumber.trim())) {
      newErrors.phoneNumber = 'Please enter a valid phone number';
      isValid = false;
    }

    if (!formData.pid.trim()) {
      newErrors.pid = 'PID is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleVerify = async () => {
    if (!validateVerificationForm()) return;

    setLoading(true);
    setErrors({ phoneNumber: '', pid: '', general: '' });

    try {
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('phone', '==', formData.phoneNumber.trim()),
        where('pid', '==', formData.pid.trim())
      );
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        setErrors({ general: 'Invalid phone number or PID. Please try again.' });
        return;
      }

      const userData = querySnapshot.docs[0].data();
      const userId = querySnapshot.docs[0].id;

      setUser({ uid: userId, ...userData });
      setFormData((prev) => ({ ...prev, email: userData.email }));
      setStep(2);
    } catch (error) {
      console.error('Verification error:', error.message);
      setErrors({ general: 'Failed to verify details. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setLoading(true);
    setErrors({ general: '' });

    try {
      await sendPasswordResetEmail(auth, formData.email);
      setErrors({
        general: 'Password reset email sent! Please check your inbox and follow the instructions.',
      });
      setTimeout(() => navigate('/login'), 5000);
    } catch (error) {
      console.error('Password reset error:', error.code, error.message);
      let errorMessage = 'Failed to send password reset email. Please try again.';
      if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'No user found with this email.';
      }
      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: currentTheme.background.primary }}
    >
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2"
            style={{ borderColor: currentTheme.primary }}
          ></div>
        </div>
      )}
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
            Forgot Password
          </h2>
          {errors.general && (
            <p
              className="text-center text-sm mb-4"
              style={{ color: currentTheme.text.error || '#EF4444' }}
            >
              {errors.general}
            </p>
          )}
        </div>
        {step === 1 && (
          <div className="space-y-6">
            <CustomInput
              label="Phone Number"
              type="tel"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              required
              error={errors.phoneNumber}
              noBackground={true}
            />
            <CustomInput
              label="PID"
              type="text"
              name="pid"
              value={formData.pid}
              onChange={handleChange}
              required
              error={errors.pid}
            />
            <div className="flex flex-col space-y-4">
              <CustomButton
                onClick={handleVerify}
                disabled={loading}
                className="justify-center"
              >
                {loading ? 'Verifying...' : 'Verify'}
              </CustomButton>
              <p
                className="text-center text-sm"
                style={{ color: currentTheme.text.secondary }}
              >
                Back to{' '}
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="font-medium hover:underline text-center"
                  style={{ color: currentTheme.primary }}
                  aria-label="Navigate to login page"
                >
                  Login
                </button>
              </p>
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-6">
            <p
              className="text-center text-sm"
              style={{ color: currentTheme.text.primary }}
            >
              Verification successful. Please reset your password.
            </p>
            <div className="flex flex-col space-y-4">
              <CustomButton
                onClick={() => setStep(3)}
                className="justify-center"
              >
                Reset Password
              </CustomButton>
              <CustomButton
                onClick={() => setStep(1)}
                className="justify-center"
                variant="secondary"
              >
                Back
              </CustomButton>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-6">
            <CustomInput
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              disabled
              noBackground={true}
            />
            <p
              className="text-center text-sm"
              style={{ color: currentTheme.text.primary }}
            >
              We will send a password reset link to the email above.
            </p>
            <div className="flex flex-col space-y-4">
              <CustomButton
                onClick={handleResetPassword}
                disabled={loading}
                className="justify-center"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </CustomButton>
              <CustomButton
                onClick={() => setStep(2)}
                className="justify-center"
                variant="secondary"
              >
                Back
              </CustomButton>
              <p
                className="text-center text-sm"
                style={{ color: currentTheme.text.secondary }}
              >
                Back to{' '}
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="font-medium hover:underline text-center"
                  style={{ color: currentTheme.primary }}
                  aria-label="Navigate to login page"
                >
                  Login
                </button>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserForgotPassword;