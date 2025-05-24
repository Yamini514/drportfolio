import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { 
  FaBars, 
  FaSun, 
  FaMoon
} from 'react-icons/fa';

function Header({ onMenuClick }) {
  const navigate = useNavigate();
  const { currentTheme, toggleTheme } = useTheme();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <header 
      className="h-16 flex items-center justify-between px-4 sm:px-6 fixed top-0 left-0 z-50 w-full transition-all duration-300 shadow-md"
      style={{ 
        backgroundColor: currentTheme.surface,
        borderBottom: `1px solid ${currentTheme.border}`
      }}
    >
      <div className="flex items-center gap-4">
        <button 
          className="lg:hidden p-2 rounded-md transition-colors hover:bg-opacity-10 hover:bg-primary"
          onClick={onMenuClick}
          style={{ 
            color: currentTheme.text.primary,
            backgroundColor: currentTheme.surface
          }}
          aria-label="Toggle menu"
        >
          <FaBars className="h-6 w-6" />
        </button>

        <div className="flex items-center">
          <span className="text-2xl font-bold" style={{ color: currentTheme.text.primary }}>
            Admin
          </span>
          <span className="text-2xl font-bold" style={{ color: currentTheme.primary }}>
            Panel
          </span>
        </div>
      </div>
      
      <div className="flex items-center space-x-2 md:space-x-4">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full transition-all duration-200 ease-in-out hover:bg-opacity-10 hover:bg-primary"
          style={{
            backgroundColor: currentTheme.surface,
            color: currentTheme.primary,
            border: `1px solid ${currentTheme.border}`
          }}
        >
          {currentTheme.type === 'dark' ? 
            <FaMoon size={18} /> : 
            <FaSun size={18} />
          }
        </button>
      </div>
    </header>
  );
}

export default Header;