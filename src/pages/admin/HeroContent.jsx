import React, { useState } from 'react';
import { FaUpload, FaSave } from 'react-icons/fa';

const HeroContent = () => {
  const [heroData, setHeroData] = useState({
    title: "Welcome to BeautySpace",
    subtitle: "Premium beauty services for everyone",
    ctaText: "Book Now",
    ctaLink: "/book",
    backgroundImage: "/images/hero-bg.jpg"
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [tempData, setTempData] = useState({...heroData});
  const [notification, setNotification] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTempData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setTempData({...heroData});
    setIsEditing(false);
  };

  const handleSave = () => {
    setHeroData({...tempData});
    setIsEditing(false);
    showNotification("Hero section updated successfully!");
    // In a real app, you would make an API call here to save the data
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // In a real app, you would upload the file to a server and get a URL back
      // For this demo, we'll just use a fake URL
      setTempData(prev => ({
        ...prev,
        backgroundImage: URL.createObjectURL(file)
      }));
    }
  };

  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 w-full max-w-full mt-16 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 space-y-3 sm:space-y-0">
        <h2 className="text-xl sm:text-2xl font-bold">Hero Section</h2>
        {!isEditing ? (
          <button 
            onClick={handleEdit}
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded w-full sm:w-auto"
          >
            Edit Hero
          </button>
        ) : (
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
            <button 
              onClick={handleCancel}
              className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded w-full sm:w-auto"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded flex items-center justify-center w-full sm:w-auto"
            >
              <FaSave className="mr-2" /> Save Changes
            </button>
          </div>
        )}
      </div>

      {notification && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {notification}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-base sm:text-lg font-semibold mb-4">Content</h3>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm mb-2">Title</label>
            {isEditing ? (
              <input
                type="text"
                name="title"
                value={tempData.title}
                onChange={handleChange}
                className="w-full p-2 border rounded text-sm sm:text-base"
              />
            ) : (
              <p className="p-2 bg-gray-100 rounded text-sm sm:text-base">{heroData.title}</p>
            )}
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm mb-2">Subtitle</label>
            {isEditing ? (
              <input
                type="text"
                name="subtitle"
                value={tempData.subtitle}
                onChange={handleChange}
                className="w-full p-2 border rounded text-sm sm:text-base"
              />
            ) : (
              <p className="p-2 bg-gray-100 rounded text-sm sm:text-base">{heroData.subtitle}</p>
            )}
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm mb-2">CTA Text</label>
            {isEditing ? (
              <input
                type="text"
                name="ctaText"
                value={tempData.ctaText}
                onChange={handleChange}
                className="w-full p-2 border rounded text-sm sm:text-base"
              />
            ) : (
              <p className="p-2 bg-gray-100 rounded text-sm sm:text-base">{heroData.ctaText}</p>
            )}
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm mb-2">CTA Link</label>
            {isEditing ? (
              <input
                type="text"
                name="ctaLink"
                value={tempData.ctaLink}
                onChange={handleChange}
                className="w-full p-2 border rounded text-sm sm:text-base"
              />
            ) : (
              <p className="p-2 bg-gray-100 rounded text-sm sm:text-base">{heroData.ctaLink}</p>
            )}
          </div>
        </div>
        
        <div>
          <h3 className="text-base sm:text-lg font-semibold mb-4">Background Image</h3>
          
          <div className="mb-4">
            <div className="border rounded-lg overflow-hidden h-48 sm:h-64 bg-gray-100 flex items-center justify-center">
              {isEditing ? (
                <div className="relative w-full h-full">
                  {tempData.backgroundImage ? (
                    <img 
                      src={tempData.backgroundImage} 
                      alt="Hero background preview" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200">
                      No image selected
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40">
                    <label className="bg-white px-3 py-2 rounded cursor-pointer hover:bg-gray-100 flex items-center text-sm sm:text-base">
                      <FaUpload className="mr-2" />
                      Upload Image
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleImageUpload}
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <img 
                  src={heroData.backgroundImage} 
                  alt="Hero background" 
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            {!isEditing && (
              <p className="mt-2 text-xs sm:text-sm text-gray-600 truncate">
                {heroData.backgroundImage}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-base sm:text-lg font-semibold mb-4">Preview</h3>
        <div 
          className="relative h-48 sm:h-64 rounded-lg overflow-hidden flex items-center justify-center"
          style={{ backgroundImage: `url(${isEditing ? tempData.backgroundImage : heroData.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        >
          <div className="absolute inset-0 bg-black bg-opacity-40"></div>
          <div className="relative text-center text-white p-4">
            <h2 className="text-xl sm:text-3xl font-bold mb-1 sm:mb-2">{isEditing ? tempData.title : heroData.title}</h2>
            <p className="text-base sm:text-xl mb-3 sm:mb-4">{isEditing ? tempData.subtitle : heroData.subtitle}</p>
            <button className="bg-white text-black px-4 sm:px-6 py-1 sm:py-2 rounded-full font-medium hover:bg-opacity-90 text-sm sm:text-base">
              {isEditing ? tempData.ctaText : heroData.ctaText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroContent;