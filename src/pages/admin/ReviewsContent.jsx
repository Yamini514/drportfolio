import React, { useState, useEffect } from 'react';
import CustomButton from '../../components/CustomButton';
import CustomInput from '../../components/CustomInput';
import CustomSelect from '../../components/CustomSelect';
import CustomTable from '../../components/CustomTable';
import { useTheme } from '../../context/ThemeContext';
import { collection, addDoc, getDocs, query, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { CheckCircle, XCircle, Eye } from 'lucide-react';

function ReviewsContent() {
  const { currentTheme } = useTheme();
  const [showForm, setShowForm] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [viewingReview, setViewingReview] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  const [newReview, setNewReview] = useState({
    username: '',
    rating: 0,
    reviewText: '',
  });

  // Fetch reviews from Firebase
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const reviewsRef = collection(db, 'reviews');
        const q = query(reviewsRef, orderBy('date', 'desc'));
        const querySnapshot = await getDocs(q);
        const fetchedReviews = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        console.log('Fetched all reviews (admin):', fetchedReviews); // Debug log
        setReviews(fetchedReviews);
      } catch (error) {
        console.error('Error fetching reviews:', error);
        setReviews([]);
        alert('Failed to load reviews. Please try again later.');
      }
    };
    fetchReviews();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewReview((prev) => ({
      ...prev,
      [name]: name === 'rating' ? parseInt(value, 10) : value,
    }));
    setFormErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = {};

    if (!newReview.username.trim()) errors.username = 'Name is required';
    if (!newReview.reviewText.trim()) errors.reviewText = 'Review is required';
    if (newReview.rating === 0) errors.rating = 'Rating is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      const reviewsRef = collection(db, 'reviews');
      const newReviewData = {
        username: newReview.username.trim(),
        rating: parseInt(newReview.rating, 10),
        reviewText: newReview.reviewText.trim(),
        date: new Date().toISOString(),
        verified: false,
      };
      const docRef = await addDoc(reviewsRef, newReviewData);
      setReviews((prev) => [{ id: docRef.id, ...newReviewData }, ...prev]);
      setNewReview({ username: '', rating: 0, reviewText: '' });
      setShowForm(false);
      setFormErrors({});
    } catch (error) {
      console.error('Error adding review:', error);
      alert('Failed to add review. Please try again.');
    }
  };

  const handleToggleVerify = async (review) => {
    try {
      const newVerifiedStatus = !review.verified; // Calculate new status
      const reviewRef = doc(db, 'reviews', review.id);
      await updateDoc(reviewRef, { verified: newVerifiedStatus });
      setReviews((prev) => {
        const newReviews = prev.map((r) =>
          r.id === review.id ? { ...r, verified: newVerifiedStatus } : r
        );
        console.log('New reviews state:', newReviews); // Debug state update
        return newReviews;
      });
      console.log(`Toggled verification for review ${review.id} to ${newVerifiedStatus}`); // Log new status
    } catch (error) {
      console.error('Error toggling verification:', error);
      alert('Failed to update verification status.');
      // Re-fetch reviews to ensure UI syncs with Firebase
      const reviewsRef = collection(db, 'reviews');
      const q = query(reviewsRef, orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      const fetchedReviews = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setReviews(fetchedReviews);
    }
  };

  const handleViewReview = (review) => {
    setViewingReview(review);
  };

  const handleBackToList = () => {
    setViewingReview(null);
  };

  const tableHeaders = ['Name', 'Rating', 'Review', 'Date', 'Verified', 'Actions'];

  const ReviewView = ({ review }) => (
    <div
      className="rounded-lg p-6 shadow mx-auto"
      style={{
        backgroundColor: currentTheme.surface,
        color: currentTheme.text.primary,
        border: `1px solid ${currentTheme.border}`,
        width: '50%',
        maxWidth: '600px',
      }}
    >
      <h3 className="text-xl font-bold mb-4" style={{ color: currentTheme.text.primary }}>
        Review Details
      </h3>
      <div className="space-y-4">
        <div>
          <span className="font-semibold" style={{ color: currentTheme.text.secondary }}>
            Name:{' '}
          </span>
          <span style={{ color: currentTheme.text.primary }}>{review.username}</span>
        </div>
        <div>
          <span className="font-semibold" style={{ color: currentTheme.text.secondary }}>
            Rating:{' '}
          </span>
          <span style={{ color: currentTheme.primary }}>{'★'.repeat(review.rating)}</span>
          <span style={{ color: currentTheme.text.secondary }}>
            {'☆'.repeat(5 - review.rating)}
          </span>
        </div>
        <div>
          <span className="font-semibold" style={{ color: currentTheme.text.secondary }}>
            Date:{' '}
          </span>
          <span style={{ color: currentTheme.text.primary }}>
            {new Date(review.date).toLocaleDateString()}
          </span>
        </div>
        <div>
          <span className="font-semibold" style={{ color: currentTheme.text.secondary }}>
            Verified:{' '}
          </span>
          <span style={{ color: review.verified ? currentTheme.success : currentTheme.error }}>
            {review.verified ? 'Yes' : 'No'}
          </span>
        </div>
        <div>
          <span className="font-semibold" style={{ color: currentTheme.text.secondary }}>
            Review:{' '}
          </span>
          <p className="whitespace-pre-wrap mt-2" style={{ color: currentTheme.text.primary }}>
            {review.reviewText}
          </p>
        </div>
      </div>
      <div className="flex justify-end space-x-3 mt-6">
        <CustomButton
          variant="secondary"
          onClick={handleBackToList}
          className="px-4 py-2"
          style={{
            backgroundColor: 'transparent',
            color: currentTheme.text.secondary,
            border: `1px solid ${currentTheme.text.secondary}`,
            borderRadius: '0.375rem',
          }}
        >
          Back to List
        </CustomButton>
      </div>
    </div>
  );

  return (
    <div
      className="p-4"
      style={{ backgroundColor: currentTheme.background, color: currentTheme.text.primary }}
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold" style={{ color: currentTheme.text.primary }}>
          Reviews Management
        </h2>
        {!showForm && (
          <CustomButton
            onClick={() => setShowForm(true)}
            variant="primary"
            className="px-4 py-2"
            style={{ backgroundColor: currentTheme.primary, color: currentTheme.text.inverse }}
          >
            Add New Review
          </CustomButton>
        )}
      </div>

      {showForm ? (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 p-6 rounded-lg shadow relative"
          style={{ backgroundColor: currentTheme.surface, border: `1px solid ${currentTheme.border}` }}
        >
          <div className="flex justify-end mb-4">
            <CustomButton
              variant="secondary"
              onClick={() => {
                setShowForm(false);
                setNewReview({ username: '', rating: 0, reviewText: '' });
                setFormErrors({});
              }}
              className="px-4 py-2"
              style={{
                backgroundColor: currentTheme.background.secondary,
                color: currentTheme.text.primary,
              }}
            >
              Cancel
            </CustomButton>
          </div>
          <CustomInput
            label="Name"
            name="username"
            value={newReview.username}
            onChange={handleInputChange}
            required
            error={formErrors.username}
          />
          <CustomSelect
            label="Rating"
            name="rating"
            value={newReview.rating}
            onChange={handleInputChange}
            options={[0, 1, 2, 3, 4, 5].map((num) => ({
              value: num,
              label: num === 0 ? 'Select Rating' : `${num} Star${num > 1 ? 's' : ''}`,
              key: `rating-${num}`,
            }))}
            error={formErrors.rating}
          />
          <CustomInput
            type="textarea"
            label="Detailed Review"
            name="reviewText"
            value={newReview.reviewText}
            onChange={handleInputChange}
            required
            placeholder="Please provide a detailed review of your experience..."
            className="min-h-[150px]"
            rows={6}
            error={formErrors.reviewText}
          />
          <CustomButton
            type="submit"
            variant="primary"
            className="w-full"
            style={{ backgroundColor: currentTheme.primary, color: currentTheme.text.inverse }}
          >
            Submit Review
          </CustomButton>
        </form>
      ) : viewingReview ? (
        <ReviewView review={viewingReview} />
      ) : (
        <CustomTable headers={tableHeaders} rowClassName="border-b border-gray-200">
          {reviews.map((review) => (
            <tr key={review.id} className="border-b border-gray-200">
              <td className="px-2 sm:px-6 py-4" style={{ color: currentTheme.text.primary }}>
                {review.username}
              </td>
              <td className="px-2 sm:px-6 py-4">
                <span style={{ color: currentTheme.primary }}>{'★'.repeat(review.rating)}</span>
                <span style={{ color: currentTheme.text.secondary }}>
                  {'☆'.repeat(5 - review.rating)}
                </span>
              </td>
              <td
                className="px-2 sm:px-6 py-4 whitespace-pre-wrap max-w-md"
                style={{ color: currentTheme.text.primary }}
              >
                {review.reviewText.length > 50
                  ? `${review.reviewText.substring(0, 50)}...`
                  : review.reviewText}
              </td>
              <td className="px-2 sm:px-6 py-4" style={{ color: currentTheme.text.primary }}>
                {new Date(review.date).toLocaleDateString()}
              </td>
              <td
                className="px-2 sm:px-6 py-4"
                style={{ color: review.verified ? currentTheme.success : currentTheme.error }}
              >
                {review.verified ? 'Yes' : 'No'}
              </td>
              <td className="px-2 sm:px-6 py-4">
                <div className="flex items-center justify-center space-x-2">
                  <button
                    onClick={() => handleViewReview(review)}
                    className="p-1 text-gray-600 hover:text-gray-800 transition-colors"
                    title="View"
                  >
                    <Eye size={20} />
                  </button>
                  <button
                    onClick={() => handleToggleVerify(review)}
                    className="p-1 transition-colors"
                    aria-label={review.verified ? 'Unverify review' : 'Verify review'}
                    style={{
                      color: review.verified ? currentTheme.error : currentTheme.success,
                      backgroundColor: currentTheme.background.secondary,
                    }}
                    title={review.verified ? 'Unverify Review' : 'Verify Review'}
                  >
                    {review.verified ? <XCircle size={18} /> : <CheckCircle size={18} />}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </CustomTable>
      )}
    </div>
  );
}

export default ReviewsContent;