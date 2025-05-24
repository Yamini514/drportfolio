import React from 'react';
import { useTheme } from '../context/ThemeContext';

function CustomSelect({ 
  label,
  options,
  value,
  onChange,
  name,
  className = ""
}) {
  const { currentTheme } = useTheme();
  
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium mb-1" style={{ color: currentTheme.text.primary }}>
          {label}
        </label>
      )}
      <select
        name={name}
        value={value}
        onChange={onChange}
        className={`w-full px-3 py-2 rounded-lg border focus:outline-none transition-all duration-200 ${className}`}
        style={{
          backgroundColor: currentTheme.surface,
          borderColor: currentTheme.primary,
          color: currentTheme.text.primary,
          '--tw-ring-color': 'transparent'
        }}
      >
        {options.map((option, index) => (
          <option 
            key={index} 
            value={option.value}
            style={{
              backgroundColor: currentTheme.surface,
              color: currentTheme.text.primary
            }}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default CustomSelect;