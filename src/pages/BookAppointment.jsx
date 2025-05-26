import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { format } from 'date-fns';
import { db } from '../firebase/config';
import { collection, getDocs, addDoc, doc, setDoc, getDoc, query, where, onSnapshot } from 'firebase/firestore';
import { Calendar, Clock, AlertTriangle, CheckCircle } from 'lucide-react';


function BookAppointment() {
  const { currentTheme } = useTheme();
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedDayName, setSelectedDayName] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [bookingMessage, setBookingMessage] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    dob: '',
    clinic: '', // Add this line
    reasonForVisit: '',
    appointmentType: 'Consultation',
    medicalHistory: ''
  });
  const [errors, setErrors] = useState({});
  const [bookedSlots, setBookedSlots] = useState({});
  const [daySchedule, setDaySchedule] = useState(null);
  const [isSunday, setIsSunday] = useState(false);
  const [isDateBlocked, setIsDateBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [timeSlots, setTimeSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  // Add handleInputChange here
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };
  
  
  // Auto-hide notification after 5 seconds
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
  
  // Check if a date is blocked by checking against blocked periods
  const checkIfDateIsBlocked = async (dateStr, dayName) => {
    try {
      const date = new Date(dateStr);
      const blockedPeriodsDoc = await getDoc(doc(db, 'settings', 'blockedPeriods'));
      
      if (blockedPeriodsDoc.exists()) {
        const periods = blockedPeriodsDoc.data().periods || [];
        
        for (const period of periods) {
          if (period.type === 'day' && period.day === dayName.toLowerCase()) {
            const blockDate = new Date(period.startDate);
            if (blockDate.toDateString() === date.toDateString()) {
              return { blocked: true, reason: period.reason };
            }
          } else if (period.type === 'week' || period.type === 'month') {
            const blockStart = new Date(period.startDate);
            const blockEnd = new Date(period.endDate);
            if (date >= blockStart && date <= blockEnd) {
              return { blocked: true, reason: period.reason };
            }
          }
        }
      }
      
      return { blocked: false, reason: '' };
    } catch (error) {
      console.error('Error checking blocked date:', error);
      return { blocked: false, reason: '' };
    }
  };
  
  // Replace generateTimeSlots with fetchTimeSlots
  const fetchTimeSlots = async (date, dayName) => {
    setIsLoading(true);
    try {
      // First check if date is blocked
      const { blocked, reason } = await checkIfDateIsBlocked(date, dayName);
      if (blocked) {
          setIsDateBlocked(true);
          setBlockReason(reason);
          setTimeSlots([]);
          setIsLoading(false);
          return;
      }
  
      // Reset block status
      setIsDateBlocked(false);
      setBlockReason('');
  
      // Fetch schedule for the specific date
      const scheduleRef = collection(db, 'appointments/data/schedule');
      const q = query(scheduleRef, where("date", "==", date));
      const querySnapshot = await getDocs(q);
  
      if (!querySnapshot.empty) {
          // Use the schedule from database
          const scheduleData = querySnapshot.docs[0].data();
          if (scheduleData.timeSlots && scheduleData.timeSlots.length > 0) {
              // Filter out booked slots
              const availableSlots = scheduleData.timeSlots.filter(slot => 
                  !bookedSlots[date]?.includes(slot)
              );
              setTimeSlots(availableSlots);
              setDaySchedule({ isOpen: true });
          } else {
              setTimeSlots([]);
              setBookingMessage('No available slots for this date.');
          }
      } else {
          // If no specific schedule found, check the general day schedule
          const dayScheduleRef = doc(db, 'settings/schedule');
          const scheduleDoc = await getDoc(dayScheduleRef);
          
          if (scheduleDoc.exists()) {
              const scheduleData = scheduleDoc.data();
              const locations = scheduleData.locations || [];
              
              // Find a location that's open on this day
              const availableLocation = locations.find(loc => loc.days[dayName.toLowerCase()]);
              
              if (availableLocation) {
                  const slots = createTimeSlotsFromDaySchedule({
                      startTime: availableLocation.startTime,
                      endTime: availableLocation.endTime,
                      isOpen: true
                  });
                  setTimeSlots(slots);
                  setDaySchedule({ isOpen: true });
              } else {
                  setTimeSlots([]);
                  setBookingMessage('No schedule available for this day.');
                  setDaySchedule(null);
              }
          } else {
              setTimeSlots([]);
              setBookingMessage('No schedule configuration found.');
              setDaySchedule(null);
          }
      }
    } catch (error) {
      console.error('Error fetching time slots:', error);
      setTimeSlots([]);
      setBookingMessage('Error loading schedule. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Create time slots based on day schedule (similar to TimingSchedular component)
  const createTimeSlotsFromDaySchedule = (daySchedule) => {
    if (!daySchedule || !daySchedule.isOpen) {
      return [];
    }
  
    const slots = [];
    const [startHour] = daySchedule.startTime ? daySchedule.startTime.split(':') : ['9'];
    const [endHour] = daySchedule.endTime ? daySchedule.endTime.split(':') : ['17'];
    
    for (let hour = parseInt(startHour); hour < parseInt(endHour); hour++) {
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const period = hour >= 12 ? 'PM' : 'AM';
      slots.push(`${displayHour}:00 ${period}`);
      slots.push(`${displayHour}:30 ${period}`);
    }
    
    return slots;
  };
  
  // Add this JSX where you want to display the time slots
  {timeSlots.length > 0 && (
    <div className="grid grid-cols-3 md:grid-cols-4 gap-4 mt-4">
      {timeSlots.map((slot, index) => (
        <button
          key={index}
          onClick={() => handleSlotSelect(slot)}
          className={`p-3 rounded-lg text-center transition-colors ${selectedSlot === slot
            ? 'bg-blue-500 text-white'
            : bookedSlots[selectedDate]?.includes(slot)
          ? 'bg-red-900 text-gray-400 cursor-not-allowed'
            : 'bg-white hover:bg-blue-50 border border-gray-200'}`}
          disabled={bookedSlots[selectedDate]?.includes(slot)}
        >
          {slot}
        </button>
      ))}
    </div>
  )}

  // Update handleDateChange to use fetchTimeSlots
  const handleDateChange = (e) => {
    const date = e.target.value;
    setSelectedDate(date);
    
    // Reset state variables
    setSelectedSlot('');
    setShowForm(false);
    setBookingMessage('');
    setIsDateBlocked(false);
    setBlockReason('');
    
    if (date) {
      const selectedDateObj = new Date(date);
      const dayName = selectedDateObj.toLocaleDateString('en-US', { weekday: 'long' });
      setSelectedDayName(dayName);
      fetchTimeSlots(date, dayName);
    } else {
      setSelectedDayName('');
      setTimeSlots([]);
    }
  };

  // Load booked slots from Firebase
  // Update the imports at the top of the file
  // import { collection, getDocs, addDoc, doc, setDoc, getDoc, query, where, onSnapshot } from 'firebase/firestore';
  
  // Update the useEffect for fetching booked slots
  useEffect(() => {
  const fetchBookedSlots = async () => {
    try {
      setIsLoading(true);
      const bookingsRef = collection(db, 'appointments/data/bookings');
      const q = query(bookingsRef, where("date", "==", selectedDate));
      
      // Create data document if it doesn't exist
      const dataDocRef = doc(db, 'appointments', 'data');
      const dataDoc = await getDoc(dataDocRef);
      
      if (!dataDoc.exists()) {
        await setDoc(dataDocRef, { 
          created: new Date(),
          description: 'Container for appointment bookings' 
        });
      }

      // Get initial slots
      const querySnapshot = await getDocs(q);
      const slots = {};
      querySnapshot.forEach((doc) => {
        const appointment = doc.data();
        if (!slots[appointment.date]) {
          slots[appointment.date] = [];
        }
        slots[appointment.date].push(appointment.time);
      });
      setBookedSlots(slots);
      setIsLoading(false);

    } catch (error) {
      console.error('Error fetching appointments:', error);
      showNotification('Error loading booked appointments', 'error');
      setIsLoading(false);
    }
  };

  if (selectedDate) {
    fetchBookedSlots();
  }
}, [selectedDate]);
  
  // Update time slot rendering
  {timeSlots.length > 0 && (
    <div className="grid grid-cols-3 md:grid-cols-4 gap-4 mt-4">
      {timeSlots.map((slot, index) => {
        const isBooked = bookedSlots[selectedDate]?.includes(slot);
        return (
          <button
            key={index}
            onClick={() => !isBooked && handleSlotSelect(slot)}
            className={`
              p-3 rounded-lg text-center transition-colors flex items-center justify-center gap-2
              ${selectedSlot === slot
                ? 'bg-blue-500 text-white'
                : isBooked
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white hover:bg-blue-50 border border-gray-200'
              }
            `}
            disabled={isBooked}
          >
            <span>{slot}</span>
            {isBooked ? (
              <AlertTriangle size={16} className="text-gray-400" />
            ) : (
              <CheckCircle size={16} className="text-green-500" />
            )}
          </button>
        );
      })}
    </div>
  )}

  // In the handleSubmit function
  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    
    // Add clinic validation
    if (!formData.clinic) {
      newErrors.clinic = 'Please select a clinic';
    }
    
    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (!/^[a-zA-Z\s\-']+$/.test(formData.name.trim())) {
      newErrors.name = 'Please enter a valid name';
    }
    // Email validation (remove duplicate)
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Phone validation - Indian mobile numbers (starting with 6-9 and total 10 digits)
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required';
    } else if (!/^[6-9]\d{9}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Please enter a valid 10-digit Indian mobile number (starting with 6-9)';
    }
    
    if (!formData.dob.trim()) newErrors.dob = 'Date of Birth is required';
    if (!formData.reasonForVisit.trim()) newErrors.reasonForVisit = 'Reason for visit is required';
    if (!formData.appointmentType) newErrors.appointmentType = 'Appointment type is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
  
    try {
      setIsLoading(true);
      // Verify the slot is still available (double-check)
      const bookingsRef = collection(db, 'appointments/data/bookings');
      const querySnapshot = await getDocs(query(
        bookingsRef, 
        where("date", "==", selectedDate),
        where("time", "==", selectedSlot)
      ));
      
      if (!querySnapshot.empty) {
        setBookingMessage('This slot was just booked by someone else. Please select another time.');
        
        // Update local state to mark slot as booked
        const updatedBookedSlots = { ...bookedSlots };
        if (!updatedBookedSlots[selectedDate]) {
          updatedBookedSlots[selectedDate] = [];
        }
        updatedBookedSlots[selectedDate].push(selectedSlot);
        setBookedSlots(updatedBookedSlots);
        
        setIsLoading(false);
        return;
      }
      
      // Add the appointment
      await addDoc(bookingsRef, {
        date: selectedDate,
        time: selectedSlot,
        weekday: selectedDayName,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        dob: formData.dob,
        reasonForVisit: formData.reasonForVisit,
        appointmentType: formData.appointmentType,
        medicalHistory: formData.medicalHistory,
        createdAt: new Date(),
        status: 'pending'
      });
  
      // Update local state
      const updatedBookedSlots = { ...bookedSlots };
      if (!updatedBookedSlots[selectedDate]) {
        updatedBookedSlots[selectedDate] = [];
      }
      updatedBookedSlots[selectedDate].push(selectedSlot);
      setBookedSlots(updatedBookedSlots);
  
      setShowSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      setTimeout(() => {
        setShowSuccess(false);
        setSelectedDate('');
        setSelectedDayName('');
        setSelectedSlot('');
        setShowForm(false);
        setFormData({ 
          name: '', 
          email: '', 
          phone: '',
          dob: '',
          reasonForVisit: '',
          appointmentType: 'Consultation',
          medicalHistory: ''
        });
      }, 5000);
    } catch (error) {
      console.error('Error saving appointment:', error);
      showNotification('Failed to book appointment. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  

  // Update handleSlotSelect to check Firebase data
  const handleSlotSelect = async (slot) => {
    if (bookedSlots[selectedDate]?.includes(slot)) {
      setBookingMessage('This slot is already booked. Please consider another time.');
      setShowForm(false);
      setSelectedSlot('');
      setTimeout(() => {
        setBookingMessage('');
      }, 5000);
      return;
    }
    
    setBookingMessage('');
    
    if (selectedSlot === slot) {
      setSelectedSlot('');
      setShowForm(false);
    } else {
      setSelectedSlot(slot);
      setShowForm(true);
      // Scroll to form
      setTimeout(() => {
        document.getElementById('appointmentForm')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  // Get the schedule status message
  const getScheduleStatusMessage = () => {
    if (isDateBlocked) {
      return blockReason || "This date is unavailable for bookings. Please select another date.";
    }
    
    if (isSunday) {
      return "The doctor is not available on Sundays. Please select another day.";
    }
    
    if (!daySchedule || !daySchedule.isOpen) {
      return `The doctor is not available on ${selectedDayName}s. Please select another day.`;
    }
    
    if (timeSlots.length === 0) {
      return "No available time slots for this day. Please select another date.";
    }
    
    return null;
  };

  // Format time slot for display
  const formatTimeSlot = (slot) => {
    return slot;
  };

  // Determine if a day is in the past
  const isPastDate = (dateString) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(dateString);
    return date < today;
  };

  // Update the message display in JSX
  return (
    <div className="min-h-screen px-5 md:px-15 lg:px-20 pt-5 md:pt-5 lg:pt-5" style={{ backgroundColor: currentTheme.background }}>
      {/* Toast notification */}
      {notification.show && (
        <div 
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center transition-opacity duration-300 ${
            notification.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
          }`}
        >
          {notification.type === 'error' ? (
            <AlertTriangle size={20} className="mr-2" />
          ) : (
            <CheckCircle size={20} className="mr-2" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-8">Book Appointment</h1>

        {!showSuccess ? (
          <div className="space-y-6">
            {/* Date Selection */}
            <div>
              <label className="block mb-2 font-medium">Select Date</label>
              <div className="relative">
                <input
                  type="date"
                  min={format(new Date(), 'yyyy-MM-dd')}
                  value={selectedDate}
                  onChange={handleDateChange}
                  className="w-full p-3 rounded-md border text-base md:text-lg date-input"
                  style={{ 
                    borderColor: currentTheme.border, 
                    backgroundColor: currentTheme.surface,
                    color: currentTheme.text
                  }}
                  onFocus={(e) => {
                    if (!e.target.value) {
                      e.target.type = 'date';
                    }
                  }}
                  onBlur={(e) => {
                    if (!e.target.value) {
                      e.target.type = 'text';
                    }
                  }}
                  placeholder={!selectedDate ? 'Select a date' : ''}
                  ref={(input) => {
                    if (input) {
                      input.style.colorScheme = currentTheme.type;
                    }
                  }}
                />
                <div 
                  className="absolute right-3 top-3 text-gray-400 cursor-pointer" 
                  onClick={() => {
                    const dateInput = document.getElementById('dateInput');
                    if (dateInput) {
                      dateInput.focus();
                      dateInput.click();
                    }
                  }}
                />
              </div>
            </div>

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: currentTheme.primary }}></div>
              </div>
            )}

            {/* Selected Day Information */}
            {selectedDate && selectedDayName && !isLoading && (
              <div className="p-3 rounded-md" style={{ 
                backgroundColor: currentTheme.surface,
                borderLeft: `4px solid ${
                  isDateBlocked || isSunday ? 'rgb(239, 68, 68)' : 
                  (daySchedule && daySchedule.isOpen) ? currentTheme.primary : 'rgb(239, 68, 68)'
                }` 
              }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Selected Date: {format(new Date(selectedDate), 'MMMM d, yyyy')}</p>
                    <p className="text-sm" style={{ color: currentTheme.text.secondary }}>Day: {selectedDayName}</p>
                  </div>
                  {!isDateBlocked && daySchedule && daySchedule.isOpen && !isSunday && (
                    <div className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                      Available
                    </div>
                  )}
                  {(isDateBlocked || isSunday || !daySchedule || !daySchedule.isOpen) && (
                    <div className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium">
                      Unavailable
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Schedule Status Message */}
            {selectedDate && getScheduleStatusMessage() && !isLoading && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md flex items-start">
                <AlertTriangle size={18} className="mr-2 mt-0.5 flex-shrink-0" />
                <div>{getScheduleStatusMessage()}</div>
              </div>
            )}

            {/* Time Slots */}
            {selectedDate && timeSlots.length > 0 && !isLoading && (
              <div>
                <label className="block mb-2 font-medium">Select Time Slot</label>
                {bookingMessage && (
                  <div className="mb-4 p-2 bg-red-100 text-red-600 border border-red-200 rounded flex items-center">
                    <AlertTriangle size={16} className="mr-2" />
                    {bookingMessage}
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => handleSlotSelect(slot)}
                      className={`p-4 rounded-lg transition-all ${
                        bookedSlots[selectedDate]?.includes(slot)
                          ? 'bg-gray-100 cursor-not-allowed'
                          : slot === selectedSlot
                          ? 'bg-purple-600 text-white'
                          : 'bg-white hover:bg-gray-50'
                      } border border-gray-200 shadow-sm`}
                      disabled={bookedSlots[selectedDate]?.includes(slot)}
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <Clock size={16} />
                        <span>{formatTimeSlot(slot)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Contact Form */}
            {showForm && (
              <form id="appointmentForm" onSubmit={handleSubmit} className="space-y-4 p-5 border rounded-md" style={{ borderColor: currentTheme.border }}>
                <h3 className="text-lg font-medium mb-4">Appointment Details</h3>
                
                <div>
                  <label className="block mb-2 font-medium">Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full p-3 rounded-md border ${errors.name ? 'border-red-500' : ''}`}
                    style={{ borderColor: errors.name ? '#ef4444' : currentTheme.border, backgroundColor: currentTheme.surface }}
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
                </div>

                <div>
                  <label className="block mb-2 font-medium">Email <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full p-3 rounded-md border ${errors.email ? 'border-red-500' : ''}`}
                    style={{ borderColor: errors.email ? '#ef4444' : currentTheme.border, backgroundColor: currentTheme.surface }}
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
                </div>

                <div>
                  <label className="block mb-2 font-medium">Phone <span className="text-red-500">*</span></label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`w-full p-3 rounded-md border ${errors.phone ? 'border-red-500' : ''}`}
                    style={{ borderColor: errors.phone ? '#ef4444' : currentTheme.border, backgroundColor: currentTheme.surface }}
                    placeholder="10-digit phone number"
                  />
                  {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone}</p>}
                </div>

                <div>
                  <label className="block mb-2 font-medium">Clinic</label>
                  <input
                    type="text"
                    name="clinic"
                    value={formData.clinic}
                    onChange={handleInputChange}
                    className="w-full p-3 rounded-md border"
                    style={{ borderColor: currentTheme.border, backgroundColor: currentTheme.surface }}
                    placeholder="Enter clinic name"
                  />
                </div>

                {/* Add this inside your form, after the existing phone input */}
                <div className="mb-4">
                  <label className="block mb-2 font-medium">Date of Birth <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    name="dob"
                    max={format(new Date(), 'yyyy-MM-dd')}
                    value={formData.dob}
                    onChange={handleInputChange}
                    className={`w-full p-3 rounded-md border ${errors.dob ? 'border-red-500' : ''}`}
                    style={{ 
                      borderColor: errors.dob ? '#ef4444' : currentTheme.border, 
                      backgroundColor: currentTheme.surface,
                      color: currentTheme.text
                    }}
                  />
                  {errors.dob && <p className="text-red-500 text-sm mt-1">{errors.dob}</p>}
                </div>

                <div className="mb-4">
                  <label className="block mb-2 font-medium">Appointment Type <span className="text-red-500">*</span></label>
                  <select
                    name="appointmentType"
                    value={formData.appointmentType}
                    onChange={handleInputChange}
                    className={`w-full p-3 rounded-md border ${errors.appointmentType ? 'border-red-500' : ''}`}
                    style={{ 
                      borderColor: errors.appointmentType ? '#ef4444' : currentTheme.border, 
                      backgroundColor: currentTheme.surface,
                      color: currentTheme.text
                    }}
                  >
                    <option value="Consultation">Consultation</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Second Opinion">Second Opinion</option>
                  </select>
                  {errors.appointmentType && <p className="text-red-500 text-sm mt-1">{errors.appointmentType}</p>}
                </div>

                <div className="mb-4">
                  <label className="block mb-2 font-medium">Reason for Visit <span className="text-red-500">*</span></label>
                  <textarea
                    name="reasonForVisit"
                    value={formData.reasonForVisit}
                    onChange={handleInputChange}
                    className={`w-full p-3 rounded-md border ${errors.reasonForVisit ? 'border-red-500' : ''}`}
                    style={{ 
                      borderColor: errors.reasonForVisit ? '#ef4444' : currentTheme.border, 
                      backgroundColor: currentTheme.surface,
                      color: currentTheme.text
                    }}
                    rows="3"
                  ></textarea>
                  {errors.reasonForVisit && <p className="text-red-500 text-sm mt-1">{errors.reasonForVisit}</p>}
                </div>

                <div className="mb-4">
                  <label 
                    htmlFor="clinic" 
                    className={`block mb-2 text-sm font-medium ${currentTheme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}
                  >
                    Select Clinic *
                  </label>
                  <select
                    id="clinic"
                    name="clinic"
                    value={formData.clinic}
                    onChange={handleInputChange}
                    className={`bg-gray-50 border ${errors.clinic ? 'border-red-500' : 'border-gray-300'} 
                      text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 
                      block w-full p-2.5 ${currentTheme === 'dark' ? 'bg-gray-700 border-gray-600 placeholder-gray-400 text-white' : ''}`}
                    required
                  >
                    <option value="">Choose a clinic</option>
                    {clinics.map((clinic) => (
                      <option key={clinic.id} value={clinic.id}>
                        {clinic.name}
                      </option>
                    ))}
                  </select>
                  {errors.clinic && <p className="mt-2 text-sm text-red-600">{errors.clinic}</p>}
                </div>

                <div className="mb-4">
                  <label className="block mb-2 font-medium">Previous Medical History (Optional)</label>
                  <textarea
                    name="medicalHistory"
                    value={formData.medicalHistory}
                    onChange={handleInputChange}
                    className="w-full p-3 rounded-md border"
                    style={{ 
                      borderColor: currentTheme.border, 
                      backgroundColor: currentTheme.surface,
                      color: currentTheme.text
                    }}
                    rows="4"
                  ></textarea>
                </div>

                <div className="p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md mb-4">
                  You are booking an appointment for {format(new Date(selectedDate), 'MMMM d, yyyy')} ({selectedDayName}) at {selectedSlot}.
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-md text-white flex items-center justify-center"
                  style={{ backgroundColor: currentTheme.primary }}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    'Book Appointment'
                  )}
                </button>
              </form>
            )}
          </div>
        ) : (
          <div className="text-center p-6 rounded-lg shadow-md" style={{ backgroundColor: currentTheme.surface }}>
            <CheckCircle size={50} className="mx-auto mb-4 text-green-500" />
            <h2 className="text-2xl font-bold mb-2">Appointment Booked Successfully!</h2>
            <p className="mb-4">We look forward to seeing you on {format(new Date(selectedDate), 'MMMM d, yyyy')} ({selectedDayName}) at {selectedSlot}.</p>
            <p className="text-sm" style={{ color: currentTheme.text.secondary }}>
              You will receive a confirmation email shortly with all the details of your appointment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default BookAppointment;




