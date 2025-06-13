import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Star } from 'lucide-react';
import { collection, addDoc, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';

function Review() {
  const { currentTheme } = useTheme();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const reviewsPerPage = 10;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [formData, setFormData] = useState({
    username: '',
    reviewText: '',
    rating: 0,
  });
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [errors, setErrors] = useState({});

  // Authentication state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setFormData((prev) => ({
          ...prev,
          username: currentUser.displayName || currentUser.email.split('@')[0],
        }));
      } else {
        setFormData({ username: '', reviewText: '', rating: 0 });
      }
    });
    return () => unsubscribe();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'username' && value.length > 25) return;
    if (name === 'reviewText' && value.length > 500) return;

    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleRatingClick = (rating) => {
    setFormData((prev) => ({ ...prev, rating }));
    setErrors((prev) => ({ ...prev, rating: '' }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.username.trim()) newErrors.username = 'Name is required';
    if (!formData.reviewText.trim()) newErrors.reviewText = 'Review is required';
    if (formData.rating === 0) newErrors.rating = 'Rating is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setShowConfirmation(true);
  };

  const handleFinalSubmit = async (includeGoogle) => {
    if (includeGoogle) {
      window.open(
        'https://www.google.com/search?q=dr+laxminadh+neuro+specialist&sourceid=chrome&ie=UTF-8#lrd=0x3bcb952cc8cf290f:0xf9b5356be67d4fff,3,,,',
        '_blank'
      );
    }

    try {
      const reviewsRef = collection(db, 'reviews');
      const newReview = {
        ...formData,
        date: new Date().toISOString(),
        userId: user.uid,
        verified: false,
      };

      await addDoc(reviewsRef, newReview);
      setShowForm(false);
      setShowConfirmation(false);
      setShowThankYou(true);

      setTimeout(() => {
        setShowThankYou(false);
        setFormData({
          username: user.displayName || user.email.split('@')[0],
          reviewText: '',
          rating: 0,
        });
      }, 3000);
    } catch (error) {
      console.error('Error adding review:', error);
      alert('Failed to submit review. Please try again.');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setFormData({
      username: user?.displayName || user?.email.split('@')[0] || '',
      reviewText: '',
      rating: 0,
    });
    setErrors({});
  };

  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
  };

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape' && showPreview) {
        setShowPreview(null);
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showPreview]);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const reviewsRef = collection(db, 'reviews');
        const q = query(reviewsRef, where('verified', '==', true), orderBy('date', 'desc'));
        const querySnapshot = await getDocs(q);

        const fetchedReviews = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        console.log('Fetched verified reviews:', fetchedReviews); // Debug log
        setReviews(fetchedReviews);
      } catch (error) {
        console.error('Error fetching reviews:', error);
        setReviews([]);
        alert('Failed to load reviews. Please try again later.');
      }
    };

    fetchReviews();
  }, [showThankYou]);

  const handleWriteReview = () => {
    if (!user) {
      navigate('/login', { state: { from: '/review' } });
      return;
    }
    setShowForm(true);
  };

  const indexOfLastReview = currentPage * reviewsPerPage;
  const indexOfFirstReview = indexOfLastReview - reviewsPerPage;
  const currentReviews = reviews.slice(indexOfFirstReview, indexOfLastReview);
  const totalPages = Math.ceil(reviews.length / reviewsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo(0, 0);
  };

  return (
    <div
      className="min-h-screen pt-5 px-4 pb-10 md:px-15 lg:px-20"
      style={{ backgroundColor: currentTheme.background }}
    >
      <div className="max-w-2xl mx-auto">
        {showThankYou && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div
              className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-sm sm:max-w-md text-center"
              style={{ backgroundColor: currentTheme.surface }}
            >
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">Thank You for Your Review!</h2>
              <p className="text-base sm:text-lg">
                Your feedback is valuable to us. It will be displayed once verified by an admin.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Verified Reviews</h1>
          {!showForm && (
            <button
              onClick={handleWriteReview}
              className="px-4 py-2 sm:px-6 sm:py-2 rounded-md text-white w-full sm:w-auto"
              style={{ backgroundColor: currentTheme.primary }}
            >
              Write a Review
            </button>
          )}
        </div>

        <p className="text-sm sm:text-base mb-4 opacity-70">Showing only verified reviews</p>

        {currentReviews.length === 0 && (
          <p className="text-sm sm:text-base text-center">No verified reviews available yet.</p>
        )}

        <div className="space-y-4">
          {currentReviews.map((review) => (
            <div
              key={review.id}
              className="p-4 rounded-lg border"
              style={{ borderColor: currentTheme.border, backgroundColor: currentTheme.surface }}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-medium text-base sm:text-lg">{review.username}</h3>
                  <p className="text-xs sm:text-sm opacity-70">{formatDate(review.date)}</p>
                </div>
                <div className="flex gap-1">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star key={i} size={16} fill={currentTheme.primary} color={currentTheme.primary} />
                  ))}
                </div>
              </div>
              <div>
                <p className="line-clamp-2 text-sm sm:text-base">{review.reviewText}</p>
                <button
                  onClick={() => setShowPreview(review.id)}
                  className="mt-2 text-xs sm:text-sm hover:underline"
                  style={{ color: currentTheme.primary }}
                >
                  View more
                </button>
              </div>
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex flex-wrap justify-center items-center gap-2 mt-6">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 sm:px-4 sm:py-2 rounded-md border disabled:opacity-50"
              style={{ borderColor: currentTheme.border, backgroundColor: currentTheme.surface }}
            >
              Previous
            </button>
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                <button
                  key={pageNumber}
                  onClick={() => handlePageChange(pageNumber)}
                  className={`px-3 py-1 sm:px-4 sm:py-2 rounded-md border text-xs sm:text-sm ${
                    currentPage === pageNumber ? 'text-white' : ''
                  }`}
                  style={{
                    borderColor: currentTheme.border,
                    backgroundColor: currentPage === pageNumber ? currentTheme.primary : currentTheme.surface,
                  }}
                >
                  {pageNumber}
                </button>
              ))}
            </div>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 sm:px-4 sm:py-2 rounded-md border disabled:opacity-50"
              style={{ borderColor: currentTheme.border, backgroundColor: currentTheme.surface }}
            >
              Next
            </button>
          </div>
        )}

        {showForm && user && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div
              className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md sm:max-w-2xl relative"
              style={{ backgroundColor: currentTheme.surface }}
            >
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="text-center mb-6">
                  <h2 className="text-lg sm:text-xl font-bold">Share your experience</h2>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                    <label className="font-medium w-full sm:w-24">Name:</label>
                    <div className="flex-1 w-full">
                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        className={`w-full p-2 sm:p-3 rounded-md border ${
                          errors.username ? 'border-red-500' : ''
                        }`}
                        style={{
                          borderColor: errors.username ? '#ef4444' : currentTheme.border,
                          backgroundColor: currentTheme.surface,
                        }}
                      />
                      <div className="flex justify-between mt-1">
                        <span className="text-xs sm:text-sm text-red-500">{errors.username || ''}</span>
                        <span className="text-xs sm:text-sm opacity-70">{`${formData.username.length}/25`}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-4">
                    <label className="font-medium w-full sm:w-24 mt-3 sm:mt-0">Your Review:</label>
                    <div className="flex-1 w-full">
                      <textarea
                        name="reviewText"
                        value={formData.reviewText}
                        onChange={handleInputChange}
                        rows="4"
                        className={`w-full p-2 sm:p-3 rounded-md border ${
                          errors.reviewText ? 'border-red-500' : ''
                        }`}
                        style={{
                          borderColor: errors.reviewText ? '#ef4444' : currentTheme.border,
                          backgroundColor: currentTheme.surface,
                        }}
                      />
                      <div className="flex justify-between mt-1">
                        <span className="text-xs sm:text-sm text-red-500">{errors.reviewText || ''}</span>
                        <span className="text-xs sm:text-sm opacity-70">{`${formData.reviewText.length}/500`}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                    <label className="font-medium w-full sm:w-24">Rating:</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => handleRatingClick(star)}
                          className="text-xl sm:text-2xl transition-colors"
                          style={{ color: star <= formData.rating ? currentTheme.primary : currentTheme.border }}
                        >
                          <Star
                            fill={star <= formData.rating ? currentTheme.primary : 'none'}
                            size={20}
                          />
                        </button>
                      ))}
                      {errors.rating && (
                        <span className="text-xs sm:text-sm text-red-500 ml-2">{errors.rating}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 sm:px-6 sm:py-2 rounded-md border w-full sm:w-auto"
                    style={{ borderColor: currentTheme.border }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 sm:px-6 sm:py-2 rounded-md text-white w-full sm:w-auto"
                    style={{ backgroundColor: currentTheme.primary }}
                  >
                    Submit
                  </button>
                </div>
              </form>

              {showConfirmation && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
                  <div
                    className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-sm sm:max-w-md"
                    style={{ backgroundColor: currentTheme.surface }}
                  >
                    <p className="mb-6 text-center text-sm sm:text-base">
                      Are you sure you want to submit your review?
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-3">
                      <button
                        onClick={handleCancelConfirmation}
                        className="px-4 py-2 sm:px-6 sm:py-2 rounded-md border text-sm w-full sm:w-auto"
                        style={{ borderColor: currentTheme.border }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleFinalSubmit(false)}
                        className="px-4 py-2 sm:px-6 sm:py-2 rounded-md border text-sm w-full sm:w-auto"
                        style={{ borderColor: currentTheme.border }}
                      >
                        Submit
                      </button>
                      <button
                        onClick={() => handleFinalSubmit(true)}
                        className="px-4 py-2 sm:px-6 sm:py-2 rounded-md text-white text-sm w-full sm:w-auto"
                        style={{ backgroundColor: currentTheme.primary }}
                      >
                        Submit & Send to Google
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {showPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center text-justify p-4 z-50">
            <div
              className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md sm:max-w-3xl relative max-h-[80vh] flex flex-col"
              style={{ backgroundColor: currentTheme.surface }}
            >
              <div className="overflow-y-auto pr-2 mb-4">
                {reviews
                  .filter((review) => review.id === showPreview)
                  .map((review) => (
                    <div key={review.id}>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg sm:text-xl font-bold">{review.username}</h3>
                          <p className="text-xs sm:text-sm opacity-70">{formatDate(review.date)}</p>
                        </div>
                        <div className="flex gap-1">
                          {[...Array(review.rating)].map((_, i) => (
                            <Star
                              key={i}
                              size={20}
                              fill={currentTheme.primary}
                              color={currentTheme.primary}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm sm:text-lg whitespace-pre-wrap pl-4">{review.reviewText}</p>
                    </div>
                  ))}
              </div>
              <div className="mt-auto flex justify-center">
                <button
                  onClick={() => setShowPreview(null)}
                  className="px-4 py-2 sm:px-6 sm:py-2 rounded-md border"
                  style={{
                    borderColor: currentTheme.border,
                    color: currentTheme.text.primary,
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Review;