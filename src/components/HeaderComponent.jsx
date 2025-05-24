import React from 'react';
import { useTheme } from '../context/ThemeContext';

function HeaderComponent({ title, description, className }) {
  const { currentTheme } = useTheme();

  return (
    <div className={`${className || ''}`}>
      {title && (
        <h1 className="text-3xl md:text-4xl font-bold mb-4">{title}</h1>
      )}
      {description && (
        <div className="text-lg space-y-6" style={{ color: currentTheme.text.secondary }}>
          {description.split('\n').map((paragraph, index) => (
            <p key={index} className="text-justify">
              {paragraph.trim()}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export default HeaderComponent;