import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { ExternalLink } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

function Publications() {
  const { currentTheme } = useTheme();
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPublications = async () => {
      try {
        const publicationsCollection = collection(db, 'publications');
        const publicationsSnapshot = await getDocs(publicationsCollection);
        const publicationsList = publicationsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPublications(publicationsList);
      } catch (error) {
        console.error("Error fetching publications:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPublications();
  }, []);

  if (loading) {
    return (
      <div className="px-5 pt-20 pb-10 md:px-15 md:pt-10 lg:px-20 lg:pt-20 flex items-center justify-center" 
        style={{ backgroundColor: currentTheme.background }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 mx-auto mb-4" 
            style={{ borderColor: currentTheme.primary }}></div>
          <p style={{ color: currentTheme.text.primary }}>Loading publications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pt-5 pb-10 md:px-15 md:pt-5 lg:px-20" style={{ backgroundColor: currentTheme.background }}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-8 text-center" style={{ color: currentTheme.primary }}>Publications</h1>
        
        <div className="space-y-4">
          {publications.map((publication) => (
            <div 
              key={publication.id}
              className="p-4 rounded-lg transition-all hover:shadow-lg border"
              style={{ 
                backgroundColor: currentTheme.surface,
                borderColor: currentTheme.border,
                color: currentTheme.text
              }}
            >
              <a 
                href={publication.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 group hover:opacity-80 transition-opacity"
                style={{ color: currentTheme.text }}
              >
                <div className="flex-grow">
                  <p className="text-base md:text-lg">
                    {publication.title}
                  </p>
                </div>
                <ExternalLink 
                  size={20} 
                  className="flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: currentTheme.primary }}
                />
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Publications;