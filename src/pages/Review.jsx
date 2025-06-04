import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Star, X } from 'lucide-react';
import { collection, addDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';

function Review() {
  const { currentTheme } = useTheme();
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [formData, setFormData] = useState({
    username: '',
    reviewText: '',
    rating: 0
  });
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRatingClick = (rating) => {
    setFormData(prev => ({
      ...prev,
      rating
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    
    // Name validation
    if (!formData.username.trim()) {
      newErrors.username = 'Name is required';
    } else if (formData.username.length > 25) {
      newErrors.username = 'Name must be 25 characters or less';
    }

    // Review text validation
    if (!formData.reviewText.trim()) {
      newErrors.reviewText = 'Review is required';
    } else if (formData.reviewText.length > 200) {
      newErrors.reviewText = 'Review must be 200 characters or less';
    }

    // Rating validation
    if (formData.rating === 0) {
      newErrors.rating = 'Rating is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setShowConfirmation(true);
  };

  const handleFinalSubmit = async (includeGoogle) => {
    if (includeGoogle) {
      window.open("https://www.google.com/search?q=dr+laxminadh+neuro+specialist&sourceid=chrome&ie=UTF-8#lrd=0x3bcb952cc8cf290f:0xf9b5356be67d4fff,3,,,", '_blank');
    }

    try {
      const reviewsRef = collection(db, 'reviews');
      const newReview = {
        ...formData,
        date: new Date().toISOString()
      };
      
      await addDoc(reviewsRef, newReview);

      setShowForm(false);
      setShowConfirmation(false);
      setShowThankYou(true);
      
      setTimeout(() => {
        setShowThankYou(false);
        setFormData({ username: '', reviewText: '', rating: 0 });
      }, 3000);
    } catch (error) {
      console.error('Error adding review:', error);
      alert('Failed to submit review. Please try again.');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setFormData({ username: '', reviewText: '', rating: 0 });
    setErrors({});
  };

  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
  };

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const reviewsRef = collection(db, 'reviews');
        const q = query(reviewsRef, orderBy('date', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const fetchedReviews = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setReviews(fetchedReviews);
      } catch (error) {
        console.error('Error fetching reviews:', error);
      }
    };

    fetchReviews();
  }, [showThankYou]);

  return (
    <div className="min-h-screen pt-5 px-5 pb-10 md:px-15 md:pt-5 lg:px-20 lg:pt-5" style={{ backgroundColor: currentTheme.background }}>
      <div className="max-w-2xl mx-auto">
        {showThankYou && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full text-center" 
                 style={{ backgroundColor: currentTheme.surface }}>
              <h2 className="text-3xl font-bold mb-4">Thank You for Your Review!</h2>
              <p className="text-lg">Your feedback is valuable to us.</p>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold">Reviews</h1>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-2 rounded-md text-white"
              style={{ backgroundColor: currentTheme.primary }}
            >
              Write a Review
            </button>
          )}
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full relative" 
                 style={{ backgroundColor: currentTheme.surface }}>
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold">Submit  review</h2>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block mb-2 font-medium">Name</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className={`w-full p-3 rounded-md border ${errors.username ? 'border-red-500' : ''}`}
                    style={{ borderColor: errors.username ? '#ef4444' : currentTheme.border, backgroundColor: currentTheme.surface }}
                  />
                  {errors.username && <p className="mt-1 text-sm text-red-500">{errors.username}</p>}
                </div>

                <div>
                  <label className="block mb-2 font-medium">Your Review</label>
                  <textarea
                    name="reviewText"
                    value={formData.reviewText}
                    onChange={handleInputChange}
                    rows="4"
                    className={`w-full p-3 rounded-md border ${errors.reviewText ? 'border-red-500' : ''}`}
                    style={{ borderColor: errors.reviewText ? '#ef4444' : currentTheme.border, backgroundColor: currentTheme.surface }}
                  />
                  {errors.reviewText && <p className="mt-1 text-sm text-red-500">{errors.reviewText}</p>}
                </div>

                <div>
                  <label className="block mb-2 font-medium">Rating</label>
                  <div className="flex gap-2 justify-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => handleRatingClick(star)}
                        className="text-2xl transition-colors"
                        style={{ color: star <= formData.rating ? '#FFD700' : currentTheme.border }}
                      >
                        <Star fill={star <= formData.rating ? '#FFD700' : 'none'} />
                      </button>
                    ))}
                  </div>
                  {errors.rating && <p className="mt-1 text-sm text-red-500">{errors.rating}</p>}
                </div>

                <div className="flex gap-4 justify-center">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-6 py-2 rounded-md border"
                    style={{ borderColor: currentTheme.border }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-md text-white"
                    style={{ backgroundColor: currentTheme.primary }}
                  >
                    Submit Review
                  </button>
                </div>
              </form>

              {showConfirmation && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
                  <div className="bg-white rounded-lg p-6 max-w-md w-full" 
                       style={{ backgroundColor: currentTheme.surface }}>
                    <h2 className="text-xl font-bold mb-4">Submit Review</h2>
                    <p className="mb-6">Are you sure you want to review?</p>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={handleCancelConfirmation}
                        className="px-3 py-1 rounded-md border text-sm"
                        style={{ borderColor: currentTheme.border }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleFinalSubmit(false)}
                        className="px-3 py-1 rounded-md border text-sm"
                        style={{ borderColor: currentTheme.border }}
                      >
                        Submit Here
                      </button>
                      <button
                        onClick={() => handleFinalSubmit(true)}
                        className="px-3 py-1 rounded-md text-white text-sm"
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

        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="p-4 rounded-lg border"
              style={{ borderColor: currentTheme.border, backgroundColor: currentTheme.surface }}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-medium">{review.username}</h3>
                  <p className="text-sm opacity-70">{formatDate(review.date)}</p>
                </div>
                <div className="flex gap-1">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star key={i} size={16} fill="#FFD700" color="#FFD700" />
                  ))}
                </div>
              </div>
              
              <div>
                <p className="line-clamp-2">{review.reviewText}</p>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowPreview(review.id);
                  }}
                  className="mt-2 text-sm hover:underline"
                  style={{ color: currentTheme.primary }}
                >
                  View more
                </a>
              </div>
            </div>
          ))}
        </div>

        {showPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center text-justify p-4 z-50">
            <div 
              className="bg-white rounded-lg p-6 max-w-3xl w-full relative max-h-[80vh] flex flex-col"
              style={{ backgroundColor: currentTheme.surface }}
            >
              <div className="overflow-y-auto pr-2 mb-4">
                {reviews.map(review => review.id === showPreview && (
                  <div key={review.id}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold">{review.username}</h3>
                        <p className="text-sm opacity-70">{formatDate(review.date)}</p>
                      </div>
                      <div className="flex gap-1">
                        {[...Array(review.rating)].map((_, i) => (
                          <Star key={i} size={20} fill="#FFD700" color="#FFD700" />
                        ))}
                      </div>
                    </div>
                    <p className="text-lg whitespace-pre-wrap">{review.reviewText}</p>
                  </div>
                ))}
              </div>
              
              <div className="mt-auto">
                <button
                  onClick={() => setShowPreview(null)}
                  className="px-6 py-2 rounded-md border  text-black"
                  style={{ borderColor: currentTheme.border }}
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