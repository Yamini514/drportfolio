import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, ThumbsUp, Eye, Trash2, ArrowLeft } from 'lucide-react';
import CustomSearch from '../../../components/CustomSearch';
import CustomButton from '../../../components/CustomButton';
import CustomTable from '../../../components/CustomTable';
import CustomSelect from '../../../components/CustomSelect';
import CustomDeleteConfirmation from '../../../components/CustomDeleteConfirmation';
import { collection, getDocs, updateDoc, doc, onSnapshot, query, orderBy, where, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useTheme } from '../../../context/ThemeContext';
import emailjs from '@emailjs/browser';

function AppointmentsContent() {
  const [appointments, setAppointments] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, appointmentId: null });
  const { currentTheme } = useTheme() || {
    currentTheme: {
      background: '#fff',
      surface: '#fff',
      secondary: '#f9f9f9',
      border: '#ccc',
      success: { light: '#d4edda', dark: '#155724' },
      error: { light: '#f8d7da', dark: '#721c24' },
      destructive: '#dc3545',
      text: { primary: '#000', secondary: '#6c757d' },
    },
  };
  const [selectedPid, setSelectedPid] = useState(null);
  const [selectedPatientDetails, setSelectedPatientDetails] = useState(null);
  const [notification, setNotification] = useState(null);
  const [notificationSound] = useState(() => {
    try {
      return new Audio('/notifications.wav');
    } catch (error) {
      console.warn('Notification sound unavailable:', error);
      return null;
    }
  });

  // Initialize EmailJS
  useEffect(() => {
    emailjs.init('2pSuAO6tF3T-sejH-');
  }, []);

  // Robust email validation
  const isValidEmail = useCallback((email) => {
    if (!email || typeof email !== 'string') return false;
    const trimmedEmail = email.trim();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(trimmedEmail) && trimmedEmail !== 'noreply@gmail.com';
  }, []);

  // Format date to DD-MMM-YYYY
  const formatDate = useCallback((dateStr) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr || 'Invalid Date';
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateStr || 'Invalid Date';
    }
  }, []);

  // Check if appointment is in the future
  const isFutureAppointment = useCallback((appointment) => {
    try {
      if (!appointment?.date || !appointment?.time) return false;
      const appointmentDateTime = new Date(`${appointment.date} ${appointment.time}`);
      return appointmentDateTime > new Date();
    } catch (error) {
      console.error('Error parsing appointment date/time:', error);
      return false;
    }
  }, []);

  // Check if slot is available after deletion
  const checkSlotAvailability = useCallback(async (date, time, location) => {
    if (!date || !time || !location || location === 'Unknown') {
      console.warn('Missing data for slot availability check:', { date, time, location });
      setNotification({ message: 'Cannot verify slot availability: missing data.', type: 'error' });
      setTimeout(() => setNotification(null), 5000);
      return false;
    }
    try {
      const bookingsRef = collection(db, 'appointments/data/bookings');
      const q = query(
        bookingsRef,
        where('date', '==', date),
        where('time', '==', time),
        where('location', '==', location),
        where('status', '!=', 'deleted')
      );
      const snapshot = await getDocs(q);
      return snapshot.empty;
    } catch (error) {
      console.error('Error checking slot availability:', error);
      setNotification({ message: `Failed to verify slot availability: ${error.message}`, type: 'error' });
      setTimeout(() => setNotification(null), 5000);
      return false;
    }
  }, []);

  // Check if date is blocked
  const checkIfDateIsBlocked = useCallback(async (dateStr) => {
    if (!dateStr) {
      console.warn('No date provided for blocked date check');
      return { blocked: false, reason: '' };
    }
    try {
      const blockedPeriodsDoc = await getDoc(doc(db, 'settings', 'blockedPeriods'));
      if (blockedPeriodsDoc.exists()) {
        const periods = blockedPeriodsDoc.data().periods || [];
        const checkDate = new Date(dateStr);
        for (const period of periods) {
          const blockStart = new Date(period.startDate);
          if (period.type === 'day') {
            if (blockStart.toDateString() === checkDate.toDateString()) {
              return { blocked: true, reason: period.reason || 'This date is blocked.' };
            }
          } else if (period.type === 'period') {
            const blockEnd = new Date(period.endDate);
            if (checkDate >= blockStart && checkDate <= blockEnd) {
              return { blocked: true, reason: period.reason || 'This period is blocked.' };
            }
          }
        }
      }
      return { blocked: false, reason: '' };
    } catch (error) {
      console.error('Error checking blocked date:', error);
      setNotification({ message: 'Failed to check date availability.', type: 'error' });
      setTimeout(() => setNotification(null), 5000);
      return { blocked: false, reason: '' };
    }
  }, []);

  // Delete blocked schedule
  const deleteBlockedSchedule = useCallback(async (date) => {
    if (!date) {
      console.warn('No date provided for deleting blocked schedule');
      return;
    }
    try {
      const scheduleRef = collection(db, 'appointments/data/schedule');
      const q = query(scheduleRef, where('date', '==', date));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(async (docSnap) => {
        await deleteDoc(doc(db, 'appointments/data/schedule', docSnap.id));
        console.log(`Deleted blocked schedule for date: ${date}, docId: ${docSnap.id}`);
      });
      await Promise.all(deletePromises);
      setNotification({ message: `Deleted schedule for blocked date: ${formatDate(date)}`, type: 'success' });
      setTimeout(() => setNotification(null), 5000);
    } catch (error) {
      console.error('Error deleting blocked schedule:', error);
      setNotification({ message: `Failed to delete blocked schedule: ${error.message}`, type: 'error' });
      setTimeout(() => setNotification(null), 5000);
    }
  }, [formatDate]);

  // Simulate sending phone notification
  const sendPhoneNotification = useCallback((appointment, action) => {
    if (!appointment?.phone || appointment.phone === 'Unknown') {
      console.warn(`No valid phone number for appointment ${appointment.id}`);
      return;
    }
    const message = action === 'confirmed'
      ? `Your appointment on ${formatDate(appointment.date)} at ${appointment.time} has been confirmed.`
      : `Your appointment on ${formatDate(appointment.date)} at ${appointment.time} has been ${action === 'deleted' ? 'deleted' : 'cancelled'} and the slot is now available.`;
    
    console.log(`Sending SMS to ${appointment.phone}: ${message}`);
    setNotification({
      message: `Notified patient via SMS: ${message}`,
      type: 'success'
    });
    setTimeout(() => setNotification(null), 5000);
  }, [formatDate]);

  // Send email notification
  const sendEmailNotification = useCallback(async (appointment, action) => {
    if (!appointment?.id || !appointment?.email) {
      console.error('Invalid appointment data for email notification:', { id: appointment?.id, email: appointment?.email });
      setNotification({ message: 'Cannot send email: Missing appointment data or email.', type: 'error' });
      setTimeout(() => setNotification(null), 5000);
      return false;
    }

    const trimmedEmail = appointment.email.trim();
    if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
      console.warn(`Invalid or empty email for appointment ${appointment.id}: ${appointment.email}`);
      setNotification({
        message: `Cannot send ${action} email: Invalid or empty email for ${appointment.clientName || 'Unknown'}.`,
        type: 'error'
      });
      setTimeout(() => setNotification(null), 5000);
      return false;
    }

    try {
      const emailParams = {
        name: appointment.clientName || 'Unknown',
        date: formatDate(appointment.date) || 'Unknown',
        time: appointment.time || 'Unknown',
        to_email: appointment.email.trim(),
        email: appointment.email.trim(),
        action: action === 'confirmed' ? 'confirmed' : action === 'deleted' ? 'deleted' : 'cancelled',
        reason: action === 'cancelled' ? (await checkIfDateIsBlocked(appointment.date)).reason || 'The appointment date has been blocked.' : '',
      };

      if (!emailParams.to_email || !emailParams.email) {
        throw new Error('Email address is empty after processing');
      }

      await emailjs.send('service_l920egs', 'template_iremp8a', emailParams);
      console.log(`Email sent to ${trimmedEmail} for ${action} appointment:`, emailParams);
      setNotification({
        message: `Email sent to ${trimmedEmail} for ${action} appointment.`,
        type: 'success'
      });
      setTimeout(() => setNotification(null), 5000);
      return true;
    } catch (error) {
      console.error(`Error sending ${action} email:`, error);
      setNotification({
        message: `Failed to send ${action} email: ${error.message}`,
        type: 'error'
      });
      setTimeout(() => setNotification(null), 5000);
      return false;
    }
  }, [formatDate, isValidEmail, checkIfDateIsBlocked]);

  // Cancel appointment and send email
  const cancelAppointmentAndSendEmail = useCallback(async (appointment) => {
    if (!appointment?.id) {
      console.error('Invalid appointment data for cancellation');
      setNotification({ message: 'Cannot cancel appointment: Invalid data.', type: 'error' });
      setTimeout(() => setNotification(null), 5000);
      return false;
    }

    try {
      const appointmentRef = doc(db, 'appointments/data/bookings', appointment.id);
      await updateDoc(appointmentRef, { status: 'cancelled', cancelledAt: new Date().toISOString() });
      const emailSent = await sendEmailNotification(appointment, 'cancelled');
      if (emailSent) {
        sendPhoneNotification(appointment, 'cancelled');
        setNotification({
          message: `Appointment on ${formatDate(appointment.date)} at ${appointment.time} cancelled and patient notified.`,
          type: 'success'
        });
        setTimeout(() => setNotification(null), 5000);
      }
      return emailSent;
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      setNotification({
        message: `Failed to cancel appointment: ${error.message}`,
        type: 'error'
      });
      setTimeout(() => setNotification(null), 5000);
      return false;
    }
  }, [formatDate, sendPhoneNotification, sendEmailNotification]);

  // Calculate PID data
  const calculatePidData = useCallback((appointmentsList) => {
    const pidData = appointmentsList.reduce((acc, app) => {
      if (app.status === 'deleted') return acc;
      const pid = app.pid || 'Unknown';
      if (!app.pid) console.warn('Missing PID for appointment:', app.id);
      if (!acc[pid]) {
        acc[pid] = {
          pid,
          clientNames: new Set(),
          emails: new Set(),
          phones: new Set(),
          ages: new Set(),
          medicalHistories: new Set(),
          medicalHistoryMessages: new Set(),
          consultationCount: 0,
          appointments: [],
          location: app.location || 'Unknown',
        };
      }
      acc[pid].clientNames.add(app.clientName || 'Unknown');
      if (app.email && isValidEmail(app.email)) acc[pid].emails.add(app.email);
      acc[pid].phones.add(app.phone || 'Unknown');
      if (app.age) acc[pid].ages.add(app.age);
      if (app.medicalHistory) acc[pid].medicalHistories.add(app.medicalHistory);
      if (app.medicalHistoryMessage) acc[pid].medicalHistoryMessages.add(app.medicalHistoryMessage);
      acc[pid].consultationCount += 1;
      acc[pid].appointments.push({ ...app, formattedDate: formatDate(app.date) });
      return acc;
    }, {});

    return Object.values(pidData).map(data => ({
      ...data,
      clientNames: Array.from(data.clientNames).join(', '),
      emails: Array.from(data.emails).join(', ') || 'N/A',
      phones: Array.from(data.phones).join(', ') || 'Unknown',
      ages: Array.from(data.ages).join(', ') || 'N/A',
      medicalHistories: Array.from(data.medicalHistories).join(', ') || 'None',
      medicalHistoryMessages: Array.from(data.medicalHistoryMessages).join('; ') || 'None',
      appointments: data.appointments.sort((a, b) => new Date(`${b.date} ${b.time}`) - new Date(`${a.date} ${a.time}`))
    }));
  }, [formatDate, isValidEmail]);

  // Fetch appointments
  useEffect(() => {
    const fetchAppointments = async () => {
      setLoading(true);
      try {
        const appointmentsRef = collection(db, 'appointments/data/bookings');
        const q = query(appointmentsRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const appointmentsList = snapshot.docs.map(doc => {
          const data = doc.data();
          if (!data.pid) console.warn('Missing PID for booking:', doc.id);
          if (!data.location) console.warn('Missing location for booking:', doc.id);
          return {
            id: doc.id,
            clientName: data.name || 'Unknown',
            status: data.status || 'pending',
            pid: data.pid || 'Unknown',
            date: data.date || '',
            time: data.time || '',
            appointmentType: data.appointmentType || 'Consultation',
            phone: data.phone || 'Unknown',
            email: data.email || '',
            age: data.age || '',
            medicalHistory: data.medicalHistory || '',
            medicalHistoryMessage: data.medicalHistoryMessage || '',
            location: data.location || 'Unknown',
          };
        });
        setAppointments(calculatePidData(appointmentsList));
      } catch (error) {
        console.error('Error fetching appointments:', error);
        setNotification({ message: `Failed to fetch appointments: ${error.message}`, type: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchAppointments();
  }, [calculatePidData]);

  // Real-time listener for appointments
  useEffect(() => {
    const appointmentsRef = collection(db, 'appointments/data/bookings');
    const q = query(appointmentsRef, orderBy('createdAt', 'desc'));
    let hasInitialized = false;

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const appointmentsList = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          clientName: data.name || 'Unknown',
          status: data.status || 'pending',
          pid: data.pid || 'Unknown',
          date: data.date || '',
          time: data.time || '',
          appointmentType: data.appointmentType || 'Consultation',
          phone: data.phone || 'Unknown',
          email: data.email || '',
          age: data.age || '',
          medicalHistory: data.medicalHistory || '',
          medicalHistoryMessage: data.medicalHistoryMessage || '',
          location: data.location || 'Unknown',
        };
      });

      setAppointments(calculatePidData(appointmentsList));

      if (!hasInitialized) {
        hasInitialized = true;
        return;
      }

      const uniqueDates = [...new Set(appointmentsList.map(app => app.date))];
      for (const date of uniqueDates) {
        const { blocked } = await checkIfDateIsBlocked(date);
        if (blocked) {
          await deleteBlockedSchedule(date);
          const affectedAppointments = appointmentsList.filter(app => app.date === date && app.status !== 'cancelled' && app.status !== 'deleted');
          for (const appointment of affectedAppointments) {
            await cancelAppointmentAndSendEmail(appointment);
          }
        }
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' && change.doc.data().status !== 'deleted') {
          const newAppointment = change.doc.data();
          if (notificationSound) {
            notificationSound.play().catch(error => console.warn('Notification sound error:', error));
          }
          setNotification({
            message: `New appointment booked by ${newAppointment.name || 'Unknown'} for ${formatDate(newAppointment.date)}`,
            type: 'success'
          });
          setTimeout(() => setNotification(null), 5000);
        }
      });
    }, (error) => {
      console.error('Error in real-time listener:', error);
      setNotification({ message: `Error receiving real-time updates: ${error.message}`, type: 'error' });
      setTimeout(() => setNotification(null), 5000);
    });

    return () => unsubscribe();
  }, [calculatePidData, formatDate, notificationSound, checkIfDateIsBlocked, deleteBlockedSchedule, cancelAppointmentAndSendEmail]);

  // Real-time listener for blocked periods
  useEffect(() => {
    const blockedPeriodsRef = doc(db, 'settings', 'blockedPeriods');
    const unsubscribe = onSnapshot(blockedPeriodsRef, async (docSnap) => {
      if (!docSnap.exists()) return;
      const periods = docSnap.data().periods || [];
      const appointmentsRef = collection(db, 'appointments/data/bookings');
      const q = query(appointmentsRef, where('status', 'not-in', ['cancelled', 'deleted']));
      const snapshot = await getDocs(q);
      const appointmentsList = snapshot.docs.map(doc => ({
        id: doc.id,
        date: doc.data().date,
        time: doc.data().time,
        clientName: doc.data().name || 'Unknown',
        email: doc.data().email || '',
        location: doc.data().location || 'Unknown',
        status: doc.data().status || 'pending',
      }));

      for (const period of periods) {
        const blockStart = new Date(period.startDate);
        const blockEnd = period.type === 'day' ? blockStart : new Date(period.endDate);
        const affectedAppointments = appointmentsList.filter(app => {
          const appDate = new Date(app.date);
          return (
            appDate >= blockStart &&
            appDate <= blockEnd &&
            app.status !== 'cancelled' &&
            app.status !== 'deleted'
          );
        });

        for (const appointment of affectedAppointments) {
          await cancelAppointmentAndSendEmail(appointment);
          await deleteBlockedSchedule(appointment.date);
        }
      }
    }, (error) => {
      console.error('Error in blocked periods listener:', error);
      setNotification({ message: `Error monitoring blocked periods: ${error.message}`, type: 'error' });
      setTimeout(() => setNotification(null), 5000);
    });

    return () => unsubscribe();
  }, [cancelAppointmentAndSendEmail, deleteBlockedSchedule]);

  // Handle status update
  const handleStatusUpdate = useCallback(async (appointmentId, newStatus) => {
    try {
      const appointment = appointments.flatMap(data => data.appointments).find(app => app.id === appointmentId);
      if (!appointment) {
        setNotification({ message: 'Appointment not found.', type: 'error' });
        setTimeout(() => setNotification(null), 5000);
        return;
      }

      if (newStatus === 'confirmed' && !isValidEmail(appointment.email)) {
        setNotification({
          message: `Cannot confirm appointment: Invalid or missing email for ${appointment.clientName || 'Unknown'}.`,
          type: 'error'
        });
        setTimeout(() => setNotification(null), 5000);
        return;
      }

      const appointmentRef = doc(db, 'appointments/data/bookings', appointmentId);
      await updateDoc(appointmentRef, { status: newStatus });
      setAppointments(prev => calculatePidData(
        prev.flatMap(data => data.appointments).map(app => app.id === appointmentId ? { ...app, status: newStatus } : app)
      ));

      if (newStatus === 'confirmed') {
        const emailSent = await sendEmailNotification(appointment, 'confirmed');
        if (emailSent) {
          sendPhoneNotification(appointment, 'confirmed');
        }
      }

      setNotification({
        message: `Appointment status updated to ${newStatus}.`,
        type: 'success'
      });
      setTimeout(() => setNotification(null), 5000);
    } catch (error) {
      console.error('Error updating appointment status:', error);
      setNotification({
        message: `Failed to update appointment status: ${error.message}`,
        type: 'error'
      });
      setTimeout(() => setNotification(null), 5000);
    }
  }, [appointments, calculatePidData, sendPhoneNotification, sendEmailNotification]);

  // Handle soft delete
  const handleDelete = useCallback(async (appointmentId) => {
    try {
      const appointment = appointments.flatMap(data => data.appointments).find(app => app.id === appointmentId);
      if (!appointment) {
        setNotification({ message: 'Appointment not found.', type: 'error' });
        setTimeout(() => setNotification(null), 5000);
        return;
      }
      if (!isFutureAppointment(appointment)) {
        setNotification({ message: 'Cannot delete past appointments.', type: 'error' });
        setTimeout(() => setNotification(null), 5000);
        return;
      }
      if (!isValidEmail(appointment.email)) {
        setNotification({
          message: `Cannot delete appointment: Invalid or missing email for ${appointment.clientName || 'Unknown'}.`,
          type: 'error'
        });
        setTimeout(() => setNotification(null), 5000);
        return;
      }

      const appointmentRef = doc(db, 'appointments/data/bookings', appointmentId);
      await updateDoc(appointmentRef, { status: 'deleted', deletedAt: new Date().toISOString() });

      const isSlotAvailable = await checkSlotAvailability(appointment.date, appointment.time, appointment.location);
      const emailSent = await sendEmailNotification(appointment, 'deleted');
      if (emailSent) {
        setAppointments(prev => calculatePidData(
          prev.flatMap(data => data.appointments).map(app => app.id === appointmentId ? { ...app, status: 'deleted' } : app)
        ));

        sendPhoneNotification(appointment, 'deleted');
        if (isSlotAvailable) {
          setNotification({
            message: `Appointment deleted and slot ${appointment.time} on ${formatDate(appointment.date)} is now available.`,
            type: 'success'
          });
          setTimeout(() => setNotification(null), 5000);
        }
        if (selectedPid === appointment.pid) setSelectedPid(null);
        if (selectedPatientDetails && selectedPatientDetails.pid === appointment.pid) setSelectedPatientDetails(null);
        setDeleteConfirmation({ isOpen: false, appointmentId: null });
      }
    } catch (error) {
      console.error('Error marking appointment as deleted:', error);
      setNotification({ message: `Failed to delete appointment: ${error.message}`, type: 'error' });
      setTimeout(() => setNotification(null), 5000);
    }
  }, [appointments, calculatePidData, isFutureAppointment, selectedPid, selectedPatientDetails, sendPhoneNotification, checkSlotAvailability, formatDate, sendEmailNotification]);

  // Handle bulk delete
  const handleBulkDelete = useCallback(async (ids) => {
    try {
      const allAppointments = appointments.flatMap(data => data.appointments);
      const validAppointments = ids.map(id => allAppointments.find(app => app.id === id)).filter(app => app);
      const futureAppointments = validAppointments.filter(app => isFutureAppointment(app) && isValidEmail(app.email));
      
      if (!futureAppointments.length) {
        setNotification({
          message: 'No valid future appointments with valid emails selected for deletion.',
          type: 'error'
        });
        setTimeout(() => setNotification(null), 5000);
        return;
      }

      const deletedSlots = [];
      const failedDeletions = [];
      await Promise.all(futureAppointments.map(async appointment => {
        try {
          const appointmentRef = doc(db, 'appointments/data/bookings', appointment.id);
          await updateDoc(appointmentRef, { status: 'deleted', deletedAt: new Date().toISOString() });
          const isSlotAvailable = await checkSlotAvailability(appointment.date, appointment.time, appointment.location);
          const emailSent = await sendEmailNotification(appointment, 'deleted');
          if (emailSent) {
            if (isSlotAvailable) {
              deletedSlots.push(`${appointment.time} on ${formatDate(appointment.date)}`);
            }
            sendPhoneNotification(appointment, 'deleted');
          } else {
            failedDeletions.push(appointment.clientName || 'Unknown');
          }
        } catch (error) {
          console.error(`Error deleting appointment ${appointment.id}:`, error);
          failedDeletions.push(appointment.clientName || 'Unknown');
        }
      }));

      if (failedDeletions.length > 0) {
        setNotification({
          message: `Failed to delete appointments for ${failedDeletions.join(', ')} due to email issues.`,
          type: 'error'
        });
        setTimeout(() => setNotification(null), 5000);
        return;
      }

      setAppointments(prev => calculatePidData(
        prev.flatMap(data => data.appointments).map(app => ids.includes(app.id) ? { ...app, status: 'deleted' } : app)
      ));
      setDeleteConfirmation({ isOpen: false, appointmentId: null });
      setNotification({
        message: `Successfully marked ${futureAppointments.length} appointment(s) as deleted. ${deletedSlots.length > 0 ? `Slots ${deletedSlots.join(', ')} are now available.` : ''}`,
        type: 'success'
      });
      setTimeout(() => setNotification(null), 5000);
    } catch (error) {
      console.error('Error marking appointments as deleted:', error);
      setNotification({ message: `Failed to delete appointments: ${error.message}`, type: 'error' });
      setTimeout(() => setNotification(null), 5000);
    }
  }, [appointments, calculatePidData, isFutureAppointment, sendPhoneNotification, checkSlotAvailability, formatDate, sendEmailNotification]);

  // Handle view details and patient details
  const handleViewDetails = useCallback((pid) => {
    if (pid === 'Unknown' || !pid) return;
    setSelectedPid(pid);
  }, []);

  const handleViewPatientDetails = useCallback((pid) => {
    if (pid === 'Unknown' || !pid) return;
    const patientData = appointments.find(data => data.pid === pid);
    if (patientData) {
      setSelectedPatientDetails(patientData);
      setSelectedPid(null);
    }
  }, [appointments]);

  const handleBackToList = useCallback(() => {
    setSelectedPid(null);
    setSelectedPatientDetails(null);
  }, []);

  // Filter appointments by date range
  const filterByDateRange = useCallback((appointmentData) => {
    if (!startDate && !endDate) return true;
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    return appointmentData.appointments.some(app => {
      const appDate = new Date(app.date);
      if (isNaN(appDate.getTime())) return false;
      if (start && end) return appDate >= start && appDate <= end;
      if (start) return appDate >= start;
      if (end) return appDate <= end;
      return true;
    });
  }, [startDate, endDate]);

  // Memoized filtered appointments
  const filteredAppointments = useMemo(() => appointments.filter(appointment => {
    const matchesFilter = filter === 'all' || appointment.appointments.some(app => app.status === filter);
    const matchesSearch = !searchTerm || (
      appointment.clientNames.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointment.pid.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return matchesFilter && matchesSearch && filterByDateRange(appointment);
  }), [appointments, filter, searchTerm, filterByDateRange]);

  // Get PID appointments
  const getPidAppointments = useCallback((pid) => {
    const pidData = appointments.find(data => data.pid === pid);
    return pidData ? pidData.appointments.sort((a, b) => {
      const isFutureA = isFutureAppointment(a);
      const isFutureB = isFutureAppointment(b);
      if (!isFutureA && isFutureB) return 1;
      return new Date(`${b.date} ${b.time}`) - new Date(`${a.date} ${a.time}`);
    }) : [];
  }, [appointments, isFutureAppointment]);

  const getStatusColor = useCallback((status) => ({
    confirmed: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    cancelled: 'bg-red-100 text-red-800',
    deleted: 'bg-gray-100 text-gray-800'
  }[status] || 'bg-gray-100 text-gray-800'), []);

  // Reusable StatusBadge component
  const StatusBadge = ({ status }) => (
    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(status)}`}>
      {status}
    </span>
  );

  // Reusable ActionButtons component
  const ActionButtons = ({ appointment, isDetailView = false }) => (
    <div className="flex justify-center space-x-2">
      {!isDetailView && (
        <button
          onClick={() => handleViewDetails(appointment.pid)}
          className="p-1 text-gray-600 hover:text-gray-800 transition-colors"
          title="View PID Appointments"
          aria-label="View PID Appointments"
          disabled={!appointment.pid || appointment.pid === 'Unknown'}
        >
          <Eye size={20} />
        </button>
      )}
      <button
        onClick={() => handleViewPatientDetails(appointment.pid)}
        className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
        title="View Patient Details"
        aria-label="View Patient Details"
        disabled={!appointment.pid || appointment.pid === 'Unknown'}
      >
        <Eye size={20} />
      </button>
      <button
        onClick={() => handleStatusUpdate(appointment.id, 'confirmed')}
        className="p-1 text-green-600 hover:opacity-80 transition-opacity"
        title="Approve Appointment"
        aria-label="Approve Appointment"
        disabled={appointment.status === 'deleted' || !isValidEmail(appointment.email)}
      >
        <ThumbsUp size={20} />
      </button>
      {isFutureAppointment(appointment) && appointment.status !== 'deleted' && (
        <button
          onClick={() => setDeleteConfirmation({ isOpen: true, appointmentId: appointment.id })}
          className="p-1 hover:opacity-80 transition-opacity"
          title="Delete Appointment"
          aria-label="Delete Appointment"
          style={{ color: currentTheme.destructive }}
          disabled={!isValidEmail(appointment.email)}
        >
          <Trash2 size={20} />
        </button>
      )}
    </div>
  );

  // Patient Details View
  const PatientDetailsView = useMemo(() => {
    if (!selectedPatientDetails) return null;

    return (
      <div className="rounded-lg shadow-sm overflow-hidden" style={{ backgroundColor: currentTheme.surface, border: `1px solid ${currentTheme.border}` }}>
        <div className="px-4 py-3 border-b" style={{ backgroundColor: currentTheme.secondary, borderColor: currentTheme.border }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CustomButton
                onClick={handleBackToList}
                variant="secondary"
                className="p-1"
                icon={() => <ArrowLeft size={20} />}
                aria-label="Back to appointment list"
              />
              <h3 className="text-lg font-medium" style={{ color: currentTheme.text.primary }}>
                Patient Details for PID: {selectedPatientDetails.pid}
              </h3>
            </div>
            <CustomButton
              onClick={handleBackToList}
              variant="secondary"
              aria-label="Close patient details"
            >
              Close
            </CustomButton>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-medium mb-2" style={{ color: currentTheme.text.secondary }}>Patient Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="font-medium" style={{ color: currentTheme.text.primary }}>PID: </span>
                  <span style={{ color: currentTheme.text.secondary }}>{selectedPatientDetails.pid}</span>
                </div>
                <div>
                  <span className="font-medium" style={{ color: currentTheme.text.primary }}>Client Name(s): </span>
                  <span style={{ color: currentTheme.text.secondary }}>{selectedPatientDetails.clientNames}</span>
                </div>
                <div>
                  <span className="font-medium" style={{ color: currentTheme.text.primary }}>Phone: </span>
                  <span style={{ color: currentTheme.text.secondary }}>{selectedPatientDetails.phones}</span>
                </div>
                <div>
                  <span className="font-medium" style={{ color: currentTheme.text.primary }}>Email: </span>
                  <span style={{ color: currentTheme.text.secondary }}>{selectedPatientDetails.emails}</span>
                </div>
                <div>
                  <span className="font-medium" style={{ color: currentTheme.text.primary }}>Age: </span>
                  <span style={{ color: currentTheme.text.secondary }}>{selectedPatientDetails.ages}</span>
                </div>
                <div>
                  <span className="font-medium" style={{ color: currentTheme.text.primary }}>Total Consultations: </span>
                  <span style={{ color: currentTheme.text.secondary }}>{selectedPatientDetails.consultationCount}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="font-medium" style={{ color: currentTheme.text.primary }}>Medical History: </span>
                  <span style={{ color: currentTheme.text.secondary }}>{selectedPatientDetails.medicalHistories}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="font-medium" style={{ color: currentTheme.text.primary }}>Medical History Notes: </span>
                  <span style={{ color: currentTheme.text.secondary }}>{selectedPatientDetails.medicalHistoryMessages}</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2" style={{ color: currentTheme.text.secondary }}>
                Appointment History
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full" style={{ color: currentTheme.text.primary }}>
                  <thead>
                    <tr style={{ backgroundColor: currentTheme.secondary, borderBottom: `1px solid ${currentTheme.border}` }}>
                      <th className="px-4 py-2 text-left">Client Name</th>
                      <th className="px-4 py-2 text-left">Date & Time</th>
                      <th className="px-4 py-2 text-left">Type</th>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPatientDetails.appointments.map(appointment => (
                      <tr key={appointment.id} className="border-b" style={{ borderColor: currentTheme.border }}>
                        <td className="px-4 py-2">{appointment.clientName}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <Calendar size={16} style={{ color: currentTheme.text.secondary }} />
                            <span>{appointment.formattedDate} {appointment.time}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2">{appointment.appointmentType || 'Consultation'}</td>
                        <td className="px-4 py-2">
                          <StatusBadge status={appointment.status} />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <ActionButtons appointment={appointment} isDetailView={true} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }, [selectedPatientDetails, currentTheme, handleBackToList, formatDate, isFutureAppointment, handleStatusUpdate, handleDelete, handleViewPatientDetails]);

  // PID Detail View
  const PidDetailView = useMemo(() => {
    const pidAppointments = getPidAppointments(selectedPid);
    if (!selectedPid || !pidAppointments.length) return null;

    return (
      <div className="rounded-lg shadow-sm overflow-hidden" style={{ backgroundColor: currentTheme.surface, border: `1px solid ${currentTheme.border}` }}>
        <div className="px-4 py-3 border-b" style={{ backgroundColor: currentTheme.secondary, borderColor: currentTheme.border }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CustomButton
                onClick={handleBackToList}
                variant="secondary"
                className="p-1"
                icon={() => <ArrowLeft size={20} />}
                aria-label="Back to appointment list"
              />
              <h3 className="text-lg font-medium" style={{ color: currentTheme.text.primary }}>
                Appointments for PID: {selectedPid}
              </h3>
            </div>
            <CustomButton
              onClick={handleBackToList}
              variant="secondary"
              aria-label="Close PID details"
            >
              Close
            </CustomButton>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          <div className="space-y-4">
            <h4 className="text-sm font-medium mb-2" style={{ color: currentTheme.text.secondary }}>
              Total Consultations: {pidAppointments.length}
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full" style={{ color: currentTheme.text.primary }}>
                <thead>
                  <tr style={{ backgroundColor: currentTheme.secondary, borderBottom: `1px solid ${currentTheme.border}` }}>
                    <th className="px-4 py-2 text-left">Client Name</th>
                    <th className="px-4 py-2 text-left">Date & Time</th>
                    <th className="px-4 py-2 text-left">Type</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pidAppointments.map(appointment => (
                    <tr key={appointment.id} className="border-b" style={{ borderColor: currentTheme.border }}>
                      <td className="px-4 py-2">{appointment.clientName}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <Calendar size={16} style={{ color: currentTheme.text.secondary }} />
                          <span>{appointment.formattedDate} {appointment.time}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2">{appointment.appointmentType || 'Consultation'}</td>
                      <td className="px-4 py-2">
                        <StatusBadge status={appointment.status} />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <ActionButtons appointment={appointment} isDetailView={true} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }, [selectedPid, getPidAppointments, currentTheme, handleBackToList, formatDate, isFutureAppointment, handleStatusUpdate, handleDelete, handleViewPatientDetails]);

  return (
    <div className="p-0 sm:p-0 w-full max-w-[1400px] mx-auto" style={{ color: currentTheme.text.primary }}>
      <CustomDeleteConfirmation
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, appointmentId: null })}
        onConfirm={() => handleDelete(deleteConfirmation.appointmentId)}
        title="Delete Appointment"
        message="Are you sure you want to mark this appointment as deleted? This action cannot be undone."
      />

      {notification && (
        <div
          className="fixed top-2 right-2 sm:top-4 sm:right-4 p-3 sm:p-4 rounded-lg shadow-lg z-50"
          style={{
            minWidth: '280px',
            maxWidth: '90vw',
            animation: 'slideIn 0.5s ease-out',
            backgroundColor: notification.type === 'success' ? currentTheme.success.light : currentTheme.error.light,
            color: notification.type === 'success' ? currentTheme.success.dark : currentTheme.error.dark,
            border: `2px solid ${notification.type === 'success' ? currentTheme.success.dark : currentTheme.error.dark}`
          }}
        >
          <div className="flex items-center">
            <div className="mr-2 text-base sm:text-lg">
              {notification.type === 'success' ? '🔔' : '⚠️'}
            </div>
            <div className="font-medium text-sm sm:text-base">{notification.message}</div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 sm:py-10" style={{ color: currentTheme.text.secondary }}>
          <p className="text-sm sm:text-base">Loading appointments...</p>
        </div>
      ) : (
        <>
          {selectedPatientDetails ? (
            PatientDetailsView
          ) : selectedPid ? (
            PidDetailView
          ) : (
            <>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="w-full sm:w-auto flex-grow">
                  <CustomSearch
                    placeholder="Search by Client Name or PID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                    aria-label="Search appointments"
                  />
                </div>
                <div className="w-full sm:w-48">
                  <CustomSelect
                    options={[
                      { value: 'all', label: 'All Status' },
                      { value: 'confirmed', label: 'Confirmed' },
                      { value: 'pending', label: 'Pending' },
                      { value: 'cancelled', label: 'Cancelled' }
                    ]}
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="w-full"
                    aria-label="Filter by status"
                  />
                </div>
                <div className="w-full sm:w-2/5 flex gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="border rounded-lg p-2 w-full"
                    style={{ borderColor: currentTheme.border }}
                    placeholder="Start Date"
                    title="Select start date"
                    aria-label="Start date"
                  />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="border rounded-lg p-2 w-full"
                    style={{ borderColor: currentTheme.border }}
                    placeholder="End Date"
                    title="Select end date"
                    aria-label="End date"
                  />
                </div>
              </div>

              <div className="overflow-hidden rounded-lg shadow">
                <CustomTable
                  headers={[
                    'Client Name(s)',
                    'PID',
                    'Consultation Count',
                    'Latest Appointment',
                    'Consultation Type',
                    'Status',
                    'Actions'
                  ]}
                  onBulkDelete={handleBulkDelete}
                >
                  {filteredAppointments.map((appointmentData) => {
                    const latestAppointment = appointmentData.appointments[0];
                    const consultationCount = appointmentData.consultationCount || 0;
                    return (
                      <tr key={appointmentData.pid} id={appointmentData.pid}>
                        <td>
                          <div className="flex items-center gap-2">
                            <span>{appointmentData.clientNames || 'Unknown'}</span>
                          </div>
                        </td>
                        <td>
                          <button
                            onClick={() => consultationCount > 1 ? handleViewDetails(appointmentData.pid) : handleViewPatientDetails(appointmentData.pid)}
                            className="text-blue-600 hover:underline"
                            disabled={!appointmentData.pid || appointmentData.pid === 'Unknown'}
                            aria-label={consultationCount > 1 ? `View appointments for PID ${appointmentData.pid}` : `View patient details for PID ${appointmentData.pid}`}
                          >
                            {appointmentData.pid || '-'}
                          </button>
                        </td>
                        <td>
                          <span>{consultationCount}</span>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <Calendar size={16} style={{ color: currentTheme.text.secondary }} />
                            <span>{latestAppointment ? `${latestAppointment.formattedDate} ${latestAppointment.time}` : '-'}</span>
                          </div>
                        </td>
                        <td>
                          <span>{latestAppointment ? latestAppointment.appointmentType : 'Consultation'}</span>
                        </td>
                        <td>
                          <StatusBadge status={latestAppointment ? latestAppointment.status : 'pending'} />
                        </td>
                        <td className="py-3 text-center">
                          {consultationCount === 0 ? (
                            <button
                              onClick={() => handleViewPatientDetails(latestAppointment.pid)}
                              className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                              title="View Patient Details"
                              aria-label="View Patient Details"
                              disabled={!latestAppointment.pid || latestAppointment.pid === 'Unknown'}
                            >
                              <Eye size={20} />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleViewDetails(latestAppointment.pid)}
                              className="p-1 text-gray-600 hover:text-gray-800 transition-colors"
                              title="View PID Appointments"
                              aria-label="View PID Appointments"
                              disabled={!latestAppointment.pid || latestAppointment.pid === 'Unknown'}
                            >
                              <Eye size={20} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </CustomTable>
              </div>

              {filteredAppointments.length === 0 && (
                <div className="text-center py-4 sm:py-6" style={{ color: currentTheme.text.secondary }}>
                  <p className="text-xs sm:text-sm">No appointments found matching your filters.</p>
                </div>
              )}
            </>
          )}
        </>
      )}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        table {
          border-collapse: collapse;
          width: 100%;
        }
        th, td {
          text-align: left;
          padding: 8px;
        }
      `}</style>
    </div>
  );
}

export default AppointmentsContent;