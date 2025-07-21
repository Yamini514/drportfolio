import React, { useState, useEffect, useCallback } from "react";
import { useTheme } from "../../context/ThemeContext";
import { db, auth } from "../../firebase/config";
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot 
} from "firebase/firestore";
import CustomButton from "../../components/CustomButton";
import CustomInput from "../../components/CustomInput";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  Mail, 
  Edit2, 
  X, 
  CheckCircle, 
  AlertTriangle,
  Loader,
  Info
} from "lucide-react";
import { format } from "date-fns";

const MyAppointments = ({ theme }) => {
  const { currentTheme } = useTheme();
  const actualTheme = theme || currentTheme;
  
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [rescheduleModal, setRescheduleModal] = useState({
    isOpen: false,
    appointment: null,
    newDate: '',
    newTime: '',
    availableSlots: [],
    loading: false,
    dateBlockInfo: null // New field to store blocked date information
  });
  const [cancelModal, setCancelModal] = useState({
    isOpen: false,
    appointment: null,
    loading: false
  });

  const showNotification = useCallback((message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch (err) {
      return timeString;
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Confirmed': 'bg-green-100 text-green-800',
      'Cancelled': 'bg-red-100 text-red-800',
      'Completed': 'bg-blue-100 text-blue-800',
      'No-show': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const isUpcoming = (appointment) => {
    if (!appointment.appointmentDate || !appointment.appointmentTime) return false;
    try {
      const appointmentDateTime = new Date(`${appointment.appointmentDate}T${appointment.appointmentTime}`);
      return appointmentDateTime > new Date();
    } catch (error) {
      return false;
    }
  };

  // Fetch user's appointments
  const fetchAppointments = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      showNotification("Please log in to view your appointments.", "error");
      return;
    }

    try {
      setLoading(true);
      const appointmentsRef = collection(db, "appointments", "bookings", "appointments");
      const q = query(
        appointmentsRef,
        where("bookedBy", "==", user.uid)
      );
      
      const snapshot = await getDocs(q);
      const appointmentsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      appointmentsList.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.bookedAt || '');
        const dateB = new Date(b.createdAt || b.bookedAt || '');
        return dateB - dateA;
      });
      
      setAppointments(appointmentsList);
      
      if (appointmentsList.length === 0) {
        showNotification("No appointments found. Book your first appointment!", "info");
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
      showNotification("Failed to load appointments. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  // Real-time listener for appointments
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      showNotification("Please log in to view your appointments.", "error");
      return;
    }

    const appointmentsRef = collection(db, "appointments", "bookings", "appointments");
    const q = query(
      appointmentsRef,
      where("bookedBy", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const appointmentsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        appointmentsList.sort((a, b) => {
          const dateA = new Date(a.createdAt || a.bookedAt || '');
          const dateB = new Date(b.createdAt || b.bookedAt || '');
          return dateB - dateA;
        });
        
        setAppointments(appointmentsList);
        setLoading(false);
      },
      (error) => {
        console.error("Error in real-time appointments listener:", error);
        showNotification("Failed to load appointments. Please try again.", "error");
      }
    );

    return () => unsubscribe();
  }, [showNotification]);

  // Cancel appointment
  const handleCancelAppointment = async (appointmentId) => {
    try {
      setCancelModal(prev => ({ ...prev, loading: true }));
      const appointmentRef = doc(db, "appointments", "bookings", "appointments", appointmentId);
      
      await updateDoc(appointmentRef, {
        status: 'Cancelled',
        cancelledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      showNotification("Appointment cancelled successfully.");
      setCancelModal({ isOpen: false, appointment: null, loading: false });
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      showNotification("Failed to cancel appointment. Please try again.", "error");
    } finally {
      setCancelModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Show cancel confirmation
  const handleShowCancelConfirmation = (appointment) => {
    setCancelModal({
      isOpen: true,
      appointment: appointment,
      loading: false
    });
  };

  // Check if a date is blocked and return block information
  const checkDateBlockStatus = async (date, location) => {
    try {
      const selectedDateObj = new Date(date);
      const blockedPeriodsRef = collection(db, 'schedules', 'blocked-periods', 'periods');
      const blockedSnapshot = await getDocs(blockedPeriodsRef);
      
      let blockInfo = null;
      const blockedTimeSlots = [];
      
      blockedSnapshot.forEach(doc => {
        const blockedPeriod = doc.data();
        const blockStartDate = new Date(blockedPeriod.startDate);
        const blockEndDate = new Date(blockedPeriod.endDate || blockedPeriod.startDate);
        
        // Check if the selected date falls within blocked period
        if (selectedDateObj >= blockStartDate && selectedDateObj <= blockEndDate) {
          // Check if location matches
          if (blockedPeriod.location === location) {
            if (blockedPeriod.type === 'time-slot' && blockedPeriod.startTime && blockedPeriod.endTime) {
              // Specific time slot blocked
              blockedTimeSlots.push({
                startTime: blockedPeriod.startTime,
                endTime: blockedPeriod.endTime,
                reason: blockedPeriod.reason || 'Time slot unavailable'
              });
            } else {
              // Entire day blocked
              blockInfo = {
                type: 'full-day',
                reason: blockedPeriod.reason || 'This date is not available',
                startDate: blockedPeriod.startDate,
                endDate: blockedPeriod.endDate
              };
            }
          }
        }
      });
      
      if (blockedTimeSlots.length > 0) {
        blockInfo = {
          type: 'time-slots',
          reason: 'Some time slots are blocked',
          blockedSlots: blockedTimeSlots
        };
      }
      
      return blockInfo;
    } catch (error) {
      console.error('Error checking date block status:', error);
      return null;
    }
  };

  // Generate available slots for reschedule
  const generateRescheduleSlots = async (date, location) => {
    try {
      setRescheduleModal(prev => ({ ...prev, loading: true }));
      
      // Check if date is blocked first
      const blockInfo = await checkDateBlockStatus(date, location);
      
      // Update modal with block information
      setRescheduleModal(prev => ({ ...prev, dateBlockInfo: blockInfo }));
      
      if (blockInfo && blockInfo.type === 'full-day') {
        showNotification(`${blockInfo.reason}`, 'error');
        return [];
      }
      
      // Get available periods for the location
      const periodsRef = collection(db, 'schedules', 'available-periods', 'periods');
      const periodsSnapshot = await getDocs(periodsRef);
      
      if (periodsSnapshot.empty) {
        return [];
      }

      const selectedDateObj = new Date(date);
      const dayName = selectedDateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      
      // Find applicable periods
      const applicablePeriods = [];
      
      periodsSnapshot.forEach(doc => {
        const period = doc.data();
        
        if (period.name !== location) return;
        
        const periodStartDate = new Date(period.startDate);
        
        if (period.isRecurring) {
          if (period.days && period.days[dayName] && selectedDateObj >= periodStartDate) {
            applicablePeriods.push(period);
          }
        } else {
          const periodEndDate = new Date(period.endDate);
          if (selectedDateObj >= periodStartDate && selectedDateObj <= periodEndDate) {
            applicablePeriods.push(period);
          }
        }
      });

      if (applicablePeriods.length === 0) {
        return [];
      }

      // Generate time slots from all applicable periods
      const allSlots = [];
      
      applicablePeriods.forEach(period => {
        const startTime = period.startTime;
        const endTime = period.endTime;
        const appointmentDuration = period.appointmentDuration || 30;
        const bufferTime = period.bufferTime || 5;
        
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);
        
        let currentTime = new Date();
        currentTime.setHours(startHour, startMin, 0, 0);
        
        const endTimeObj = new Date();
        endTimeObj.setHours(endHour, endMin, 0, 0);
        
        while (currentTime < endTimeObj) {
          const timeString = currentTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
          
          if (!allSlots.includes(timeString)) {
            allSlots.push(timeString);
          }
          
          currentTime.setMinutes(currentTime.getMinutes() + appointmentDuration + bufferTime);
        }
      });

      // Sort slots
      allSlots.sort((a, b) => {
        const timeA = new Date(`2000-01-01T${a}`);
        const timeB = new Date(`2000-01-01T${b}`);
        return timeA - timeB;
      });

      // Filter out blocked time slots
      const slotsAfterBlockFilter = allSlots.filter(slot => {
        const [slotHour, slotMin] = slot.split(':').map(Number);
        const slotMinutes = slotHour * 60 + slotMin;
        
        // Check if slot falls within any blocked time range
        if (blockInfo && blockInfo.type === 'time-slots') {
          return !blockInfo.blockedSlots.some(blockedRange => {
            const [blockStartHour, blockStartMin] = blockedRange.startTime.split(':').map(Number);
            const [blockEndHour, blockEndMin] = blockedRange.endTime.split(':').map(Number);
            const blockStartMinutes = blockStartHour * 60 + blockStartMin;
            const blockEndMinutes = blockEndHour * 60 + blockEndMin;
            
            return slotMinutes >= blockStartMinutes && slotMinutes < blockEndMinutes;
          });
        }
        
        return true;
      });

      // Check for existing appointments
      const appointmentsRef = collection(db, 'appointments', 'bookings', 'appointments');
      const appointmentsSnapshot = await getDocs(appointmentsRef);
      
      const bookedSlots = [];
      appointmentsSnapshot.forEach(doc => {
        const apt = doc.data();
        if (apt.appointmentDate === date && apt.location === location && apt.status !== 'Cancelled') {
          bookedSlots.push(apt.appointmentTime);
        }
      });

      // Filter out booked slots and past times for today
      const now = new Date();
      const isToday = selectedDateObj.toDateString() === now.toDateString();
      
      const availableSlots = slotsAfterBlockFilter.filter(slot => {
        if (bookedSlots.includes(slot)) {
          return false;
        }
        
        if (isToday) {
          const [slotHour, slotMin] = slot.split(':').map(Number);
          const slotTime = new Date();
          slotTime.setHours(slotHour, slotMin, 0, 0);
          return slotTime > now;
        }
        
        return true;
      });

      // Convert to 12-hour format for display
      const formattedSlots = availableSlots.map(slot => {
        const [hours, minutes] = slot.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes);
        return {
          value: slot,
          label: date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          })
        };
      });

      if (formattedSlots.length === 0 && blockInfo && blockInfo.type === 'time-slots') {
        const blockedRanges = blockInfo.blockedSlots.map(slot => 
          `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)} (${slot.reason})`
        ).join(', ');
        showNotification(`Some time slots are blocked: ${blockedRanges}`, 'error');
      }

      return formattedSlots;
    } catch (error) {
      console.error('Error generating reschedule slots:', error);
      showNotification('Failed to load available slots', 'error');
      return [];
    } finally {
      setRescheduleModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Start reschedule process
  const handleStartReschedule = (appointment) => {
    setRescheduleModal({
      isOpen: true,
      appointment,
      newDate: '',
      newTime: '',
      availableSlots: [],
      loading: false,
      dateBlockInfo: null
    });
  };

  // Handle date change for reschedule
  const handleRescheduleDateChange = async (e) => {
    const newDate = e.target.value;
    setRescheduleModal(prev => ({ 
      ...prev, 
      newDate, 
      newTime: '', 
      availableSlots: [],
      dateBlockInfo: null
    }));
    
    if (newDate && rescheduleModal.appointment) {
      setRescheduleModal(prev => ({ ...prev, loading: true }));
      
      try {
        const slots = await generateRescheduleSlots(newDate, rescheduleModal.appointment.location);
        setRescheduleModal(prev => ({ ...prev, availableSlots: slots, loading: false }));
      } catch (error) {
        console.error('Error loading reschedule slots:', error);
        setRescheduleModal(prev => ({ ...prev, loading: false }));
        showNotification('Failed to check date availability', 'error');
      }
    }
  };

  // Confirm reschedule
  const handleConfirmReschedule = async () => {
    if (!rescheduleModal.newDate || !rescheduleModal.newTime) {
      showNotification("Please select both date and time.", "error");
      return;
    }

    try {
      setRescheduleModal(prev => ({ ...prev, loading: true }));
      
      const appointmentRef = doc(db, "appointments", "bookings", "appointments", rescheduleModal.appointment.id);
      
      await updateDoc(appointmentRef, {
        appointmentDate: rescheduleModal.newDate,
        appointmentTime: rescheduleModal.newTime,
        status: 'Pending',
        rescheduledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      showNotification("Appointment rescheduled successfully!");
      setRescheduleModal({
        isOpen: false,
        appointment: null,
        newDate: '',
        newTime: '',
        availableSlots: [],
        loading: false,
        dateBlockInfo: null
      });
    } catch (error) {
      console.error("Error rescheduling appointment:", error);
      showNotification("Failed to reschedule appointment. Please try again.", "error");
    } finally {
      setRescheduleModal(prev => ({ ...prev, loading: false }));
    }
  };

  const getTodayString = () => new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div
          className={`p-4 rounded-lg flex items-center transition-opacity duration-300 ${
            notification.type === "error"
              ? "bg-red-100 text-red-800"
              : notification.type === "info"
              ? "bg-blue-100 text-blue-800"
              : "bg-green-100 text-green-800"
          }`}
        >
          {notification.type === "error" ? (
            <AlertTriangle size={20} className="mr-2" />
          ) : (
            <CheckCircle size={20} className="mr-2" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold" style={{ color: actualTheme.text.primary }}>
          My Appointments
        </h2>
        <span className="text-sm" style={{ color: actualTheme.text.secondary }}>
          {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Cancel Confirmation Modal */}
      {cancelModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div 
            className="bg-white rounded-lg p-6 w-full max-w-md"
            style={{ backgroundColor: actualTheme.surface }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold" style={{ color: actualTheme.text.primary }}>
                  Cancel Appointment
                </h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm" style={{ color: actualTheme.text.primary }}>
                Are you sure you want to cancel this appointment?
              </p>
              {cancelModal.appointment && (
                <div className="mt-3 p-3 rounded-lg bg-gray-50">
                  <div className="text-sm space-y-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span className="font-medium">
                        {format(new Date(cancelModal.appointment.appointmentDate), "MMMM d, yyyy")} at {formatTime(cancelModal.appointment.appointmentTime)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-red-600" />
                      <span>{cancelModal.appointment.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-600" />
                      <span>{cancelModal.appointment.patientName}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <CustomButton
                onClick={() => handleCancelAppointment(cancelModal.appointment.id)}
                disabled={cancelModal.loading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white border-red-600"
              >
                {cancelModal.loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader className="animate-spin w-4 h-4" />
                    Cancelling...
                  </div>
                ) : (
                  'Yes, Cancel Appointment'
                )}
              </CustomButton>
              <CustomButton
                variant="outlined"
                onClick={() => setCancelModal({ isOpen: false, appointment: null, loading: false })}
                disabled={cancelModal.loading}
                className="flex-1"
              >
                Keep Appointment
              </CustomButton>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div 
            className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: actualTheme.surface }}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold" style={{ color: actualTheme.text.primary }}>
                Reschedule Appointment
              </h3>
              <button
                onClick={() => setRescheduleModal({ 
                  isOpen: false, 
                  appointment: null, 
                  newDate: '', 
                  newTime: '', 
                  availableSlots: [], 
                  loading: false,
                  dateBlockInfo: null 
                })}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Current Appointment Details */}
              <div className="p-3 rounded-lg bg-gray-50">
                <p className="text-sm font-medium text-gray-600">Current Appointment:</p>
                <p className="text-sm" style={{ color: actualTheme.text.primary }}>
                  {format(new Date(rescheduleModal.appointment?.appointmentDate), "MMMM d, yyyy")} at {formatTime(rescheduleModal.appointment?.appointmentTime)}
                </p>
                <p className="text-sm text-gray-600">{rescheduleModal.appointment?.location}</p>
              </div>

              {/* New Date Selection */}
              <div>
                <CustomInput
                  label="Select New Date *"
                  type="date"
                  value={rescheduleModal.newDate}
                  onChange={handleRescheduleDateChange}
                  min={getTodayString()}
                />
              </div>

              {/* Date Block Information */}
              {rescheduleModal.dateBlockInfo && (
                <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-yellow-800">Date Information:</p>
                      <p className="text-yellow-700">{rescheduleModal.dateBlockInfo.reason}</p>
                      {rescheduleModal.dateBlockInfo.type === 'time-slots' && rescheduleModal.dateBlockInfo.blockedSlots && (
                        <div className="mt-2">
                          <p className="font-medium text-yellow-800">Blocked Time Slots:</p>
                          <ul className="list-disc list-inside text-yellow-700">
                            {rescheduleModal.dateBlockInfo.blockedSlots.map((slot, index) => (
                              <li key={index}>
                                {formatTime(slot.startTime)} - {formatTime(slot.endTime)}: {slot.reason}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Time Slot Selection */}
              {rescheduleModal.newDate && (
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: actualTheme.text.primary }}>
                    Select New Time *
                  </label>
                  {rescheduleModal.loading ? (
                    <div className="flex justify-center py-4">
                      <Loader className="animate-spin" size={20} />
                    </div>
                  ) : rescheduleModal.availableSlots.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                      {rescheduleModal.availableSlots.map((slot) => (
                        <button
                          key={slot.value}
                          onClick={() => setRescheduleModal(prev => ({ ...prev, newTime: slot.value }))}
                          className={`p-2 text-sm rounded-md border transition-colors ${
                            rescheduleModal.newTime === slot.value 
                              ? 'border-blue-500 bg-blue-50 text-blue-700' 
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                          style={{ 
                            backgroundColor: rescheduleModal.newTime === slot.value ? undefined : actualTheme.surface,
                            color: rescheduleModal.newTime === slot.value ? undefined : actualTheme.text.primary
                          }}
                        >
                          {slot.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500">No available slots for selected date</p>
                      {rescheduleModal.dateBlockInfo && rescheduleModal.dateBlockInfo.type === 'full-day' && (
                        <p className="text-xs text-red-500 mt-1">
                          Reason: {rescheduleModal.dateBlockInfo.reason}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <CustomButton
                  onClick={handleConfirmReschedule}
                  disabled={!rescheduleModal.newDate || !rescheduleModal.newTime || rescheduleModal.loading}
                  className="flex-1"
                >
                  {rescheduleModal.loading ? 'Rescheduling...' : 'Confirm Reschedule'}
                </CustomButton>
                <CustomButton
                  variant="outlined"
                  onClick={() => setRescheduleModal({ 
                    isOpen: false, 
                    appointment: null, 
                    newDate: '', 
                    newTime: '', 
                    availableSlots: [], 
                    loading: false,
                    dateBlockInfo: null 
                  })}
                  disabled={rescheduleModal.loading}
                  className="flex-1"
                >
                  Cancel
                </CustomButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-8">
          <Loader className="animate-spin" size={32} />
        </div>
      )}

      {/* Appointments List */}
      {!loading && appointments.length > 0 && (
        <div className="space-y-4">
          {appointments.map((appointment) => (
            <div
              key={appointment.id}
              className="border rounded-lg p-6 shadow-sm"
              style={{ 
                backgroundColor: actualTheme.surface, 
                borderColor: actualTheme.border 
              }}
            >
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                {/* Appointment Details */}
                <div className="flex-1 space-y-3">
                  {/* Status and Date/Time */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span className="font-medium" style={{ color: actualTheme.text.primary }}>
                        {format(new Date(appointment.appointmentDate), "MMMM d, yyyy")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-green-600" />
                      <span className="font-medium" style={{ color: actualTheme.text.primary }}>
                        {formatTime(appointment.appointmentTime)}
                      </span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                      {appointment.status || 'Pending'}
                    </span>
                  </div>

                  {/* Location */}
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-red-600" />
                    <span style={{ color: actualTheme.text.primary }}>{appointment.location}</span>
                  </div>

                  {/* Patient Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-600" />
                      <span style={{ color: actualTheme.text.primary }}>
                        {appointment.patientName}
                      </span>
                    </div>
                    {appointment.patientPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-600" />
                        <span style={{ color: actualTheme.text.primary }}>{appointment.patientPhone}</span>
                      </div>
                    )}
                    {appointment.patientEmail && (
                      <div className="flex items-center gap-2 sm:col-span-2">
                        <Mail className="w-4 h-4 text-gray-600" />
                        <span style={{ color: actualTheme.text.primary }}>{appointment.patientEmail}</span>
                      </div>
                    )}
                  </div>

                  {/* Additional Details */}
                  <div className="text-sm space-y-1">
                    <div>
                      <span className="font-medium" style={{ color: actualTheme.text.primary }}>Type: </span>
                      <span style={{ color: actualTheme.text.primary }}>{appointment.appointmentType}</span>
                    </div>
                    {appointment.reasonForVisit && (
                      <div>
                        <span className="font-medium" style={{ color: actualTheme.text.primary }}>Purpose: </span>
                        <span style={{ color: actualTheme.text.primary }}>{appointment.reasonForVisit}</span>
                      </div>
                    )}
                    {appointment.patientAge && (
                      <div>
                        <span className="font-medium" style={{ color: actualTheme.text.primary }}>Age: </span>
                        <span style={{ color: actualTheme.text.primary }}>{appointment.patientAge}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 lg:w-auto w-full">
                  {isUpcoming(appointment) && appointment.status !== 'Cancelled' && appointment.status !== 'Completed' && (
                    <>
                      <CustomButton
                        variant="outlined"
                        onClick={() => handleStartReschedule(appointment)}
                        disabled={loading}
                        className="flex items-center justify-center gap-2 w-full lg:w-auto"
                      >
                        <Edit2 className="w-4 h-4" />
                        Reschedule
                      </CustomButton>
                      <CustomButton
                        variant="outlined"
                        onClick={() => handleShowCancelConfirmation(appointment)}
                        disabled={loading}
                        className="flex items-center justify-center gap-2 w-full lg:w-auto border-red-500 text-red-500 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </CustomButton>
                    </>
                  )}
                  {appointment.status === 'Completed' && (
                    <div className="flex items-center gap-2 text-green-600 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      <span>Completed</span>
                    </div>
                  )}
                  {appointment.status === 'Cancelled' && (
                    <div className="flex items-center gap-2 text-red-600 text-sm">
                      <X className="w-4 h-4" />
                      <span>Cancelled</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && appointments.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">No Appointments Found</h3>
          <p className="text-gray-500 mb-4">You haven't booked any appointments yet.</p>
        </div>
      )}
    </div>
  );
};

export default MyAppointments;