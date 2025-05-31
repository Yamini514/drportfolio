import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { format } from 'date-fns';
import { db } from '../firebase/config';
import { collection, getDocs, addDoc, doc, setDoc, getDoc, query, where } from 'firebase/firestore';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import CustomSelect from '../components/CustomSelect';
import 'react-datepicker/dist/react-datepicker.css';
import emailjs from '@emailjs/browser';

import { Calendar, Clock, AlertTriangle } from 'lucide-react';

function BookAppointment() {
  const { currentTheme } = useTheme();
  const [bookedDates, setBookedDates] = useState([]);

  // const [availableDates, setAvailableDates] = useState([]);

  const today = format(new Date(), 'yyyy-MM-dd');
  // Allow selection up to next year
  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);
  const maxDate = format(nextYear, 'yyyy-MM-dd');
  
  const [selectedDate, setSelectedDate] = useState('');
  const [allowedDateRange, setAllowedDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  
  const [selectedDayName, setSelectedDayName] = useState('');
  const MAX_SLOTS_PER_DAY = 5;
  const [selectedSlot, setSelectedSlot] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [bookingMessage, setBookingMessage] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    dob: '',
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  useEffect(() => {
    const fetchDateRange = async () => {
      try {
        const dateRangeDoc = await getDoc(doc(db, 'settings', 'dateRange'));
        if (dateRangeDoc.exists()) {
          const data = dateRangeDoc.data();
          setAllowedDateRange({
            startDate: data.startDate || '',
            endDate: data.endDate || ''
          });
        }
      } catch (error) {
        console.error("Failed to fetch date range:", error);
      }
    };
  
    fetchDateRange();
  }, []);
  
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
  const isDateUnavailable = (dateStr) => {
    const date = new Date(dateStr);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    return (
      bookedDates.includes(dateStr) || // Fully booked
      dayName === 'Sunday' || // Sunday
      date < new Date(today) // Past date
    );
  };

  // Fetch time slots from Firebase based on selected date
  // Add this helper function at the top of your component
  const formatTimeSlot = (slot) => {
    if (!slot) return '';
    const cleanSlot = slot.replace(/["']/g, '').trim();
    return cleanSlot;
  };
   
  const fetchTimeSlots = async (date, dayName) => {
    setIsLoading(true);
  
    try {
      // First check if date is blocked
      const { blocked, reason } = await checkIfDateIsBlocked(date, dayName);
      if (blocked) {
        setIsDateBlocked(true);
        setBlockReason(reason);
        setTimeSlots([]);
        setDaySchedule(null);
        setIsLoading(false);
        return;
      }
  
      setIsDateBlocked(false);
      setBlockReason('');
  
      // Fetch pre-generated schedule slot for the selected date
      const scheduleRef = collection(db, 'appointments/data/schedule');
      const q = query(scheduleRef, where('date', '==', date));
      const querySnapshot = await getDocs(q);
  
      if (querySnapshot.empty) {
        setTimeSlots([]);
        // setBookingMessage('No available slots for the selected date.');
        setDaySchedule({ isOpen: false });
        setIsLoading(false);
        return;
      }
     
      
      const docData = querySnapshot.docs[0].data();
      const storedSlots = Array.isArray(docData.timeSlots) ? docData.timeSlots : [];
  
      // Remove already booked slots
      const availableSlots = storedSlots.filter(slot => {
        return !bookedSlots[date]?.includes(slot);
      });
  
      setTimeSlots(availableSlots);
      setDaySchedule({ isOpen: true });
  
    } catch (error) {
      console.error('Error fetching time slots:', error);
      setTimeSlots([]);
      setBookingMessage('Error loading available slots. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    const fetchBookedDates = async () => {
      const snapshot = await getDocs(collection(db, 'appointments/data/bookings'));
      const counts = {};
  
      snapshot.forEach(doc => {
        const date = doc.data().date;
        counts[date] = (counts[date] || 0) + 1;
      });
  
      const fullyBooked = Object.entries(counts)
        .filter(([_, count]) => count >= MAX_SLOTS_PER_DAY)
        .map(([date]) => date);
  
      setBookedDates(fullyBooked);
    };
  
    fetchBookedDates();
  }, []);
  // const createTimeSlotsFromDaySchedule = (daySchedule) => {

  //   if (!daySchedule) return [];
  
  //   // If daySchedule is already an array of time slots
  //   if (Array.isArray(daySchedule)) {
  //     return Array.from(new Set(daySchedule.map(slot => {
  //       // Remove any quotes and format properly
  //       const cleanSlot = slot.replace(/["']/g, '').trim();
  //       return formatTimeSlot(cleanSlot);
  //     })));
  //   }
  
  //   // If slots is directly an array of time strings
  //   if (Array.isArray(daySchedule.slots)) {
  //     return Array.from(new Set(daySchedule.slots.map(slot => {
  //       // Remove any quotes and format properly
  //       const cleanSlot = slot.replace(/["']/g, '').trim();
  //       return formatTimeSlot(cleanSlot);
  //     })));
  //   }
  
  //   // Add this helper function at the top of your component
  //   const formatTimeSlot = (slot) => {
  //     if (!slot) return '';
  //     // Remove any quotes and extra spaces
  //     const cleanSlot = slot.replace(/["']/g, '').trim();
  //     // Split into hours and minutes if it's in the format "9:00", "10:30", etc.
  //     const [time] = cleanSlot.split(',');
  //     const [hours, minutes] = time.split(':').map(num => num.trim());
  //     const hour = parseInt(hours);
  //     const period = hour >= 12 ? 'PM' : 'AM';
  //     const displayHour = hour % 12 || 12;
  //     return `${displayHour}:${minutes} ${period}`;
  //   };
  
  //   const allSlots = new Set(); // Use Set to prevent duplicates
      
  //   try {
  //     Object.entries(daySchedule.slots).forEach(([key, slot]) => {
  //       // Handle if slot is already a formatted time string
  //       if (typeof slot === 'string') {
  //         allSlots.add(formatTimeSlot(slot));
  //         return;
  //       }
  
  //       // Rest of the code remains the same
  //       // Handle if slot has start/end format
  //       if (slot && typeof slot.start === 'string' && typeof slot.end === 'string') {
  //         const [startHour, startMinute] = slot.start.split(':').map(Number);
  //         const [endHour, endMinute] = slot.end.split(':').map(Number);
          
  //         if (isNaN(startHour) || isNaN(startMinute) || isNaN(endHour) || isNaN(endMinute)) {
  //           console.warn('Invalid time format:', slot);
  //           return;
  //         }
          
  //         let currentHour = startHour;
  //         let currentMinute = startMinute;
          
  //         while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
  //           const displayHour = currentHour % 12 || 12;
  //           const period = currentHour >= 12 ? 'PM' : 'AM';
  //           const timeSlot = `${displayHour}:${currentMinute.toString().padStart(2, '0')} ${period}`;
            
  //           allSlots.add(timeSlot);
            
  //           currentMinute += 30;
  //           if (currentMinute >= 60) {
  //             currentHour += 1;
  //             currentMinute = 0;
  //           }
  //         }
  //       }
  //     });
  //   } catch (error) {
  //     console.error('Error processing slots:', error);
  //     return [];
  //   }
    
  //   return Array.from(allSlots);
  // };

  useEffect(() => {
    const fetchBookedSlots = async () => {
      try {
        const bookingsRef = collection(db, 'appointments/data/bookings');
        const querySnapshot = await getDocs(bookingsRef);
        const slots = {};
        
        querySnapshot.forEach((doc) => {
          const appointment = doc.data();
          if (!slots[appointment.date]) {
            slots[appointment.date] = [];
          }
          slots[appointment.date].push(appointment.time);
        });
        
        setBookedSlots(slots);
      } catch (error) {
        console.error('Error fetching appointments:', error);
      }
    };
   


    
    const createDataDocIfNeeded = async () => {
      const dataDocRef = doc(db, 'appointments', 'data');
      const dataDoc = await getDoc(dataDocRef);
      
      if (!dataDoc.exists()) {
        await setDoc(dataDocRef, { 
          created: new Date(),
          description: 'Container for appointment bookings' 
        });
      }
    };
    
    createDataDocIfNeeded().then(() => fetchBookedSlots());
  }, []);

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

  // Add this function to check slot availability in real-time
const checkSlotAvailability = async (date, slot) => {
  try {
    const bookingsRef = collection(db, 'appointments/data/bookings');
    const q = query(bookingsRef, 
      where('date', '==', date),
      where('time', '==', slot)
    );
    const snapshot = await getDocs(q);
    return snapshot.empty;
  } catch (error) {
    console.error('Error checking slot availability:', error);
    return false;
  }
};

// Update handleSlotSelect to check availability in real-time
const handleSlotSelect = async (slot) => {
  setIsLoading(true);
  const isAvailable = await checkSlotAvailability(selectedDate, slot);
  
  if (!isAvailable) {
    setBookingMessage('This slot was just booked. Please select another time.');
    setShowForm(false);
    setSelectedSlot('');
    // Update booked slots
    setBookedSlots(prev => ({
      ...prev,
      [selectedDate]: [...(prev[selectedDate] || []), slot]
    }));
  } else {
    setSelectedSlot(slot);
    setShowForm(true);
    setBookingMessage('');
  }
  setIsLoading(false);
};

// Update form validation
const validateForm = () => {
  const newErrors = {};
  
  // Name validation
  if (!formData.name.trim()) {
    newErrors.name = 'Name is required';
  } else if (formData.name.trim().length < 2) {
    newErrors.name = 'Name must be at least 2 characters';
  }

  // Email validation
  if (!formData.email.trim()) {
    newErrors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
    newErrors.email = 'Please enter a valid email address';
  }

  // Phone validation
  if (!formData.phone.trim()) {
    newErrors.phone = 'Phone is required';
  } else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
    newErrors.phone = 'Please enter a valid 10-digit phone number';
  }

  // Date of Birth validation
  if (!formData.dob.trim()) {
    newErrors.dob = 'Date of Birth is required';
  } else {
    const dobDate = new Date(formData.dob);
    const today = new Date();
    if (dobDate >= today) {
      newErrors.dob = 'Date of Birth cannot be in the future';
    }
  }

  // Reason for visit validation
  if (!formData.reasonForVisit.trim()) {
    newErrors.reasonForVisit = 'Reason for visit is required';
  } else if (formData.reasonForVisit.trim().length < 10) {
    newErrors.reasonForVisit = 'Please provide more details about your visit';
  }

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};

// Update handleSubmit with final availability check
const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!validateForm()) {
    return;
  }

  try {
    setIsLoading(true);

    // Final check for slot availability
    const isStillAvailable = await checkSlotAvailability(selectedDate, selectedSlot);
    if (!isStillAvailable) {
      setBookingMessage('This slot was just booked. Please select another time.');
      setShowForm(false);
      setSelectedSlot('');
      return;
    }

    // Check if date is blocked
    const { blocked, reason } = await checkIfDateIsBlocked(selectedDate, selectedDayName);
    if (blocked) {
      setBookingMessage(`This date is not available: ${reason}`);
      setShowForm(false);
      return;
    }

    // Proceed with booking
    const bookingsRef = collection(db, 'appointments/data/bookings');
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
      status: 'pending',
      createdAt: new Date().toISOString()
    });

    // Update UI
    setShowSuccess(true);
    setShowForm(false);
    // Rest of the success handling code...

  } catch (error) {
    console.error('Error booking appointment:', error);
    setBookingMessage('Error booking appointment. Please try again.');
  } finally {
    setIsLoading(false);
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

  return (
    <div className="p-0 sm:p-0 rounded-lg w-full max-w-4xl mx-auto overflow-hidden" style={{ backgroundColor: currentTheme.surface }}>
      <h2 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6" style={{ color: currentTheme.text.primary }}>
        Book Your appointment here
      </h2>

      {showSuccess && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg bg-green-100 text-green-800 text-sm sm:text-base">
          Appointment booked successfully!
        </div>
      )}

      {bookingMessage && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg bg-red-100 text-red-800 text-sm sm:text-base">
          {bookingMessage}
        </div>
      )}

      <div className="space-y-4 sm:space-y-6">
        // First, add this function before the return statement
        
        
        // Then modify the CustomInput for date selection
        <CustomInput
          type="date"
          label="Select Date"
          value={selectedDate}
          onChange={(e) => {
            const date = e.target.value;
            if (!isDateUnavailable(date)) {
              handleDateChange(e);
            }
          }}
          min={today}
          max={maxDate}
          required
          className="w-full sm:w-auto"
          style={{
            opacity: isDateUnavailable(selectedDate) ? 0.5 : 1,
            cursor: isDateUnavailable(selectedDate) ? 'not-allowed' : 'pointer'
          }}
        />

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: currentTheme.primary }}></div>
          </div>
        )}

        {/* Selected Day Information */}
        {selectedDate && selectedDayName && !isLoading && (
          <div className="p-2 rounded-md" style={{ 
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
  <div className="mt-4 sm:mt-6">
    <label className="block text-sm sm:text-base font-medium mb-2 sm:mb-3" style={{ color: currentTheme.text.primary }}>
      Available Time Slots
    </label>
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
      {timeSlots.map((slot) => {
        const isBooked = bookedSlots[selectedDate]?.includes(slot);
        return (
          <CustomButton
            key={slot}
            variant={selectedSlot === slot ? 'primary' : isBooked ? 'danger' : 'secondary'}
            onClick={() => !isBooked && handleSlotSelect(slot)}
            className={`w-full justify-center text-sm sm:text-base py-2 px-3 ${isBooked ? 'opacity-50 cursor-not-allowed' : ''}`}
            icon={Clock}
          >
            {slot}
          </CustomButton>
        );
      })}
    </div>
  </div>
)}

        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
            <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
              <CustomInput
                label="Client Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                error={errors.name}
              />
              <CustomInput
                type="email"
                label="Email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                error={errors.email}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
              <CustomInput
                type="tel"
                label="Phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                required
                error={errors.phone}
              />
              <CustomInput
                type="date"
                label="Date of Birth"
                name="dob"
                value={formData.dob}
                onChange={handleInputChange}
                required
                error={errors.dob}
              />
            </div>
            <CustomSelect
              label="Appointment Type"
              name="appointmentType"
              value={formData.appointmentType}
              onChange={handleInputChange}
              options={[
                { value: 'Consultation', label: 'Consultation' },
                { value: 'Follow-up', label: 'Follow-up' },
                { value: 'Second Opinion', label: 'Second Opinion' }
              ]}
              error={errors.appointmentType}
            />
            <CustomInput
              label="Reason for Visit"
              name="reasonForVisit"
              value={formData.reasonForVisit}
              onChange={handleInputChange}
              required
              error={errors.reasonForVisit}
            />
            <CustomInput
              type="textarea"
              label="Medical History"
              name="medicalHistory"
              value={formData.medicalHistory}
              onChange={handleInputChange}
              rows={4}
            />

            <CustomButton
              type="submit"
              variant="primary"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Book Appointment'}
            </CustomButton>
          </form>
        )}
      </div>
    </div>
  );
}

export default BookAppointment;

