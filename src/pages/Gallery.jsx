import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import a1 from '../assets/a1.webp';
import a2 from '../assets/a2.jpg';
import a3 from '../assets/a3.jpg';
import s1 from '../assets/s1.jpg';
import s2 from '../assets/s2.jpeg';
import s3 from '../assets/s3.jpg';
import s4 from '../assets/s4.jpg';
import s5 from '../assets/s5.jpeg';

function Gallery() {
  const { currentTheme } = useTheme();

  // Define default albums and images first
  const defaultAlbums = {
    Achievements: {
      title: 'Achievements',
      description: 'Our achievements and milestones'
    },
    Clients: {
      title: 'Clients',
      description: 'Our satisfied clients and testimonials'
    }
  };

  const defaultImages = [
    { 
      id: 1, 
      title: 'Achievements', 
      src: a1, 
      category: 'Achievements',
      date: '2025-03-15',
    },
    { 
      id: 2, 
      title: 'Achievements', 
      src: a2, 
      category: 'Achievements',
      date: '2025-03-12',
    },
    { 
      id: 3, 
      title: 'Achievements', 
      src: a3, 
      category: 'Achievements',
      date: '2025-03-10',
    },
    { 
      id: 5, 
      title: 'Achievements', 
      src: s1, 
      category: 'Achievements',
      date: '2025-02-20',
    },
    { 
      id: 6, 
      title: 'Achievements', 
      src: s2, 
      category: 'Achievements',
      date: '2025-02-15',
    },
    {
      id: 8,
      title: 'Clients',
      src: s3,
      category: 'Clients',
      date: '2025-02-10',
    },
    {
      id: 9,
      title: 'Clients',
      src: s4,
      category: 'Clients',
      date: '2025-02-05',
    },
    {
      id: 10,
      title: 'Clients',
      src: s5,
      category: 'Clients',
      date: '2025-02-05',
    }
  ];

  // Use default values directly without localStorage
  const [activeAlbum, setActiveAlbum] = useState('Achievements');
  const [albums] = useState(defaultAlbums);
  const [images] = useState(defaultImages);
  const [loading, setLoading] = useState(false);

  // Filter images based on active album
  const albumImages = images.filter(image => image.category === activeAlbum);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: currentTheme.background }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 mx-auto mb-4" style={{ borderColor: currentTheme.primary }}></div>
          <p style={{ color: currentTheme.text.primary }}>Loading gallery...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="px-5 pb-10 md:px-12 md:pb-12 lg:px-16" 
      style={{ backgroundColor: currentTheme.background }}
    >
      <div className="container mx-auto max-w-7xl">
        {/* Header Section */}
        <div className="text-center mb-12 pt-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: currentTheme.text.primary }}>
            Our Gallery
          </h1>
          <p className="text-lg" style={{ color: currentTheme.text.secondary }}>
            Explore our collection of images showcasing our facilities, team, and more.
          </p>
        </div>

        {/* Album Tabs - Fixed styling and spacing issues */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex space-x-4 p-1 rounded-lg bg-opacity-10" style={{ backgroundColor: currentTheme.surface }}>
            {Object.keys(albums).map((albumKey) => (
              <button
                key={albumKey}
                onClick={() => setActiveAlbum(albumKey)}
                className={`px-6 py-3 rounded-md font-medium transition-colors duration-200 focus:outline-none`}
                style={{
                  backgroundColor: activeAlbum === albumKey ? currentTheme.primary : 'transparent',
                  color: activeAlbum === albumKey ? 'white' : currentTheme.text.primary,
                  border: `2px solid ${activeAlbum === albumKey ? currentTheme.primary : currentTheme.border}`,
                  position: 'relative',
                  zIndex: activeAlbum === albumKey ? 10 : 1,
                }}
                aria-current={activeAlbum === albumKey ? 'page' : undefined}
              >
                {albums[albumKey].title}
              </button>
            ))}
          </div>
        </div>

        {/* Album Description */}
        {activeAlbum && albums[activeAlbum] && (
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold mb-2" style={{ color: currentTheme.text.primary }}>
              {albums[activeAlbum].title}
            </h2>
            <p style={{ color: currentTheme.text.secondary }}>
              {albums[activeAlbum].description}
            </p>
          </div>
        )}

        {/* Image Grid */}
        {albumImages.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {albumImages.map((image) => (
              <div
                key={image.id}
                className="rounded-lg overflow-hidden shadow-md transition-transform duration-300 hover:scale-105"
                style={{ backgroundColor: currentTheme.surface, borderColor: currentTheme.border }}
              >
                <div className="relative h-64 w-full">
                  <img
                    src={image.src}
                    alt={image.title}
                    className="w-full h-full object-contain p-2"
                  />
                </div>
                <div className="p-4">
                  <p className="text-sm" style={{ color: currentTheme.text.secondary }}>
                    Added on {new Date(image.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-lg" style={{ color: currentTheme.text.secondary }}>
              No images found in this album.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Gallery;