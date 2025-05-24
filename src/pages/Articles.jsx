import React from "react";
import { useTheme } from '../context/ThemeContext';

function Articles() {
  const { currentTheme } = useTheme();

  return (
    <div className="min-h-screen px-5 pb-10 md:px-15 lg:px-20 pt-5 md:pt-5" style={{ backgroundColor: currentTheme.background }}>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-8" style={{ color: currentTheme.primary }}>Articles</h1>
        
        <div className="border rounded-lg shadow-lg overflow-hidden"
             style={{ backgroundColor: currentTheme.surface, borderColor: currentTheme.border }}>
          <iframe 
            src="/article.pdf"
            className="w-full h-[80vh]"
            frameBorder="0"
            title="Article PDF Viewer"
          ></iframe>
        </div>
      </div>
    </div>
  );
}

export default Articles;