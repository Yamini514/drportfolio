import React from 'react';
import { useTheme } from '../context/ThemeContext';

function CustomInput({ 
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  required,
  name,
  className = "",
  rows = 4,
  min,
  max,
  error // Add the error prop here
}) {
  const { currentTheme } = useTheme();
  
  const inputStyles = {
    backgroundColor: currentTheme.surface,
    borderColor: error ? 'rgb(239, 68, 68)' : currentTheme.primary, // Highlight border in red if there's an error
    color: currentTheme.text.primary,
    '--tw-ring-color': 'transparent'
  };

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium mb-1" style={{ color: currentTheme.text.primary }}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>} {/* Add asterisk for required fields */}
        </label>
      )}
      {type === "textarea" ? (
        <textarea
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          rows={rows}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${className}`}
          style={inputStyles}
        />
      ) : (
        <input
          type={type}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          min={min}
          max={max}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${className}`}
          style={inputStyles}
        />
      )}
      {/* Render the error message below the input/textarea if it exists */}
      {error && (
        <p className="text-red-500 text-xs mt-1" style={{ color: 'rgb(239, 68, 68)' }}>
          {error}
        </p>
      )}
    </div>
  );
}

export default CustomInput;