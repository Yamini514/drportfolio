import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useTheme } from '../../context/ThemeContext';

function Messages() {
  const [messages, setMessages] = useState([]);
  const { currentTheme } = useTheme();
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [previousLength, setPreviousLength] = useState(0);

  const playNotification = async () => {
    try {
      const audio = new Audio('/notifications.wav');
      audio.volume = 1.0;
      await audio.play();
    } catch (error) {
      console.error('Error playing notification:', error);
    }
  };

  const handleDelete = async (messageId) => {
    try {
      await deleteDoc(doc(db, 'contacts', messageId));
      setShowDeleteConfirm(false);
      setMessageToDelete(null);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const truncateMessage = (message, maxLength = 100) => {
    if (message.length <= maxLength) return message;
    return `${message.substring(0, maxLength)}...`;
  };

  useEffect(() => {
    const q = query(collection(db, 'contacts'), orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const messagesData = [];
      querySnapshot.forEach((doc) => {
        messagesData.push({ id: doc.id, ...doc.data() });
      });
      
      // Play notification sound if there's a new message
      if (messagesData.length > previousLength && previousLength > 0) {
        await playNotification();
      }
      
      setPreviousLength(messagesData.length);
      setMessages(messagesData);
    });

    return () => unsubscribe();
  }, [previousLength]);

  return (
    <div className="p-6" style={{ backgroundColor: currentTheme.background }}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Contact Messages Management</h1>
      </div>
      <div className="grid gap-4">
        {messages.map((message) => (
          <div 
            key={message.id} 
            className="p-4 rounded-lg border"
            style={{ 
              backgroundColor: currentTheme.surface,
              borderColor: currentTheme.border 
            }}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold">{message.fullName}</h3>
              <span style={{ color: currentTheme.text.secondary }}>
                {message.timestamp?.toDate().toLocaleString()}
              </span>
            </div>
            <div className="space-y-2">
              <p style={{ color: currentTheme.text.secondary }}>
                <span className="font-medium" style={{ color: currentTheme.text.primary }}>Email:</span> {message.email}
              </p>
              <p style={{ color: currentTheme.text.secondary }}>
                <span className="font-medium" style={{ color: currentTheme.text.primary }}>Phone:</span> {message.phone}
              </p>
              <p className="mt-3 pt-3 border-t" style={{ borderColor: currentTheme.border }}>
                {truncateMessage(message.message)}
              </p>
              <div className="flex justify-end space-x-2 mt-2">
                <button
                  onClick={() => setSelectedMessage(message)}
                  className="px-3 py-1 rounded text-sm"
                  style={{
                    backgroundColor: currentTheme.surface,
                    color: currentTheme.text.primary,
                    border: `1px solid ${currentTheme.border}`
                  }}
                >
                  View
                </button>
                <button
                  onClick={() => {
                    setMessageToDelete(message.id);
                    setShowDeleteConfirm(true);
                  }}
                  className="px-3 py-1 rounded text-sm"
                  style={{
                    backgroundColor: '#ef4444',
                    color: 'white'
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        {messages.length === 0 && (
          <div 
            className="p-4 rounded-lg border text-center"
            style={{ 
              backgroundColor: currentTheme.surface,
              borderColor: currentTheme.border,
              color: currentTheme.text.secondary
            }}
          >
            No messages yet
          </div>
        )}
      </div>

      {/* View Message Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div 
            className="rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: currentTheme.background }}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-semibold">{selectedMessage.fullName}</h3>
              <button 
                onClick={() => setSelectedMessage(null)}
                className="text-2xl"
                style={{ color: currentTheme.text.secondary }}
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <p style={{ color: currentTheme.text.secondary }}>
                <span className="font-medium" style={{ color: currentTheme.text.primary }}>Email:</span> {selectedMessage.email}
              </p>
              <p style={{ color: currentTheme.text.secondary }}>
                <span className="font-medium" style={{ color: currentTheme.text.primary }}>Phone:</span> {selectedMessage.phone}
              </p>
              <p className="mt-4 pt-4 border-t" style={{ borderColor: currentTheme.border }}>
                {selectedMessage.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div 
            className="rounded-lg p-6 max-w-md w-full"
            style={{ backgroundColor: currentTheme.background }}
          >
            <h3 className="text-xl font-semibold mb-4">Confirm Delete</h3>
            <p style={{ color: currentTheme.text.secondary }}>Are you sure you want to delete this message?</p>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setMessageToDelete(null);
                }}
                className="px-4 py-2 rounded"
                style={{
                  backgroundColor: currentTheme.surface,
                  color: currentTheme.text.primary,
                  border: `1px solid ${currentTheme.border}`
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(messageToDelete)}
                className="px-4 py-2 rounded"
                style={{
                  backgroundColor: '#ef4444',
                  color: 'white'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Messages;