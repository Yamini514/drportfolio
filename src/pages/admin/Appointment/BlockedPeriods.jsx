import React, { useState, useEffect } from 'react';
import { collection, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useTheme } from '../../../context/ThemeContext';
import CustomButton from '../../../components/CustomButton';
import CustomInput from '../../../components/CustomInput';
import CustomSelect from '../../../components/CustomSelect';
import CustomDeleteConfirmation from '../../../components/CustomDeleteConfirmation';
import { Calendar, AlertTriangle, Trash2 } from 'lucide-react';

const BlockedPeriods = () => {
  const { currentTheme } = useTheme();
  const [blockedPeriods, setBlockedPeriods] = useState([]);
  const [newBlock, setNewBlock] = useState({
    type: 'day',
    startDate: '',
    endDate: '',
    reason: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    show: false,
    periodId: null
  });

  // Copy the following functions from TimingSchedular.jsx:
  // - getTodayString
  // - formatDate
  // - showNotification
  // - loadData (modify to only load blocked periods)
  // - handleNewBlockChange
  // - addBlockedPeriod
  // - removeBlockedPeriod
  // - confirmRemoveBlockedPeriod

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(() => {
        setNotification({ ...notification, show: false });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4" style={{ color: currentTheme.text }}>Blocked Periods</h2>
      
      {/* Add New Block Form */}
      <div className="mb-6 p-4 border rounded-lg" style={{ backgroundColor: currentTheme.secondary }}>
        <h3 className="text-lg font-semibold mb-3" style={{ color: currentTheme.text }}>Add New Blocked Period</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CustomSelect
            label="Block Type"
            value={newBlock.type}
            onChange={(value) => handleNewBlockChange('type', value)}
            options={[
              { value: 'day', label: 'Single Day' },
              { value: 'period', label: 'Extended Period' }
            ]}
          />
          <CustomInput
            type="date"
            label="Start Date"
            value={newBlock.startDate}
            onChange={(e) => handleNewBlockChange('startDate', e.target.value)}
            min={getTodayString()}
          />
          {newBlock.type === 'period' && (
            <CustomInput
              type="date"
              label="End Date"
              value={newBlock.endDate}
              onChange={(e) => handleNewBlockChange('endDate', e.target.value)}
              min={newBlock.startDate || getTodayString()}
            />
          )}
          <CustomInput
            type="text"
            label="Reason"
            value={newBlock.reason}
            onChange={(e) => handleNewBlockChange('reason', e.target.value)}
            placeholder="Enter reason for blocking"
          />
        </div>
        <div className="mt-4">
          <CustomButton onClick={addBlockedPeriod} disabled={loading}>Add Blocked Period</CustomButton>
        </div>
      </div>

      {/* Blocked Periods List */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-3" style={{ color: currentTheme.text }}>Current Blocked Periods</h3>
        <div className="grid gap-4">
          {blockedPeriods.map((period) => (
            <div
              key={period.id}
              className="p-4 rounded-lg flex justify-between items-center"
              style={{ backgroundColor: currentTheme.secondary }}
            >
              <div>
                <p className="font-semibold" style={{ color: currentTheme.text }}>
                  {period.type === 'day' ? formatDate(period.startDate) : 
                    `${formatDate(period.startDate)} - ${formatDate(period.endDate)}`}
                </p>
                <p className="text-sm mt-1" style={{ color: currentTheme.textSecondary }}>{period.reason}</p>
              </div>
              <button
                onClick={() => removeBlockedPeriod(period.id)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmation.show && (
        <CustomDeleteConfirmation
          message="Are you sure you want to remove this blocked period?"
          onConfirm={confirmRemoveBlockedPeriod}
          onCancel={() => setDeleteConfirmation({ show: false, periodId: null })}
        />
      )}

      {/* Notification */}
      {notification.show && (
        <div
          className={`fixed bottom-4 right-4 p-4 rounded-lg ${notification.type === 'error' ? 'bg-red-500' : 'bg-green-500'} text-white`}
        >
          {notification.message}
        </div>
      )}
    </div>
  );
};

export default BlockedPeriods;