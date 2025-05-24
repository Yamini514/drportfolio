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
  max
}) {
  const { currentTheme } = useTheme();
  
  const inputStyles = {
    backgroundColor: currentTheme.surface,
    borderColor: currentTheme.primary,
    color: currentTheme.text.primary,
    '--tw-ring-color': 'transparent'
  };

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium mb-1" style={{ color: currentTheme.text.primary }}>
          {label}
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
    </div>
  );
}

export default CustomInput;