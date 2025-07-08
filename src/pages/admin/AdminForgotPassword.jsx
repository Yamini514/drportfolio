import React, { useState } from 'react';
import { auth, db } from '../../firebase/config';
import { sendPasswordResetEmail } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import CustomInput from '../../components/CustomInput';
import CustomButton from '../../components/CustomButton';

function AdminForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const checkEmailExists = async (email) => {
    try {
      const trimmedEmail = email.trim();
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', trimmedEmail));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        const role = userData.role ? userData.role.toLowerCase() : 'user';
        return { exists: true, role };
      }
      return { exists: false, role: null };
    } catch (error) {
      return { exists: false, role: null, error: error.message };
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { exists, error: queryError } = await checkEmailExists(email);
      if (queryError) {
        setError('Error checking email. Please try again.');
        setLoading(false);
        return;
      }

      if (!exists) {
        setError('No admin account found with this email address.');
        setLoading(false);
        return;
      }

      await sendPasswordResetEmail(auth, email);
      setMessage('Password reset email sent! Please check your inbox.');
      setTimeout(() => {
        navigate('/admin');
      }, 3000);
    } catch (error) {
      console.error('Password reset error:', error.message, error.code);
      setError('Failed to send password reset email: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = async () => {
    setError('');
    setMessage('');

    if (email) {
      const { exists, error: queryError } = await checkEmailExists(email);
      if (queryError) {
        console.error('Error checking email for back to login:', queryError);
        setError('Error checking email. Redirecting to admin login.');
      } else if (!exists) {
        setError('No admin account found with this email address.');
      }
    }
    navigate('/admin');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white py-8 px-6 shadow-lg rounded-lg sm:px-10 border border-gray-200">
          <h2 className="mb-6 text-center text-3xl font-extrabold text-gray-900">
            Admin Password Reset
          </h2>
          <div className="space-y-6">
            <div>
              <CustomInput
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Admin email address"
                className="w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}
            {message && (
              <div className="text-green-500 text-sm text-center">{message}</div>
            )}

            <div>
              <CustomButton
                onClick={handleResetPassword}
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {loading ? 'Sending...' : 'Reset Password'}
              </CustomButton>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={handleBackToLogin}
                disabled={loading}
                className={`text-sm text-blue-600 hover:text-blue-800 focus:outline-none ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Back to Admin Login
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminForgotPassword;