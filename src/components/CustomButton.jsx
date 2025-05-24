import React from 'react';
import { useTheme } from '../context/ThemeContext';

function CustomButton({ 
  children,
  variant = "primary",
  onClick,
  className = "",
  icon: Icon,
  type = "button"
}) {
  const { currentTheme } = useTheme();
  
  const getStyles = () => {
    switch(variant) {
      case "primary":
        return {
          backgroundColor: currentTheme.primary,
          color: "white"
        };
      case "secondary":
        return {
          backgroundColor: currentTheme.surface,
          color: currentTheme.text.primary,
          border: `1px solid ${currentTheme.border}`
        };
      case "danger":
        return {
          backgroundColor: "#ef4444",
          color: "white"
        };
      default:
        return {
          backgroundColor: currentTheme.primary,
          color: "white"
        };
    }
  };

  return (
    <button
      type={type}
      onClick={onClick}
      className={`px-4 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity ${className}`}
      style={getStyles()}
    >
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
}

export default CustomButton;