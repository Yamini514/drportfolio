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
    <div className={`${className}`}>
      {label && (
        <label
          className="block text-sm font-medium mb-2"
          style={{ color: currentTheme.text.primary }}
        >
          {label}
        </label>
      )}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <SearchIcon size={16} style={{ color: currentTheme.text.secondary }} />
        </div>
        <input
          type="text"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent transition-colors"
          style={{
            backgroundColor: currentTheme.surface,
            borderColor: currentTheme.border,
            color: currentTheme.text.primary,
            '--tw-ring-color': currentTheme.primary,
          }}
        />
      </div>
    </div>
  );
}

export default CustomSearch;