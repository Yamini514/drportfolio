import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { Play } from 'lucide-react';

function Video() {
  const { currentTheme } = useTheme();
  const [videos, setVideos] = useState([]);

  // Improved YouTube thumbnail extraction function
  const getYouTubeThumbnail = (url) => {
    try {
      // Handle different YouTube URL formats
      const regExp = /^.*((youtu.be\/)|(v\/)|(\/v\/)|(\/embed\/)|(\/watch\?v=)|\&v=)([^#\&\?]*).*/;
      const match = url.match(regExp);
      const videoId = match && match[7].length === 11 ? match[7] : null;
      return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '';
    } catch (error) {
      console.error('Error getting thumbnail:', error);
      return '';
    }
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

  return (
    <div className="px-6 pb-5 md:px-6 md:pb-5 lg:px-8" style={{ backgroundColor: currentTheme.background }}>
      <div className="container mx-auto">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Educational Videos</h1>
          <p className="text-lg" style={{ color: currentTheme.text.secondary }}>
            Watch informational videos about neurosurgical procedures, patient testimonials, and medical insights.
          </p>
        </div>

        {/* Video Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {videos.map((video) => (
            <div
              key={video.id}
              className="rounded-lg border overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              style={{
                backgroundColor: currentTheme.surface,
                borderColor: currentTheme.border
              }}
            >
              <div className="relative aspect-video">
                {/* Thumbnail with play button overlay */}
                <img 
                  src={video.thumbnail || getYouTubeThumbnail(video.youtubeLink)} 
                  alt={video.title} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = getYouTubeThumbnail(video.youtubeLink);
                  }}
                />
                <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <a 
                    href={video.youtubeLink} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="p-3 bg-white rounded-full shadow-md"
                  >
                    <Play fill="currentColor" size={24} />
                  </a>
                </div>
                {video.duration && (
                  <span className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                    {video.duration}
                  </span>
                )}
              </div>

              <div className="p-4">
                <h3 className="text-xl font-semibold mb-3">{video.title}</h3>
                <a
                  href={video.youtubeLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ backgroundColor: currentTheme.primary }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-white hover:opacity-90 transition-opacity"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                  </svg>
                  Watch on YouTube
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Video;