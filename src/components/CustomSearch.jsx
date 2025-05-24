import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Search as SearchIcon } from 'lucide-react';

function CustomSearch({ 
  placeholder = "Search...",
  value,
  onChange,
  className = "",
  label
}) {
  const { currentTheme } = useTheme();
  
  return (
    <div>
      {label && (
        <label 
          className="block text-sm font-medium mb-1" 
          style={{ color: currentTheme.text.primary }}
        >
          {label}
        </label>
      )}
      <div className="relative">
        <SearchIcon 
          size={16} 
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: currentTheme.text.secondary }}
        />
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={`w-full pl-9 pr-3 py-2 rounded-lg border focus:outline-none transition-all duration-200 ${className}`}
          style={{
            backgroundColor: currentTheme.surface,
            borderColor: currentTheme.primary,
            color: currentTheme.text.primary,
            '--tw-ring-color': 'transparent'
          }}
        />
      </div>
    </div>
  );
}

export default CustomSearch;