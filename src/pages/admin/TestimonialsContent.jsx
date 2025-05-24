// TestimonialsContent.jsx - Admin CMS Component with Inline Form
import React, { useState, useEffect } from 'react';
import { PlusCircle, Edit, Trash2, ChevronUp } from 'lucide-react';
import { db } from '../../firebase/config';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';

function TestimonialsContent() {
  const [testimonials, setTestimonials] = useState([]);
  const [editingTestimonial, setEditingTestimonial] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    testimonialtext: '',
  });
  const [isFormVisible, setIsFormVisible] = useState(false);

  // Load testimonials from localStorage on component mount
  useEffect(() => {
    const storedTestimonials = localStorage.getItem('testimonials');
    if (storedTestimonials) {
      setTestimonials(JSON.parse(storedTestimonials));
    }
  }, []);

  // Save testimonials to localStorage whenever they change
  useEffect(() => {
    if (testimonials.length > 0) {
      localStorage.setItem('testimonials', JSON.stringify(testimonials));
    }
  }, [testimonials]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      testimonialtext: '',
    });
    setEditingTestimonial(null);
  };

  const openForm = (testimonial = null) => {
    if (testimonial) {
      setEditingTestimonial(testimonial.id);
      setFormData({
        name: testimonial.name,
        email: testimonial.email,
        testimonialtext: testimonial.testimonialtext || testimonial.reviewtext, // Handle both old and new field names
      });
    } else {
      resetForm();
    }
    setIsFormVisible(true);
    
    // Scroll to form after a short delay to ensure it's rendered
    setTimeout(() => {
      document.getElementById('testimonial-form').scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }, 100);
  };

  const closeForm = () => {
    resetForm();
    setIsFormVisible(false);
  };

  // Load testimonials from Firebase on component mount
  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const testimonialsCollection = collection(db, 'testimonials');
        const testimonialsSnapshot = await getDocs(testimonialsCollection);
        const testimonialsList = testimonialsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTestimonials(testimonialsList);
      } catch (error) {
        console.error("Error fetching testimonials:", error);
      }
    };

    fetchTestimonials();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingTestimonial) {
        // Update existing testimonial in Firebase
        const testimonialRef = doc(db, 'testimonials', editingTestimonial);
        await updateDoc(testimonialRef, formData);
        
        // Update local state
        setTestimonials(
          testimonials.map((item) =>
            item.id === editingTestimonial
              ? { ...item, ...formData }
              : item
          )
        );
      } else {
        // Add new testimonial to Firebase
        const testimonialsCollection = collection(db, 'testimonials');
        const docRef = await addDoc(testimonialsCollection, {
          ...formData,
          createdAt: new Date().toISOString()
        });
        
        // Update local state
        const newTestimonial = {
          id: docRef.id,
          ...formData,
          createdAt: new Date().toISOString()
        };
        setTestimonials([...testimonials, newTestimonial]);
      }
      
      closeForm();
    } catch (error) {
      console.error("Error saving testimonial:", error);
      alert("Error saving testimonial. Please try again.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this testimonial?')) {
      try {
        // Delete from Firebase
        await deleteDoc(doc(db, 'testimonials', id));
        
        // Update local state
        const updatedTestimonials = testimonials.filter((item) => item.id !== id);
        setTestimonials(updatedTestimonials);
      } catch (error) {
        console.error("Error deleting testimonial:", error);
        alert("Error deleting testimonial. Please try again.");
      }
    }
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={`text-lg ${i < rating ? 'text-yellow-500' : 'text-gray-300'}`}>
        ★
      </span>
    ));
  };

  // Clear all testimonials (for testing purposes)
  const clearAllTestimonials = () => {
    if (window.confirm('Are you sure you want to delete ALL testimonials? This will reset to defaults on page refresh.')) {
      localStorage.removeItem('testimonials');
      setTestimonials([]);
    }
  };

  return (
    <div className="p-3 sm:p-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 mt-12 gap-4">
        <h2 className="text-xl sm:text-2xl font-bold">Testimonials Management</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => openForm()}
            className="flex items-center gap-1 sm:gap-2 bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 text-sm sm:text-base flex-grow sm:flex-grow-0"
          >
            <PlusCircle size={16} />
            <span>Add Testimonial</span>
          </button>
          <button
            onClick={clearAllTestimonials}
            className="flex items-center gap-1 sm:gap-2 bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700 text-sm sm:text-base flex-grow sm:flex-grow-0"
          >
            <Trash2 size={16} />
            <span>Reset All</span>
          </button>
        </div>
      </div>

      {/* Inline Form Section */}
      {isFormVisible && (
        <div id="testimonial-form" className="bg-white p-4 sm:p-6 rounded-lg shadow-md mb-6 border-2 border-blue-200 animate-fadeIn">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg sm:text-xl font-semibold">
              {editingTestimonial ? 'Edit Testimonial' : 'Add New Testimonial'}
            </h3>
            <button 
              onClick={closeForm}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Close form"
            >
              <ChevronUp size={20} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Testimonial</label>
              <textarea
                name="testimonialtext"
                value={formData.testimonialtext}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows="4"
                required
              ></textarea>
            </div>
            
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={closeForm}
                className="px-3 py-2 border rounded-md hover:bg-gray-100 text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm sm:text-base"
              >
                {editingTestimonial ? 'Update' : 'Add'} Testimonial
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Testimonials List */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((testimonial) => (
          <div key={testimonial.id} className="bg-white p-4 rounded-lg shadow">
            <div className="flex flex-wrap sm:flex-nowrap justify-between mb-3">
              <div className="flex items-center w-full sm:w-auto mb-2 sm:mb-0">
                <div className="overflow-hidden">
                  <h3 className="font-semibold truncate">{testimonial.name}</h3>
                  <p className="text-xs sm:text-sm text-gray-600 truncate">
                    {testimonial.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <button
                  onClick={() => openForm(testimonial)}
                  className="text-blue-600 hover:text-blue-800 mr-2"
                  aria-label="Edit testimonial"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => handleDelete(testimonial.id)}
                  className="text-red-600 hover:text-red-800"
                  aria-label="Delete testimonial"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <p className="text-sm sm:text-base text-gray-700 line-clamp-4 sm:line-clamp-none">
              {testimonial.testimonialtext || testimonial.reviewtext}
            </p>
          </div>
        ))}
      </div>

      {testimonials.length === 0 && (
        <div className="text-center py-8 sm:py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 text-sm sm:text-base">No testimonials added yet. Click "Add Testimonial" to create one.</p>
        </div>
      )}
    </div>
  );
}

export default TestimonialsContent;