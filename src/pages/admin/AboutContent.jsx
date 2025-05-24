import React, { useState, useEffect } from 'react';
import { FaEdit, FaSave, FaTimesCircle, FaUpload, FaGraduationCap, FaAward, FaBrain, FaBook } from 'react-icons/fa';
import { useTheme } from '../../context/ThemeContext';

const AboutContent = () => {
  const { currentTheme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [notification, setNotification] = useState(null);

  // Default content if nothing in localStorage
  const defaultAboutData = {
    title: "About Dr. Specialist",
    description: "With over 15 years of experience in neurosurgery, Dr. Specialist has established himself as one of Hyderabad's leading neurosurgeons. Specializing in minimally invasive surgical techniques, he has successfully treated thousands of patients suffering from various neurological disorders.\nTrained at prestigious medical institutions worldwide, Dr. Specialist combines advanced medical expertise with a compassionate approach to patient care. His commitment to innovation in neurosurgical treatments has earned him numerous accolades and the trust of patients across India and internationally.",
    image: "../assets/drimg.png",
    achievements: [
      {
        id: 1,
        icon: "FaGraduationCap",
        title: "Education",
        description: "MBBS, MD Neurology, Fellowship in Advanced Neurosurgery"
      },
      {
        id: 2,
        icon: "FaAward",
        title: "Accolades",
        description: "National Award for Medical Excellence, Top Neurologist 2023"
      },
      {
        id: 3,
        icon: "FaBrain",
        title: "Specialization",
        description: "Brain Tumors, Spine Surgery, Minimally Invasive Techniques"
      },
      {
        id: 4,
        icon: "FaBook",
        title: "Publications",
        description: "30+ research papers in international medical journals"
      }
    ]
  };

  // State for current data and temp data for editing
  const [aboutData, setAboutData] = useState(defaultAboutData);
  const [tempData, setTempData] = useState({...defaultAboutData});
  const [editingAchievement, setEditingAchievement] = useState(null);
  const [tempAchievement, setTempAchievement] = useState(null);

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedData = localStorage.getItem('aboutPageData');
    if (savedData) {
      setAboutData(JSON.parse(savedData));
      setTempData(JSON.parse(savedData));
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTempData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEdit = () => {
    setIsEditing(true);
    setTempData({...aboutData});
  };

  const handleCancel = () => {
    setTempData({...aboutData});
    setIsEditing(false);
    setEditingAchievement(null);
  };

  const handleSave = () => {
    setAboutData({...tempData});
    localStorage.setItem('aboutPageData', JSON.stringify(tempData));
    setIsEditing(false);
    showNotification("About section updated successfully!");
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // In a real app, you'd upload this to a server
      // For this demo, we'll use a data URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempData(prev => ({
          ...prev,
          image: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAchievementEdit = (achievement) => {
    setEditingAchievement(achievement.id);
    setTempAchievement({...achievement});
  };

  const handleAchievementChange = (e) => {
    const { name, value } = e.target;
    setTempAchievement(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAchievementSave = () => {
    setTempData(prev => ({
      ...prev,
      achievements: prev.achievements.map(item => 
        item.id === tempAchievement.id ? tempAchievement : item
      )
    }));
    setEditingAchievement(null);
  };

  const handleAchievementCancel = () => {
    setEditingAchievement(null);
  };

  const handleAddAchievement = () => {
    const newAchievement = {
      id: Date.now(),
      icon: "FaGraduationCap",
      title: "New Achievement",
      description: "Description goes here"
    };
    
    setTempData(prev => ({
      ...prev,
      achievements: [...prev.achievements, newAchievement]
    }));
    
    setEditingAchievement(newAchievement.id);
    setTempAchievement(newAchievement);
  };

  const handleRemoveAchievement = (id) => {
    setTempData(prev => ({
      ...prev,
      achievements: prev.achievements.filter(item => item.id !== id)
    }));
    
    if (editingAchievement === id) {
      setEditingAchievement(null);
    }
  };

  const handleIconChange = (icon) => {
    setTempAchievement(prev => ({
      ...prev,
      icon: icon
    }));
  };

  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  // Function to render the correct icon component
  const renderIcon = (iconName) => {
    switch (iconName) {
      case 'FaGraduationCap': return <FaGraduationCap className="w-6 h-6" />;
      case 'FaAward': return <FaAward className="w-6 h-6" />;
      case 'FaBrain': return <FaBrain className="w-6 h-6" />;
      case 'FaBook': return <FaBook className="w-6 h-6" />;
      default: return <FaGraduationCap className="w-6 h-6" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-3 mt-8 sm:p-6" style={{ backgroundColor: currentTheme.surface }}>
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <h2 className="text-xl sm:text-2xl font-bold" style={{ color: currentTheme.text.primary }}>About Page CMS</h2>
        {!isEditing ? (
          <button 
            onClick={handleEdit}
            className="px-3 py-1 sm:px-4 sm:py-2 rounded text-sm sm:text-base w-full sm:w-auto"
            style={{ backgroundColor: currentTheme.primary, color: currentTheme.text.onPrimary }}
          >
            Edit About
          </button>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button 
              onClick={handleCancel}
              className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 sm:px-4 sm:py-2 rounded text-sm sm:text-base w-full sm:w-auto"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              className="px-3 py-1 sm:px-4 sm:py-2 rounded flex items-center justify-center text-sm sm:text-base w-full sm:w-auto"
              style={{ backgroundColor: currentTheme.primary, color: currentTheme.text.onPrimary }}
            >
              <FaSave className="mr-2" /> Save Changes
            </button>
          </div>
        )}
      </div>

      {/* Notification Bar */}
      {notification && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {notification}
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Content Section */}
        <div>
          <h3 className="text-lg font-semibold mb-4" style={{ color: currentTheme.text.primary }}>Content</h3>
          
          <div className="mb-4">
            <label className="block mb-2" style={{ color: currentTheme.text.secondary }}>Title</label>
            {isEditing ? (
              <input
                type="text"
                name="title"
                value={tempData.title}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                style={{ borderColor: currentTheme.border }}
              />
            ) : (
              <p className="p-2 rounded" style={{ backgroundColor: currentTheme.background, color: currentTheme.text.primary }}>{aboutData.title}</p>
            )}
          </div>
          
          <div className="mb-4">
            <label className="block mb-2" style={{ color: currentTheme.text.secondary }}>Description</label>
            {isEditing ? (
              <textarea
                name="description"
                value={tempData.description}
                onChange={handleChange}
                className="w-full p-2 border rounded h-32 sm:h-48"
                style={{ borderColor: currentTheme.border }}
              />
            ) : (
              <p className="p-2 rounded" style={{ backgroundColor: currentTheme.background, color: currentTheme.text.primary, whiteSpace: 'pre-line' }}>{aboutData.description}</p>
            )}
          </div>
        </div>
        
        {/* Featured Image Section */}
        <div>
          <h3 className="text-lg font-semibold mb-4" style={{ color: currentTheme.text.primary }}>Featured Image</h3>
          
          <div className="mb-4">
            <div className="border rounded-lg overflow-hidden h-48 sm:h-64 flex items-center justify-center" style={{ borderColor: currentTheme.border }}>
              {isEditing ? (
                <div className="relative w-full h-full">
                  <img 
                    src={tempData.image} 
                    alt="About us" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40">
                    <label className="bg-white px-3 py-2 rounded cursor-pointer hover:bg-gray-100 flex items-center text-sm sm:text-base">
                      <FaUpload className="mr-2" />
                      Change Image
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
                  src={aboutData.image} 
                  alt="About us" 
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Achievements Section */}
      <div className="mt-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
          <h3 className="text-lg font-semibold" style={{ color: currentTheme.text.primary }}>Achievements</h3>
          {isEditing && (
            <button 
              onClick={handleAddAchievement}
              className="px-3 py-1 sm:px-4 sm:py-2 rounded text-sm flex items-center w-full sm:w-auto justify-center sm:justify-start"
              style={{ backgroundColor: currentTheme.primary, color: currentTheme.text.onPrimary }}
            >
              + Add Achievement
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(isEditing ? tempData.achievements : aboutData.achievements).map(achievement => (
            <div 
              key={achievement.id} 
              className="border rounded-lg p-3 sm:p-4"
              style={{ 
                borderColor: editingAchievement === achievement.id ? currentTheme.primary : currentTheme.border,
                backgroundColor: currentTheme.surface
              }}
            >
              {editingAchievement === achievement.id ? (
                <div>
                  <div className="mb-3">
                    <label className="block text-sm mb-1" style={{ color: currentTheme.text.secondary }}>Icon</label>
                    <select
                      name="icon"
                      value={tempAchievement.icon}
                      onChange={(e) => handleIconChange(e.target.value)}
                      className="w-full p-2 border rounded text-sm"
                      style={{ borderColor: currentTheme.border }}
                    >
                      <option value="FaGraduationCap">Education</option>
                      <option value="FaAward">Award</option>
                      <option value="FaBrain">Brain</option>
                      <option value="FaBook">Book</option>
                    </select>
                  </div>
                  
                  <div className="mb-3">
                    <label className="block text-sm mb-1" style={{ color: currentTheme.text.secondary }}>Title</label>
                    <input
                      type="text"
                      name="title"
                      value={tempAchievement.title}
                      onChange={handleAchievementChange}
                      className="w-full p-2 border rounded text-sm"
                      style={{ borderColor: currentTheme.border }}
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="block text-sm mb-1" style={{ color: currentTheme.text.secondary }}>Description</label>
                    <textarea
                      name="description"
                      value={tempAchievement.description}
                      onChange={handleAchievementChange}
                      className="w-full p-2 border rounded text-sm h-20"
                      style={{ borderColor: currentTheme.border }}
                    />
                  </div>
                  
                  <div className="flex flex-col sm:flex-row justify-between mt-4 gap-2">
                    <button 
                      onClick={handleAchievementCancel}
                      className="bg-gray-200 text-gray-800 px-3 py-1 rounded text-sm w-full sm:w-auto"
                    >
                      Cancel
                    </button>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button 
                        onClick={() => handleRemoveAchievement(achievement.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm flex-1 sm:flex-none"
                      >
                        Remove
                      </button>
                      <button 
                        onClick={handleAchievementSave}
                        className="px-3 py-1 rounded text-sm flex-1 sm:flex-none"
                        style={{ backgroundColor: currentTheme.primary, color: currentTheme.text.onPrimary }}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div 
                    className="flex items-center gap-3 mb-2"
                    style={{ color: currentTheme.primary }}
                  >
                    {renderIcon(achievement.icon)}
                    <h3 className="font-semibold">{achievement.title}</h3>
                  </div>
                  <p style={{ color: currentTheme.text.secondary }}>
                    {achievement.description}
                  </p>
                  
                  {isEditing && (
                    <div className="mt-3 flex justify-end">
                      <button 
                        onClick={() => handleAchievementEdit(achievement)}
                        className="p-1 rounded hover:bg-blue-200"
                        style={{ backgroundColor: `${currentTheme.primary}20`, color: currentTheme.primary }}
                      >
                        <FaEdit />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Preview Section */}
      {isEditing && (
        <div className="mt-8 border-t pt-6" style={{ borderColor: currentTheme.border }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: currentTheme.text.primary }}>Preview</h3>
          
          <div className="border rounded-lg p-3 sm:p-6" style={{ borderColor: currentTheme.border, backgroundColor: currentTheme.background }}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12 items-center">
              <div className="relative">
                <div className="aspect-[3/4] rounded-lg overflow-hidden">
                  <img
                    src={tempData.image}
                    alt="Dr. Specialist"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute inset-0 rounded-lg"
                  style={{ 
                    background: `linear-gradient(to bottom, transparent 50%, ${currentTheme.surface})`
                  }}
                ></div>
              </div>

              <div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4" style={{ color: currentTheme.text.primary }}>{tempData.title}</h2>
                  <p className="mb-6 sm:mb-8 text-justify text-sm sm:text-base" style={{ color: currentTheme.text.secondary, whiteSpace: 'pre-line' }}>{tempData.description}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  {tempData.achievements.map((item, index) => (
                    <div
                      key={index}
                      style={{
                        backgroundColor: currentTheme.surface,
                        borderColor: currentTheme.border
                      }}
                      className="p-3 sm:p-4 rounded-lg border"
                    >
                      <div 
                        className="flex items-center gap-3 mb-2"
                        style={{ color: currentTheme.primary }}
                      >
                        {renderIcon(item.icon)}
                        <h3 className="font-semibold text-sm sm:text-base">{item.title}</h3>
                      </div>
                      <p className="text-sm sm:text-base" style={{ color: currentTheme.text.secondary }}>
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AboutContent;