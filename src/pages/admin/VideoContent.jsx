import React, { useState, useEffect } from 'react';
import { Play, Trash2, Edit, Plus, X, Check } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import CustomButton from '../../components/CustomButton';
import CustomInput from '../../components/CustomInput';
import CustomSearch from '../../components/CustomSearch';
import CustomDeleteConfirmation from '../../components/CustomDeleteConfirmation';

function VideoContent() {
  const { currentTheme } = useTheme();
  const [videos, setVideos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    videoId: null
  });

  const getYouTubeThumbnail = (url) => {
    try {
      const regExp = /^.*((youtu.be\/)|(v\/)|(\/v\/)|(\/embed\/)|(\/watch\?v=)|\&v=)([^#\&\?]*).*/;
      const match = url.match(regExp);
      const videoId = match && match[7].length === 11 ? match[7] : null;
      return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '';
    } catch (error) {
      console.error('Error getting thumbnail:', error);
      return '';
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'youtubeLink' ? { thumbnail: getYouTubeThumbnail(value) } : {})
    }));
  };

  const [formData, setFormData] = useState({
    title: '',
    duration: '',
    youtubeLink: '',
    thumbnail: ''
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingVideo(null);
    setFormData({
      title: '',
      duration: '',
      youtubeLink: '',
      thumbnail: ''
    });
  };

  const openAddForm = () => {
    setEditingVideo(null);
    setFormData({
      title: '',
      duration: '',
      youtubeLink: '',
      thumbnail: ''
    });
    setShowForm(true);
    
    setTimeout(() => {
      const formElement = document.getElementById('video-form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const db = getFirestore();
      const videosCollection = collection(db, 'videos');
      const videoSnapshot = await getDocs(videosCollection);
      const videoList = videoSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setVideos(videoList);
    } catch (error) {
      console.error('Error fetching videos:', error);
    }
  };

  const handleDeleteClick = (videoId) => {
    setDeleteConfirmation({
      isOpen: true,
      videoId: videoId
    });
  };

  const handleDelete = async (id) => {
    try {
      const db = getFirestore();
      await deleteDoc(doc(db, 'videos', id));
      setVideos(videos.filter(video => video.id !== id));
      setDeleteConfirmation({ isOpen: false, videoId: null });
    } catch (error) {
      console.error('Error deleting video:', error);
    }
  };

  const handleEdit = (video) => {
    setEditingVideo(video);
    setFormData({
      title: video.title,
      thumbnail: video.thumbnail,
      duration: video.duration,
      youtubeLink: video.youtubeLink
    });
    setShowForm(true);
    
    setTimeout(() => {
      document.getElementById('video-form').scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const currentDate = new Date().toISOString().split('T')[0];
    
    const thumbnailUrl = formData.thumbnail || getYouTubeThumbnail(formData.youtubeLink);
    
    try {
      const db = getFirestore();
      const videoData = {
        ...formData,
        thumbnail: thumbnailUrl,
        date: currentDate
      };
    
      if (editingVideo) {
        await updateDoc(doc(db, 'videos', editingVideo.id), videoData);
        setVideos(videos.map(video => 
          video.id === editingVideo.id ? 
          { ...video, ...videoData } : 
          video
        ));
      } else {
        const docRef = await addDoc(collection(db, 'videos'), {
          ...videoData,
          views: 0
        });
        const newVideo = {
          id: docRef.id,
          ...videoData,
          views: 0
        };
        setVideos([newVideo, ...videos]);
      }
      resetForm();
    } catch (error) {
      console.error('Error saving video:', error);
    }
  };

  return (
    <div className="p-4 sm:p-6">
      {/* Combined Header and Search Section */}
      {!showForm && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
          <h2 className="text-xl sm:text-2xl font-semibold" style={{ color: currentTheme.text.primary }}>Video Library Management</h2>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex-1 sm:flex-none sm:w-64">
              <CustomSearch
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search videos..."
              />
            </div>
            <CustomButton onClick={openAddForm} icon={Plus} className="w-full sm:w-auto">
              Add New Video
            </CustomButton>
          </div>
        </div>
      )}

      {/* Video Form Section */}
      {showForm && (
        <div id="video-form" className="mb-6 rounded-lg p-4 sm:p-6 transition-all duration-300 max-w-md mx-auto"
          style={{ 
            backgroundColor: currentTheme.background,
            border: `1px solid ${currentTheme.border}`
          }}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg sm:text-xl font-semibold" style={{ color: currentTheme.text.primary }}>
              {editingVideo ? 'Edit Video' : 'Add New Video'}
            </h3>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <CustomInput
              label="Video Title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
            />
            
            <CustomInput
              label="YouTube Link"
              name="youtubeLink"
              value={formData.youtubeLink}
              onChange={handleInputChange}
              placeholder="https://youtube.com/watch?v=..."
              required
            />
            
            <CustomInput
              label="Video Duration"
              name="duration"
              value={formData.duration}
              onChange={handleInputChange}
              placeholder="e.g. 5:30"
              required
            />
            
            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mt-4">
              <CustomButton variant="secondary" onClick={resetForm} icon={X} className="w-24">
                Cancel
              </CustomButton>
              <CustomButton type="submit" icon={Check} className="w-24">
                {editingVideo ? 'Save Changes' : 'Add Video'}
              </CustomButton>
            </div>
          </form>
        </div>
      )}

      {/* Content Section */}
      {!showForm && (
        <>
          {videos.length === 0 ? (
            <div className="text-center py-8 sm:py-10">
              <p style={{ color: currentTheme.text.secondary }}>No videos found. Add your first video.</p>
              <button 
                className="mt-4 px-4 py-2 rounded-md flex items-center mx-auto"
                style={{ 
                  backgroundColor: currentTheme.primary,
                  color: 'white'
                }}
                onClick={openAddForm}
              >
                <Plus className="mr-2" size={18} />
                Add Video
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {videos.map(video => (
                <div key={video.id} className="rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  style={{ 
                    backgroundColor: currentTheme.surface,
                    border: `1px solid ${currentTheme.border}`
                  }}
                >
                  <div className="relative">
                    <img 
                      src={video.thumbnail || getYouTubeThumbnail(video.youtubeLink)} 
                      alt={video.title} 
                      className="w-full h-36 sm:h-48 object-cover"
                      onError={(e) => {
                        e.target.src = getYouTubeThumbnail(video.youtubeLink);
                      }}
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <a href={video.youtubeLink} target="_blank" rel="noopener noreferrer" className="p-2 sm:p-3 bg-white rounded-full shadow-md">
                        <Play fill="currentColor" size={20} />
                      </a>
                    </div>
                    <span className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                      {video.duration}
                    </span>
                  </div>
                  
                  <div className="p-3 sm:p-4">
                    <h3 className="font-medium text-base sm:text-lg mb-1 line-clamp-2">{video.title}</h3>
                    <div className="flex justify-between text-xs sm:text-sm text-gray-500">
                      <span>Uploaded: {video.date}</span>
                      <span>{video.views} views</span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-500 truncate mt-1">
                      {video.youtubeLink}
                    </p>
                    
                    <div className="flex mt-3 sm:mt-4 space-x-2">
                      <button 
                        className="flex-1 py-1 border border-gray-300 rounded-md flex items-center justify-center hover:bg-gray-50 text-sm"
                        onClick={() => handleEdit(video)}
                      >
                        <Edit size={14} className="mr-1" />
                        Edit
                      </button>
                      <button 
                        className="flex-1 py-1 border border-gray-300 rounded-md flex items-center justify-center hover:bg-gray-50 text-red-600 text-sm"
                        onClick={() => handleDeleteClick(video.id)}
                      >
                        <Trash2 size={14} className="mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      
      <CustomDeleteConfirmation 
        isOpen={deleteConfirmation.isOpen} 
        onClose={() => setDeleteConfirmation({ isOpen: false, videoId: null })} 
        onConfirm={() => handleDelete(deleteConfirmation.videoId)} 
        title="Delete Video" 
        message="Are you sure you want to delete this video? This action cannot be undone." 
      />
    </div>
  );
}

export default VideoContent;