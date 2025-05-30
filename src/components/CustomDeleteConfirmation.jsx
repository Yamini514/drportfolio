import React from 'react';
import { useTheme } from '../context/ThemeContext';
import CustomButton from './CustomButton';

function CustomDeleteConfirmation({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirm Delete",
  message = "Are you sure you want to delete this item? This action cannot be undone."
}) {
  const { currentTheme } = useTheme();

  if (!isOpen) return null;

  // Update the component's style to use theme colors
  const confirmationStyle = {
    backgroundColor: currentTheme === 'dark' ? '#1a1a1a' : '#ffffff',
    color: currentTheme === 'dark' ? '#ffffff' : '#000000',
    border: `1px solid ${currentTheme === 'dark' ? '#333333' : '#e0e0e0'}`,
  };
  
  const buttonStyle = {
    backgroundColor: currentTheme === 'dark' ? '#333333' : '#f5f5f5',
    color: currentTheme === 'dark' ? '#ffffff' : '#000000',
    borderColor: currentTheme === 'dark' ? '#444444' : '#e0e0e0',
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-75"
        onClick={onClose}
      ></div>
      
      {/* Modal */}
      <div 
        className="relative z-[10000] bg-white rounded-lg shadow-xl p-6 m-4 max-w-sm w-full"
        style={{ backgroundColor: currentTheme.surface }}
      >
        <h3 
          className="text-lg font-semibold mb-2"
          style={{ color: currentTheme.text.primary }}
        >
          {title}
        </h3>
        <p 
          className="mb-6"
          style={{ color: currentTheme.text.secondary }}
        >
          {message}
        </p>
        
        <div className="flex justify-end space-x-2">
          <CustomButton
            variant="secondary"
            onClick={onClose}
          >
            Cancel
          </CustomButton>
          <CustomButton
            variant="danger"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            Delete
          </CustomButton>
        </div>
      </div>
    </div>
  );
}

export default CustomDeleteConfirmation;