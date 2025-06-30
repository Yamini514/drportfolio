import React from 'react';
import { useTheme } from '../context/ThemeContext';

function CustomInput({ 
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  name,
  className = "",
  rows = 4,
  min,
  max,
  error,
  readOnly // Add readOnly to the props
}) {
  const { currentTheme } = useTheme();
  
  const inputStyles = {
    backgroundColor: currentTheme.surface,
    borderColor: error ? 'rgb(239, 68, 68)' : currentTheme.primary,
    color: currentTheme.text.primary,
    '--tw-ring-color': 'transparent'
  };

  // Generate unique IDs for accessibility
  const inputId = `input-${name}`;
  const errorId = error ? `error-${name}` : undefined;

  return (
    <div>
      {label && (
        <label 
          htmlFor={inputId} 
          className="block text-sm font-medium mb-1" 
          style={{ color: currentTheme.text.primary }}
        >
          {label}
        </label>
      )}
      {type === "textarea" ? (
        <textarea
          id={inputId}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          rows={rows}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${className}`}
          style={inputStyles}
          aria-describedby={errorId}
          readOnly={readOnly} // Pass readOnly prop
        />
      ) : (
        <input
          id={inputId}
          type={type}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          min={min}
          max={max}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${className}`}
          style={inputStyles}
          aria-describedby={errorId}
          readOnly={readOnly} // Pass readOnly prop
        />
      )}
      {error && (
        <p 
          id={errorId}
          className="text-red-500 text-xs mt-1" 
          style={{ color: 'rgb(239, 68, 68)' }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

export default CustomInput;