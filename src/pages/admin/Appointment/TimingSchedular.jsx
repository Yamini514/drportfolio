import React, { useState, useEffect } from 'react';
import { collection, doc, setDoc, getDoc, addDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useTheme } from '../../../context/ThemeContext';
import CustomButton from '../../../components/CustomButton';
import CustomInput from '../../../components/CustomInput';
import CustomSelect from '../../../components/CustomSelect';
import CustomDeleteConfirmation from '../../../components/CustomDeleteConfirmation';
import { Calendar, Clock, AlertTriangle, CheckCircle, Plus, Trash2 } from 'lucide-react';

const TimingSchedular = () => {
  const { currentTheme } = useTheme();
  const [schedule, setSchedule] = useState({
    locations: []
  });
  const [newLocation, setNewLocation] = useState({
    name: '',
    startTime: '09:00',
    endTime: '17:00',
    days: {
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false
    }
  });
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [blockedPeriods, setBlockedPeriods] = useState([]);
  const [newBlock, setNewBlock] = useState({
    type: 'day',
    startDate: '',
    endDate: '',
    reason: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedTab, setSelectedTab] = useState('schedule');
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    show: false,
    periodId: null,
    locationIndex: null
  });

  const getTodayString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

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

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
  };

  const loadData = async () => {
    try {
      const scheduleDoc = await getDoc(doc(db, 'settings', 'schedule'));
      if (scheduleDoc.exists()) {
        setSchedule(scheduleDoc.data());
      }

      const blockedPeriodsDoc = await getDoc(doc(db, 'settings', 'blockedPeriods'));
      if (blockedPeriodsDoc.exists()) {
        setBlockedPeriods(blockedPeriodsDoc.data().periods || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load schedule data');
    }
  };

  const handleAddLocation = () => {
    if (!newLocation.name || !Object.values(newLocation.days).some(day => day)) {
      setError('Please provide location name and select at least one day');
      return;
    }
    
    setSchedule(prev => ({
      ...prev,
      locations: [...(prev.locations || []), { ...newLocation }]
    }));
    
    setNewLocation({
      name: '',
      startTime: '09:00',
      endTime: '17:00',
      days: {
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false
      }
    });
    showNotification('Location added successfully');
  };

  const handleLocationChange = (field, value) => {
    setNewLocation(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDayToggle = (day) => {
    if (day === 'sunday') {
      setNewLocation(prev => ({
        ...prev,
        days: { ...prev.days, sunday: false }
      }));
      showNotification('Sunday is set as unavailable by default', 'error');
      return;
    }
    
    setNewLocation(prev => ({
      ...prev,
      days: { ...prev.days, [day]: !prev.days[day] }
    }));
  };

  const handleRemoveLocation = (index) => {
    setDeleteConfirmation({
      show: true,
      periodId: null,
      locationIndex: index
    });
  };

  const confirmRemoveLocation = () => {
    const { locationIndex } = deleteConfirmation;
    setSchedule(prev => ({
      ...prev,
      locations: prev.locations.filter((_, i) => i !== locationIndex)
    }));
    setDeleteConfirmation({ show: false, periodId: null, locationIndex: null });
    showNotification('Location removed successfully');
  };

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNewBlockChange = (field, value) => {
    setNewBlock(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addBlockedPeriod = () => {
    if (!newBlock.startDate || (newBlock.type !== 'day' && !newBlock.endDate) || !newBlock.reason) {
      setError('Please fill all required fields');
      return;
    }
    
    const startDate = new Date(newBlock.startDate);
    const today = new Date(getTodayString());
    if (startDate < today) {
      setError('Cannot block past dates');
      return;
    }

    if (newBlock.type !== 'day') {
      const endDate = new Date(newBlock.endDate);
      if (endDate < startDate) {
        setError('End date must be after start date');
        return;
      }
    }

    const newPeriod = {
      id: Date.now().toString(),
      ...newBlock,
      createdAt: new Date().toISOString()
    };
    
    setBlockedPeriods(prev => [...prev, newPeriod]);
    setNewBlock({
      type: 'day',
      startDate: '',
      endDate: '',
      reason: ''
    });
    setError('');
    showNotification('Blocked period added successfully');
  };

  const removeBlockedPeriod = (id) => {
    setDeleteConfirmation({
      show: true,
      periodId: id,
      locationIndex: null
    });
  };

  const confirmRemoveBlockedPeriod = () => {
    const { periodId } = deleteConfirmation;
    setBlockedPeriods(prev => prev.filter(period => period.id !== periodId));
    setDeleteConfirmation({ show: false, periodId: null, locationIndex: null });
    showNotification('Blocked period removed');
  };

  const createTimeSlots = (location) => {
    const slots = [];
    const [startHour] = location.startTime.split(':');
    const [endHour] = location.endTime.split(':');
    
    for (let hour = parseInt(startHour); hour < parseInt(endHour); hour++) {
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const period = hour >= 12 ? 'PM' : 'AM';
      slots.push(`${displayHour}:00 ${period}`);
      slots.push(`${displayHour}:30 ${period}`);
    }
    
    return slots;
  };

  const generateScheduleDocuments = async () => {
    try {
      if (!dateRange.startDate || !dateRange.endDate) {
        setError('Please select a date range for schedule generation');
        return false;
      }

      setLoading(true);
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      
      if (startDate > endDate) {
        setError('Start date must be before end date');
        setLoading(false);
        return false;
      }

      const dataDocRef = doc(db, 'appointments', 'data');
      const dataDoc = await getDoc(dataDocRef);
      if (!dataDoc.exists()) {
        await setDoc(dataDocRef, { 
          created: new Date(),
          description: 'Container for appointment data'
        });
      }

      const scheduleRef = collection(db, 'appointments/data/schedule');
      
      for (let currentDate = new Date(startDate); currentDate <= endDate; currentDate.setDate(currentDate.getDate() + 1)) {
        const dateString = currentDate.toISOString().split('T')[0];
        const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        
        if (dayName === 'sunday') {
          continue;
        }
        
        for (const location of schedule.locations || []) {
          if (location.days[dayName]) {
            const timeSlots = createTimeSlots(location);
            
            const isBlocked = blockedPeriods.some(period => {
              const blockStart = new Date(period.startDate);
              if (period.type === 'day') {
                return blockStart.toDateString() === currentDate.toDateString();
              }
              const blockEnd = new Date(period.endDate);
              return currentDate >= blockStart && currentDate <= blockEnd;
            });
            
            if (!isBlocked && timeSlots.length > 0) {
              await addDoc(scheduleRef, {
                date: dateString,
                dayName: dayName,
                location: location.name,
                timeSlots: timeSlots,
                isOpen: true,
                createdAt: new Date()
              });
            }
          }
        }
      }
      
      showNotification('Schedule documents generated successfully');
      return true;
    } catch (error) {
      console.error('Error generating schedule documents:', error);
      setError('Failed to generate schedule documents: ' + error.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      const updatedSchedule = {
        ...schedule,
        locations: schedule.locations.map(location => ({
          ...location,
          days: { ...location.days, sunday: false }
        }))
      };
      
      await setDoc(doc(db, 'settings', 'schedule'), updatedSchedule);
      
      await setDoc(doc(db, 'settings', 'blockedPeriods'), { 
        periods: blockedPeriods,
        updatedAt: new Date().toISOString()
      });
      
      const success = await generateScheduleDocuments();
      
      if (success) {
        showNotification('Schedule and availability settings saved successfully');
      }
    } catch (error) {
      console.error('Error saving data:', error);
      setError('Failed to save changes: ' + error.message);
      showNotification('Failed to save changes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const isBlockActive = (period) => {
    const now = new Date();
    const startDate = new Date(period.startDate);
    
    if (period.type === 'day') {
      return startDate.toDateString() === now.toDateString();
    }
    
    const endDate = new Date(period.endDate);
    return now >= startDate && now <= endDate;
  };

  const activeBlocksCount = blockedPeriods.filter(isBlockActive).length;

  const formatBlockType = (type) => {
    if (type === 'day') {
      return 'Single Day';
    }
    return 'Extended Period';
  };

  return (
    <div className="p-0 relative">
      {notification.show && (
        <div 
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center transition-opacity duration-300 ${notification.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}
        >
          {notification.type === 'error' ? (
            <AlertTriangle size={20} className="mr-2" />
          ) : (
            <CheckCircle size={20} className="mr-2" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      <CustomDeleteConfirmation
        isOpen={deleteConfirmation.show}
        onClose={() => setDeleteConfirmation({ show: false, periodId: null, locationIndex: null })}
        onConfirm={deleteConfirmation.periodId ? confirmRemoveBlockedPeriod : confirmRemoveLocation}
        title={deleteConfirmation.periodId ? "Delete Blocked Period" : "Remove Location"}
        message={deleteConfirmation.periodId 
          ? "Are you sure you want to remove this blocked period? This action cannot be undone."
          : "Are you sure you want to remove this location? This action cannot be undone."
        }
      />
      
      <h2 
        className="text-2xl font-bold mb-6"
        style={{ color: currentTheme.text.primary }}
      >
        Configure Schedule & Availability
      </h2>
      
      <div className="flex border-b mb-6" style={{ borderColor: currentTheme.border }}>
        <button
          className={`px-4 py-2 mr-2 font-medium rounded-t-lg transition-colors ${selectedTab === 'schedule' ? 'border-b-2' : ''}`}
          style={{ 
            borderColor: selectedTab === 'schedule' ? currentTheme.primary : 'transparent',
            color: selectedTab === 'schedule' ? currentTheme.primary : currentTheme.text.secondary
          }}
          onClick={() => setSelectedTab('schedule')}
        >
          <Calendar size={16} className="inline mr-2" />
          Regular Schedule
        </button>
        <button
          className={`px-4 py-2 mr-2 font-medium rounded-t-lg transition-colors flex items-center ${selectedTab === 'blocks' ? 'border-b-2' : ''}`}
          style={{ 
            borderColor: selectedTab === 'blocks' ? currentTheme.primary : 'transparent',
            color: selectedTab === 'blocks' ? currentTheme.primary : currentTheme.text.secondary
          }}
          onClick={() => setSelectedTab('blocks')}
        >
          <AlertTriangle size={16} className="mr-2" />
          Blocked Periods 
          {activeBlocksCount > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
              {activeBlocksCount}
            </span>
          )}
        </button>
      </div>

      {selectedTab === 'schedule' && (
        <div>
          <div 
            className="mb-6 p-4 border rounded-lg" 
            style={{ 
              borderColor: currentTheme.border,
              backgroundColor: currentTheme.surface
            }}
          >
            <h3 
              className="text-xl mb-4 flex items-center"
              style={{ color: currentTheme.text.primary }}
            >
              <Calendar size={20} className="mr-2" />
              Schedule Date Range
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CustomInput
                label="Start Date"
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                min={getTodayString()}
                required
              />
              <CustomInput
                label="End Date"
                type="date"
                value={dateRange.endDate}
                onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                min={dateRange.startDate || getTodayString()}
                required
              />
            </div>
            <div 
              className="text-sm mt-3 p-3 rounded-lg"
              style={{ 
                color: currentTheme.text.secondary,
                backgroundColor: currentTheme.primary + '10'
              }}
            >
              <Clock size={14} className="inline mr-2" />
              Choose a date range to generate appointment slots. This will create available slots for the selected period based on your weekly schedule below.
            </div>
          </div>

          <div className="mb-6">
            <h3 
              className="text-xl mb-4 flex items-center"
              style={{ color: currentTheme.text.primary }}
            >
              <Calendar size={20} className="mr-2" />
              Weekly Schedule
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" style={{ borderColor: currentTheme.border }}>
                <thead>
                  <tr style={{ backgroundColor: currentTheme.primary + '10' }}>
                    <th className="p-3 text-left" style={{ color: currentTheme.text.primary }}>Location</th>
                    <th className="p-3 text-left" style={{ color: currentTheme.text.primary }}>Timings</th>
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                      <th key={day} className="p-3 text-center" style={{ color: currentTheme.text.primary }}>
                        {day}
                      </th>
                    ))}
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {(schedule.locations || []).map((location, index) => (
                    <tr 
                      key={index} 
                      className="border-b" 
                      style={{ 
                        borderColor: currentTheme.border,
                        backgroundColor: location.days.sunday ? 'rgba(239, 68, 68, 0.05)' : currentTheme.surface
                      }}
                    >
                      <td className="p-3" style={{ color: currentTheme.text.primary }}>{location.name}</td>
                      <td className="p-3" style={{ color: currentTheme.text.primary }}>
                        {location.startTime} - {location.endTime}
                      </td>
                      {Object.keys(location.days).map(day => (
                        <td key={day} className="p-3 text-center">
                          {location.days[day] ? (
                            <CheckCircle size={16} className="mx-auto" style={{ color: currentTheme.primary }} />
                          ) : (
                            day === 'sunday' ? (
                              <AlertTriangle size={16} className="mx-auto" style={{ color: '#ef4444' }} />
                            ) : (
                              <span>-</span>
                            )
                          )}
                        </td>
                      ))}
                      <td className="p-3">
                        <CustomButton
                          variant="danger"
                          onClick={() => handleRemoveLocation(index)}
                          icon={Trash2}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div 
              className="mt-6 p-4 border rounded-lg"
              style={{ 
                borderColor: currentTheme.border,
                backgroundColor: currentTheme.surface
              }}
            >
              <h4 
                className="text-lg mb-4 flex items-center"
                style={{ color: currentTheme.text.primary }}
              >
                <Plus size={18} className="mr-2" />
                Add New Location
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <CustomInput
                  label="Location Name"
                  value={newLocation.name}
                  onChange={(e) => handleLocationChange('name', e.target.value)}
                  placeholder="Enter location name"
                  required
                />
                <CustomInput
                  label="Start Time"
                  type="time"
                  value={newLocation.startTime}
                  onChange={(e) => handleLocationChange('startTime', e.target.value)}
                />
                <CustomInput
                  label="End Time"
                  type="time"
                  value={newLocation.endTime}
                  onChange={(e) => handleLocationChange('endTime', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-7 gap-2 mb-4">
                {Object.keys(newLocation.days).map(day => (
                  <div key={day} className="flex items-center">
                    <input
                      type="checkbox"
                      id={day}
                      checked={newLocation.days[day]}
                      onChange={() => handleDayToggle(day)}
                      disabled={day === 'sunday'}
                      className="mr-2"
                    />
                    <label 
                      htmlFor={day}
                      style={{ 
                        color: day === 'sunday' ? '#ef4444' : currentTheme.text.primary 
                      }}
                    >
                      {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                    </label>
                  </div>
                ))}
              </div>
              <CustomButton
                onClick={handleAddLocation}
                icon={Plus}
              >
                Add Location
              </CustomButton>
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'blocks' && (
        <div>
          <div 
            className="mb-6 p-4 border rounded-lg" 
            style={{ 
              borderColor: currentTheme.border,
              backgroundColor: currentTheme.surface
            }}
          >
            <h3 
              className="text-xl mb-4 flex items-center"
              style={{ color: currentTheme.text.primary }}
            >
              <Plus size={20} className="mr-2" />
              Add Blocked Period
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <CustomSelect
                label="Block Type"
                value={newBlock.type}
                onChange={(e) => handleNewBlockChange('type', e.target.value)}
                options={[
                  { value: 'day', label: 'Single Day' },
                  { value: 'period', label: 'Extended Period' }
                ]}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <CustomInput
                label="Start Date"
                type="date"
                value={newBlock.startDate}
                onChange={(e) => handleNewBlockChange('startDate', e.target.value)}
                min={getTodayString()}
                required
              />
              
              {newBlock.type !== 'day' && (
                <CustomInput
                  label="End Date"
                  type="date"
                  value={newBlock.endDate}
                  onChange={(e) => handleNewBlockChange('endDate', e.target.value)}
                  min={newBlock.startDate || getTodayString()}
                  required
                />
              )}
            </div>
            
            <CustomInput
              label="Reason / Message to Display"
              value={newBlock.reason}
              onChange={(e) => handleNewBlockChange('reason', e.target.value)}
              placeholder="Enter reason for blocking this period"
              required
            />
            
            <div className="mt-4">
              <CustomButton
                onClick={addBlockedPeriod}
                icon={Calendar}
              >
                Add Blocked Period
              </CustomButton>
            </div>
          </div>
          
          <div className="mb-6">
            <h3 
              className="text-xl mb-4 flex items-center"
              style={{ color: currentTheme.text.primary }}
            >
              <AlertTriangle size={20} className="mr-2" />
              Current Blocked Periods
            </h3>
            
            {blockedPeriods.length === 0 ? (
              <div 
                className="text-center py-8 border rounded-lg"
                style={{ 
                  borderColor: currentTheme.border,
                  color: currentTheme.text.secondary,
                  backgroundColor: currentTheme.surface
                }}
              >
                <Calendar size={32} className="mx-auto mb-2 opacity-50" />
                No blocked periods configured
              </div>
            ) : (
              <div className="space-y-4">
                {blockedPeriods.map((period) => (
                  <div 
                    key={period.id} 
                    className="p-4 border rounded-lg flex flex-col md:flex-row md:items-center md:justify-between transition-all duration-200"
                    style={{ 
                      borderColor: isBlockActive(period) ? '#ef4444' : currentTheme.border,
                      backgroundColor: isBlockActive(period) 
                        ? 'rgba(239, 68, 68, 0.1)' 
                        : currentTheme.surface
                    }}
                  >
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <strong 
                          className="mr-2"
                          style={{ color: currentTheme.text.primary }}
                        >
                          {formatBlockType(period.type)}
                        </strong>
                        {isBlockActive(period) && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <AlertTriangle size={12} className="mr-1" />
                            Active Now
                          </span>
                        )}
                      </div>
                      
                      <div 
                        className="text-sm mb-2"
                        style={{ color: currentTheme.text.secondary }}
                      >
                        <Clock size={14} className="inline mr-1" />
                        {period.type === 'day' ? (
                          <span>Date: {formatDate(period.startDate)}</span>
                        ) : (
                          <span>From {formatDate(period.startDate)} to {formatDate(period.endDate)}</span>
                        )}
                      </div>
                      
                      <div className="text-sm">
                        <span style={{ color: currentTheme.text.secondary }}>Message: </span>
                        <span style={{ color: currentTheme.text.primary }}>{period.reason}</span>
                      </div>
                    </div>
                    
                    <div className="mt-3 md:mt-0 md:ml-4">
                      <CustomButton
                        variant="danger"
                        onClick={() => removeBlockedPeriod(period.id)}
                        icon={Trash2}
                      >
                        Remove
                      </CustomButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div 
          className="border px-4 py-3 rounded-lg mb-4 flex items-center"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderColor: '#ef4444',
            color: '#dc2626'
          }}
        >
          <AlertTriangle size={16} className="mr-2 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 pt-4 border-t" style={{ borderColor: currentTheme.border }}>
        <CustomButton
          onClick={handleSave}
          disabled={loading}
          icon={loading ? Clock : CheckCircle}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </CustomButton>

        <div 
          className="text-sm p-3 rounded-lg flex-1"
          style={{ 
            color: currentTheme.text.secondary,
            backgroundColor: currentTheme.primary + '10'
          }}
        >
          <CheckCircle size={14} className="inline mr-2" />
          This will save your schedule and generate available slots from {formatDate(dateRange.startDate)} to {formatDate(dateRange.endDate)}.
        </div>
      </div>
    </div>
  );
};

export default TimingSchedular;