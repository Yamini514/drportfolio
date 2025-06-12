import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useTheme } from '../../context/ThemeContext';
import CustomButton from '../../components/CustomButton';
import { FaEye } from 'react-icons/fa';
import CustomDeleteConfirmation from '../../components/CustomDeleteConfirmation';

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

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, 'contacts', messageToDelete));
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

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateString = date.toLocaleDateString();
    return `${time}, ${dateString}`;
  };

  useEffect(() => {
    const q = query(collection(db, 'contacts'), orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const messagesData = [];
      querySnapshot.forEach((doc) => {
        messagesData.push({ id: doc.id, ...doc.data() });
      });
      
      if (messagesData.length > previousLength && previousLength > 0) {
        await playNotification();
      }
      
      setPreviousLength(messagesData.length);
      setMessages(messagesData);
    });

    return () => unsubscribe();
  }, [previousLength]);

  const MessageView = ({ message }) => (
    <div 
      className="rounded-lg p-6 shadow mx-auto"
      style={{ 
        backgroundColor: '#1A1F36',
        color: '#FFFFFF',
        border: '1px solid #6B46C1',
        width: '50%',
        maxWidth: '600px'
      }}
    >
      <h3 className="text-xl font-bold mb-4" style={{ color: '#FFFFFF' }}>
        Message Details
      </h3>
      <div className="space-y-4">
        <div>
          <span className="font-semibold" style={{ color: '#A0AEC0' }}>Name: </span>
          <span style={{ color: '#FFFFFF' }}>{message.fullName}</span>
        </div>
        <div>
          <span className="font-semibold" style={{ color: '#A0AEC0' }}>Email: </span>
          <span style={{ color: '#FFFFFF' }}>{message.email}</span>
        </div>
        <div>
          <span className="font-semibold" style={{ color: '#A0AEC0' }}>Phone: </span>
          <span style={{ color: '#FFFFFF' }}>{message.phone}</span>
        </div>
        <div>
          <span className="font-semibold" style={{ color: '#A0AEC0' }}>Date: </span>
          <span style={{ color: '#FFFFFF' }}>{formatTimestamp(message.timestamp)}</span>
        </div>
        <div>
          <span className="font-semibold" style={{ color: '#A0AEC0' }}>Message: </span>
          <p className="whitespace-pre-wrap mt-2" style={{ color: '#FFFFFF' }}>{message.message}</p>
        </div>
      </div>
      <div className="flex justify-end space-x-3 mt-6">
        <CustomButton
          variant="secondary"
          onClick={() => setSelectedMessage(null)}
          className="px-4 py-2"
          style={{
            backgroundColor: 'transparent',
            color: '#A0AEC0',
            border: '1px solid #A0AEC0',
            borderRadius: '0.375rem'
          }}
        >
          Back to List
        </CustomButton>
      </div>
    </div>
  );

  return (
    <div className="p-4" style={{ backgroundColor: currentTheme.background.primary, color: currentTheme.text.primary }}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold" style={{ color: currentTheme.text.primary }}>Contact Messages Management</h2>
      </div>

      {selectedMessage ? (
        <MessageView message={selectedMessage} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {messages.map((message) => (
            <div 
              key={message.id} 
              className="p-4 rounded-lg border"
              style={{ 
                backgroundColor: '#1A1F36',
                borderColor: '#6B46C1'
              }}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold" style={{ color: '#FFFFFF' }}>{message.fullName}</h3>
                <span style={{ color: '#A0AEC0' }}>
                  {formatTimestamp(message.timestamp)}
                </span>
              </div>
              <div className="space-y-2">
                <p style={{ color: '#A0AEC0' }}>
                  <span className="font-medium" style={{ color: '#FFFFFF' }}>Email:</span> {message.email}
                </p>
                <p style={{ color: '#A0AEC0' }}>
                  <span className="font-medium" style={{ color: '#FFFFFF' }}>Phone:</span> {message.phone}
                </p>
                <p className="mt-3 pt-3 border-t" style={{ borderColor: '#6B46C1', color: '#FFFFFF' }}>
                  {truncateMessage(message.message)}
                </p>
                <div className="flex justify-end space-x-2 mt-2">
                  <button
                    onClick={() => setSelectedMessage(message)}
                    className="p-1 transition-colors"
                    aria-label="View message"
                    style={{ 
                      color: '#A0AEC0',
                      backgroundColor: 'transparent',
                      border: '1px solid #A0AEC0',
                      borderRadius: '0.375rem',
                      padding: '4px 12px'
                    }}
                    title="View Message"
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
                    title="Delete Message"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {messages.length === 0 && !selectedMessage && (
        <div 
          className="p-4 rounded-lg border text-center"
          style={{ 
            backgroundColor: '#1A1F36',
            borderColor: '#6B46C1',
            color: '#A0AEC0'
          }}
        >
          No messages yet
        </div>
      )}

      <CustomDeleteConfirmation
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setMessageToDelete(null);
        }}
        onConfirm={handleDelete}
        title="Delete Message"
        message="Are you sure you want to delete this message? This action cannot be undone."
      />
    </div>
  );
}

export default Messages;