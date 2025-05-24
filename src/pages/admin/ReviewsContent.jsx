import React, { useState, useEffect } from 'react';
import CustomButton from '../../components/CustomButton';
import CustomInput from '../../components/CustomInput';
import CustomSelect from '../../components/CustomSelect';
import CustomTable from '../../components/CustomTable';
import { useTheme } from '../../context/ThemeContext';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { FaEye, FaTrash } from 'react-icons/fa';
import { Trash2 } from 'lucide-react';
import CustomDeleteConfirmation from '../../components/CustomDeleteConfirmation';

function ReviewsContent() {
  const { currentTheme } = useTheme();
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedReviewId, setSelectedReviewId] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [selectedReview, setSelectedReview] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const [newReview, setNewReview] = useState({
    username: '',
    reviewText: '',
    rating: 0
  });

  // Fetch reviews from Firebase
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
  }, [showForm]); // Add showForm as a dependency

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewReview(prev => ({
      ...prev,
      [name]: name === 'rating' ? parseInt(value, 10) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const reviewsRef = collection(db, 'reviews');
      const newReviewData = {
        username: newReview.username.trim(),
        rating: parseInt(newReview.rating, 10),
        reviewText: newReview.reviewText.trim(),
        date: new Date().toISOString()
      };
      
      const docRef = await addDoc(reviewsRef, newReviewData);
      const reviewWithId = {
        ...newReviewData,
        id: docRef.id
      };
      
      setReviews(prev => [reviewWithId, ...prev]);
      setNewReview({ username: '', rating: 0, reviewText: '' });
      setShowForm(false);
    } catch (error) {
      console.error('Error adding review:', error);
      alert('Failed to add review. Please try again.');
    }
  };

  const handleDelete = (id) => {
    setSelectedReviewId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteDoc(doc(db, 'reviews', selectedReviewId));
      setReviews(prev => prev.filter(review => review.id !== selectedReviewId));
      setShowDeleteConfirm(false);
      setSelectedReviewId(null);
    } catch (error) {
      console.error('Error deleting review:', error);
      alert('Failed to delete review. Please try again.');
    }
  };

  const handleViewReview = (review) => {
    setSelectedReview(review);
    setShowReviewModal(true);
  };

  const [expandedReview, setExpandedReview] = useState(null);

  const tableHeaders = ['Name', 'Rating', 'Review', 'Date', 'Actions'];

  const tableData = reviews.map(review => [
    review.username,
    <div>
      <span style={{ color: currentTheme.primary }}>{'★'.repeat(review.rating)}</span>
      <span style={{ color: currentTheme.text.secondary }}>{'☆'.repeat(5 - review.rating)}</span>
    </div>,
    review.reviewText.length > 100 ? `${review.reviewText.substring(0, 100)}...` : review.reviewText,
    new Date(review.date).toLocaleDateString(),
    <div className="flex space-x-2">
      <button
        onClick={() => handleViewReview(review)}
        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        aria-label="View review"
      >
        <FaEye className="w-5 h-5" style={{ color: currentTheme.text.primary }} />
      </button>
      <button
        onClick={() => handleDelete(review.id)}
        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        aria-label="Delete review"
      >
        <FaTrash className="w-5 h-5" style={{ color: currentTheme.error }} />
      </button>
    </div>
  ]);

  const [viewingReview, setViewingReview] = useState(null);

  const handleBackToList = () => {
    setViewingReview(null);
  };

  const ReviewView = ({ review }) => (
    <div 
      className="rounded-lg p-6 shadow"
      style={{ 
        backgroundColor: currentTheme.surface,
        color: currentTheme.text.primary,
        border: `1px solid ${currentTheme.border}`
      }}
    >
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold" style={{ color: currentTheme.text.primary }}>
          Review Details
        </h3>
        <div className="flex justify-end">
          <CustomButton
            variant="secondary"
            onClick={handleBackToList}
            className="px-4"
            style={{
              backgroundColor: currentTheme.background.secondary,
              color: currentTheme.text.primary
            }}
          >
            Back to List
          </CustomButton>
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <span className="font-semibold" style={{ color: currentTheme.text.secondary }}>Name: </span>
          <span>{review.username}</span>
        </div>
        <div>
          <span className="font-semibold" style={{ color: currentTheme.text.secondary }}>Rating: </span>
          <span style={{ color: currentTheme.primary }}>{'★'.repeat(review.rating)}</span>
          <span style={{ color: currentTheme.text.secondary }}>{'☆'.repeat(5 - review.rating)}</span>
        </div>
        <div>
          <span className="font-semibold" style={{ color: currentTheme.text.secondary }}>Date: </span>
          <span>{new Date(review.date).toLocaleDateString()}</span>
        </div>
        <div>
          <span className="font-semibold" style={{ color: currentTheme.text.secondary }}>Review: </span>
          <p className="whitespace-pre-wrap mt-2">{review.reviewText}</p>
        </div>
      </div>
    </div>
  );

  // Add handler for bulk deletion
  const handleBulkDelete = async (ids) => {
    try {
      for (const id of ids) {
        await deleteDoc(doc(db, 'reviews', id));
      }
      setReviews(prev => prev.filter(review => !ids.includes(review.id)));
    } catch (error) {
      console.error('Error deleting reviews:', error);
    }
  };

  return (
    <div className="p-4" style={{ backgroundColor: currentTheme.background.primary, color: currentTheme.text.primary }}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold" style={{ color: currentTheme.text.primary }}>Reviews Management</h2>
        <CustomButton
          variant="primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'View Reviews' : 'Add New Review'}
        </CustomButton>
      </div>

      {showForm ? (
        <form 
          onSubmit={handleSubmit} 
          className="space-y-4 p-6 rounded-lg shadow relative"
          style={{ 
            backgroundColor: currentTheme.surface,
            border: `1px solid ${currentTheme.border}`
          }}
        >
          <div className="flex justify-end mb-4">
            <CustomButton
              variant="secondary"
              onClick={() => {
                setShowForm(false);
                setNewReview({ username: '', rating: 0, reviewText: '' });
              }}
              className="px-4"
              style={{
                backgroundColor: currentTheme.background.secondary,
                color: currentTheme.text.primary
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
          />
          
          <CustomSelect
            label="Rating"
            name="rating"
            value={newReview.rating}
            onChange={handleInputChange}
            options={[1, 2, 3, 4, 5].map(num => ({
              value: num,
              label: `${num} Star${num > 1 ? 's' : ''}`,
              key: `rating-${num}`  // Add unique key prefix
            }))}
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
          />
          
          <CustomButton
            type="submit"
            variant="primary"
          >
            Submit Review
          </CustomButton>
        </form>
      ) : viewingReview ? (
        <ReviewView review={viewingReview} />
      ) : (
        <CustomTable 
          headers={tableHeaders}
          onBulkDelete={handleBulkDelete}
        >
          {reviews.map(review => (
            <tr key={review.id} id={review.id}>
              <td className="px-2 sm:px-6 py-4" style={{ color: currentTheme.text.primary }}>{review.username}</td>
              <td className="px-2 sm:px-6 py-4">
                <span style={{ color: currentTheme.primary }}>{'★'.repeat(review.rating)}</span>
                <span style={{ color: currentTheme.text.secondary }}>{'☆'.repeat(5 - review.rating)}</span>
              </td>
              <td 
                className="px-2 sm:px-6 py-4 whitespace-pre-wrap max-w-md" 
                style={{ color: currentTheme.text.primary }}
              >
                {review.reviewText.length > 50
                  ? `${review.reviewText.substring(0, 50)}...`
                  : review.reviewText
                }
              </td>
              <td className="px-2 sm:px-6 py-4" style={{ color: currentTheme.text.primary }}>
                {new Date(review.date).toLocaleDateString()}
              </td>
              <td className="px-2 sm:px-6 py-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setViewingReview(review)}
                    className="p-2 rounded-full transition-colors"
                    aria-label="View review"
                    style={{ color: currentTheme.text.secondary }}
                  >
                    <FaEye className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(review.id)}
                    className="p-2 rounded-full text-red-600 hover:text-red-800 transition-colors"
                    aria-label="Delete review"
                    style={{ color: currentTheme.error }}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </CustomTable>
      )}

      <CustomDeleteConfirmation
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Review"
        message="Are you sure you want to delete this review? This action cannot be undone."
      />
    </div>
  );
}

export default ReviewsContent;