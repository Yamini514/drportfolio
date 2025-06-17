import React, { useState } from 'react';
import { auth, db } from '../firebase/config';
import { sendPasswordResetEmail } from 'firebase/auth';
// Import necessary Firestore functions for querying
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const checkEmailExists = async (email) => {
    try {
      // Trim email to avoid whitespace issues
      const trimmedEmail = email.trim();
      console.log('Checking if email exists in Firestore:', trimmedEmail);

      // Query Firestore for a user with the matching email field
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', trimmedEmail));
      const querySnapshot = await getDocs(q);

      // If the query returns any documents, the email exists
      console.log('Query snapshot size:', querySnapshot.size);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking email:', error);
      // Return false in case of an error
      return false;
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      // Check if email exists in the database
      const emailExists = await checkEmailExists(email);
      if (!emailExists) {
        setError('No account found with this email address.');
        setLoading(false);
        return;
      }

      await sendPasswordResetEmail(auth, email);
      setMessage('Password reset email sent! Please check your inbox.');
      setTimeout(() => {
        navigate('/admin');
      }, 3000);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white py-8 px-6 shadow-lg rounded-lg sm:px-10 border border-gray-200">
          <h2 className="mb-6 text-center text-3xl font-extrabold text-gray-900">
            Reset Password
          </h2>
          <form className="space-y-6" onSubmit={handleResetPassword}>
            <div>
              <CustomInput
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
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
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {loading ? 'Sending...' : 'Reset Password'}
              </CustomButton>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className="text-sm text-blue-600 hover:text-blue-800 focus:outline-none"
              >
                Back to Login
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;