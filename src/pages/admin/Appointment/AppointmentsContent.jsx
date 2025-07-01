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

  // Format date to DD-MMM-YYYY
  const formatDate = useCallback((dateStr) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateStr;
    }
  }, []);

  // Check if appointment is in the future
  const isFutureAppointment = useCallback((appointment) => {
    try {
      const appointmentDateTime = new Date(`${appointment.date} ${appointment.time}`);
      return appointmentDateTime > new Date();
    } catch (error) {
      console.error('Error parsing appointment date/time:', error);
      return false;
    }
  }, []);

  // Check if slot is available after deletion
  const checkSlotAvailability = useCallback(async (date, time, location) => {
    if (!location || location === 'Unknown') {
      console.warn('Missing location for slot availability check:', { date, time });
      setNotification({ message: 'Cannot verify slot availability: missing location.', type: 'error' });
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
  const checkIfDateIsBlocked = useCallback(async (dateStr, dayName) => {
    try {
      const blockedPeriodsDoc = await getDoc(doc(db, 'settings', 'blockedPeriods'));
      if (blockedPeriodsDoc.exists()) {
        const periods = blockedPeriodsDoc.data().periods || [];
        for (const period of periods) {
          if (period.type === 'day' && period.day === dayName.toLowerCase()) {
            const blockDate = new Date(period.startDate);
            if (blockDate.toDateString() === new Date(dateStr).toDateString()) {
              return { blocked: true, reason: period.reason || 'This date is blocked.' };
            }
          } else if (period.type === 'week' || period.type === 'month') {
            const blockStart = new Date(period.startDate);
            const blockEnd = new Date(period.endDate);
            if (new Date(dateStr) >= blockStart && new Date(dateStr) <= blockEnd) {
              return { blocked: true, reason: period.reason || 'This period is blocked.' };
            }
          }
        }
      }
      return { blocked: false, reason: '' };
    } catch (error) {
      console.error('Error checking blocked date:', error);
      setNotification({ message: 'Failed to check date availability. Please try again.', type: 'error' });
      setTimeout(() => setNotification(null), 5000);
      return { blocked: false, reason: '' };
    }
  }, []);

  // Automate deletion for blocked dates
  const automateBlockedDateDeletion = useCallback(async () => {
    try {
      const appointmentsRef = collection(db, 'appointments/data/bookings');
      const q = query(appointmentsRef, where('status', '!=', 'deleted'));
      const snapshot = await getDocs(q);
      const appointmentsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const uniqueDates = [...new Set(appointmentsList.map(app => app.date))];
      for (const date of uniqueDates) {
        const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
        const { blocked } = await checkIfDateIsBlocked(date, dayName);
        if (blocked) {
          const appointmentsToDelete = appointmentsList.filter(app => app.date === date);
          const deletePromises = appointmentsToDelete.map(async (app) => {
            await updateDoc(doc(db, 'appointments/data/bookings', app.id), { status: 'deleted', deletedAt: new Date().toISOString() });
            console.log(`Deleted appointment for blocked date: ${date}, appId: ${app.id}`);
          });
          await Promise.all(deletePromises);
          setNotification({ message: `Deleted appointments for blocked date: ${formatDate(date)}`, type: 'success' });
          setTimeout(() => setNotification(null), 5000);
        }
      }
    } catch (error) {
      console.error('Error automating blocked date deletion:', error);
      setNotification({ message: `Failed to automate blocked date deletion: ${error.message}`, type: 'error' });
      setTimeout(() => setNotification(null), 5000);
    }
  }, [formatDate, checkIfDateIsBlocked]);

  // Simulate sending phone notification
  const sendPhoneNotification = useCallback((appointment, action) => {
    const message = action === 'confirmed'
      ? `Your appointment on ${formatDate(appointment.date)} at ${appointment.time} has been confirmed.`
      : `Your appointment on ${formatDate(appointment.date)} at ${appointment.time} has been deleted and the slot is now available.`;
    console.log(`Sending SMS to ${appointment.phone || 'unknown phone'}: ${message}`);
    setNotification({ message: `Notified patient: ${message}`, type: 'success' });
    setTimeout(() => setNotification(null), 5000);
  }, [formatDate]);

  // Calculate PID data
  const calculatePidData = useCallback((appointmentsList) => {
    const pidData = appointmentsList.reduce((acc, app) => {
      if (app.status === 'deleted') return acc;
      const pid = app.pid || 'Unknown';
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
      acc[pid].clientNames.add(app.clientName);
      if (app.email) acc[pid].emails.add(app.email);
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
  }, [formatDate]);

  // Fetch appointments
  useEffect(() => {
    const fetchAppointments = async () => {
      setLoading(true);
      try {
        const appointmentsRef = collection(db, 'appointments/data/bookings');
        const q = query(appointmentsRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const appointmentsList = snapshot.docs.map(doc => ({
          id: doc.id,
          clientName: doc.data().name || 'Unknown',
          status: doc.data().status || 'pending',
          pid: doc.data().pid || 'Unknown',
          date: doc.data().date || '',
          time: doc.data().time || '',
          appointmentType: doc.data().appointmentType || 'Consultation',
          phone: doc.data().phone || 'Unknown',
          email: doc.data().email || '',
          age: doc.data().age || '',
          medicalHistory: doc.data().medicalHistory || '',
          medicalHistoryMessage: doc.data().medicalHistoryMessage || '',
          location: doc.data().location || 'Unknown',
        }));
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

  // Real-time listener with blocked date checking
  useEffect(() => {
    const appointmentsRef = collection(db, 'appointments/data/bookings');
    const q = query(appointmentsRef, orderBy('createdAt', 'desc'));
    let hasInitialized = false;

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const appointmentsList = snapshot.docs.map(doc => ({
        id: doc.id,
        clientName: doc.data().name || 'Unknown',
        status: doc.data().status || 'pending',
        pid: doc.data().pid || 'Unknown',
        date: doc.data().date || '',
        time: doc.data().time || '',
        appointmentType: doc.data().appointmentType || 'Consultation',
        phone: doc.data().phone || 'Unknown',
        email: doc.data().email || '',
        age: doc.data().age || '',
        medicalHistory: doc.data().medicalHistory || '',
        medicalHistoryMessage: doc.data().medicalHistoryMessage || '',
        location: doc.data().location || 'Unknown',
      }));

      setAppointments(calculatePidData(appointmentsList));

      if (!hasInitialized) {
        hasInitialized = true;
        return;
      }

      // Automate blocked date deletion
      await automateBlockedDateDeletion();

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' && change.doc.data().status !== 'deleted') {
          const newAppointment = change.doc.data();
          if (notificationSound) notificationSound.play().catch(error => console.warn('Notification sound error:', error));
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
    });

    return () => unsubscribe();
  }, [calculatePidData, formatDate, notificationSound, automateBlockedDateDeletion]);

  // Handle status update
  const handleStatusUpdate = useCallback(async (appointmentId, newStatus) => {
    try {
      const appointmentRef = doc(db, 'appointments/data/bookings', appointmentId);
      await updateDoc(appointmentRef, { status: newStatus });
      const updatedAppointments = appointments.flatMap(data => data.appointments).map(app =>
        app.id === appointmentId ? { ...app, status: newStatus } : app
      );
      setAppointments(calculatePidData(updatedAppointments));
      if (newStatus === 'confirmed') {
        const appointment = appointments.flatMap(data => data.appointments).find(app => app.id === appointmentId);
        sendPhoneNotification(appointment, 'confirmed');
      }
    } catch (error) {
      console.error('Error updating appointment status:', error);
      setNotification({ message: `Failed to update appointment status: ${error.message}`, type: 'error' });
    }
  }, [appointments, calculatePidData, sendPhoneNotification]);

  // Handle soft delete
  const handleDelete = useCallback(async (appointmentId) => {
    try {
      const appointment = appointments.flatMap(data => data.appointments).find(app => app.id === appointmentId);
      if (!appointment || !isFutureAppointment(appointment)) {
        setNotification({ message: 'Cannot delete past appointments.', type: 'error' });
        setTimeout(() => setNotification(null), 5000);
        return;
      }
      const appointmentRef = doc(db, 'appointments/data/bookings', appointmentId);
      await updateDoc(appointmentRef, { status: 'deleted', deletedAt: new Date().toISOString() });
  
      // New: Check if the appointment date is blocked and delete slots if blocked
      const dayName = new Date(appointment.date).toLocaleDateString('en-US', { weekday: 'long' });
      const { blocked } = await checkIfDateIsBlocked(appointment.date, dayName);
      if (blocked) {
        await deleteBlockedSchedule(appointment.date);
      }
  
      const isSlotAvailable = await checkSlotAvailability(appointment.date, appointment.time, appointment.location);
      const updatedAppointments = appointments.flatMap(data => data.appointments).map(app =>
        app.id === appointmentId ? { ...app, status: 'deleted' } : app
      );
      setAppointments(calculatePidData(updatedAppointments));
      sendPhoneNotification(appointment, 'deleted');
      if (isSlotAvailable) {
        setNotification({
          message: `Appointment deleted and slot ${appointment.time} on ${formatDate(appointment.date)} is now available.`,
          type: 'success'
        });
        setTimeout(() => setNotification(null), 5000);
      }
      setDeleteConfirmation({ isOpen: false, appointmentId: null });
    } catch (error) {
      console.error('Error marking appointment as deleted:', error);
      setNotification({ message: `Failed to delete appointment: ${error.message}`, type: 'error' });
    }
 

  }, [appointments, calculatePidData, isFutureAppointment, selectedPid, selectedPatientDetails, sendPhoneNotification, checkSlotAvailability, formatDate, checkIfDateIsBlocked, deleteBlockedSchedule]);

  // Handle bulk delete
  const handleBulkDelete = useCallback(async (ids) => {
    try {
      const allAppointments = appointments.flatMap(data => data.appointments);
      const futureAppointmentIds = ids.filter(id => {
        const app = allAppointments.find(app => app.id === id);
        return app && isFutureAppointment(app);
      });
      if (!futureAppointmentIds.length) {
        setNotification({ message: 'Cannot delete past appointments.', type: 'error' });
        setTimeout(() => setNotification(null), 5000);
        return;
      }
      await Promise.all(futureAppointmentIds.map(async id => {
        const appointment = allAppointments.find(app => app.id === id);
        await updateDoc(doc(db, 'appointments/data/bookings', id), { status: 'deleted', deletedAt: new Date().toISOString() });
        sendPhoneNotification(appointment, 'deleted');
      }));
      const updatedAppointments = appointments.flatMap(data => data.appointments).map(app =>
        futureAppointmentIds.includes(app.id) ? { ...app, status: 'deleted' } : app
      );
      setAppointments(calculatePidData(updatedAppointments));
      setDeleteConfirmation({ isOpen: false, appointmentId: null });
      setNotification({ message: `Successfully marked ${futureAppointmentIds.length} appointment(s) as deleted.`, type: 'success' });
      setTimeout(() => setNotification(null), 5000);
    } catch (error) {
      console.error('Error marking appointments as deleted:', error);
      setNotification({ message: `Failed to delete appointments: ${error.message}`, type: 'error' });
    }
  }, [appointments, calculatePidData, isFutureAppointment, sendPhoneNotification]);

  // Handle view details and patient details
  const handleViewDetails = useCallback((pid) => {
    if (pid === 'Unknown') return;
    setSelectedPid(pid);
  }, []);

  const handleViewPatientDetails = useCallback((pid) => {
    if (pid === 'Unknown') return;
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
      if (isFutureA && !isFutureB) return -1;
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

  // Reusable ActionButtons component with conditional view
  const ActionButtons = ({ appointment, isDetailView = false }) => {
    const hasConsultationData = appointment.medicalHistory || appointment.medicalHistoryMessage;
    const viewAction = hasConsultationData ? handleViewPatientDetails : handleViewDetails;
    const viewTitle = hasConsultationData ? 'View Patient Data' : 'View Appointments';
    const viewAriaLabel = hasConsultationData ? 'View patient data' : 'View appointments';

    return (
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
          onClick={() => viewAction(appointment.pid)}
          className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
          title={viewTitle}
          aria-label={viewAriaLabel}
          disabled={!appointment.pid || appointment.pid === 'Unknown'}
        >
          <Eye size={20} />
        </button>
        <button
          onClick={() => handleStatusUpdate(appointment.id, 'confirmed')}
          className="p-1 text-green-600 hover:opacity-80 transition-opacity"
          title="Approve Appointment"
          aria-label="Approve Appointment"
          disabled={appointment.status === 'deleted'}
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
          >
            <Trash2 size={20} />
          </button>
        )}
      </div>
    );
  };

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
            <CustomButton onClick={handleBackToList} variant="secondary" aria-label="Close patient details">
              Close
            </CustomButton>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-medium mb-2" style={{ color: currentTheme.text.secondary }}>Patient Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><span className="font-medium" style={{ color: currentTheme.text.primary }}>PID: </span><span style={{ color: currentTheme.text.secondary }}>{selectedPatientDetails.pid}</span></div>
                <div><span className="font-medium" style={{ color: currentTheme.text.primary }}>Client Name(s): </span><span style={{ color: currentTheme.text.secondary }}>{selectedPatientDetails.clientNames}</span></div>
                <div><span className="font-medium" style={{ color: currentTheme.text.primary }}>Phone: </span><span style={{ color: currentTheme.text.secondary }}>{selectedPatientDetails.phones}</span></div>
                <div><span className="font-medium" style={{ color: currentTheme.text.primary }}>Email: </span><span style={{ color: currentTheme.text.secondary }}>{selectedPatientDetails.emails}</span></div>
                <div><span className="font-medium" style={{ color: currentTheme.text.primary }}>Age: </span><span style={{ color: currentTheme.text.secondary }}>{selectedPatientDetails.ages}</span></div>
                <div><span className="font-medium" style={{ color: currentTheme.text.primary }}>Total Consultations: </span><span style={{ color: currentTheme.text.secondary }}>{selectedPatientDetails.consultationCount}</span></div>
                <div className="sm:col-span-2"><span className="font-medium" style={{ color: currentTheme.text.primary }}>Medical History: </span><span style={{ color: currentTheme.text.secondary }}>{selectedPatientDetails.medicalHistories}</span></div>
                <div className="sm:col-span-2"><span className="font-medium" style={{ color: currentTheme.text.primary }}>Medical History Notes: </span><span style={{ color: currentTheme.text.secondary }}>{selectedPatientDetails.medicalHistoryMessages}</span></div>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2" style={{ color: currentTheme.text.secondary }}>Appointment History</h4>
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
                        <td className="px-4 py-2"><div className="flex items-center gap-2"><Calendar size={16} style={{ color: currentTheme.text.secondary }} /><span>{appointment.formattedDate} {appointment.time}</span></div></td>
                        <td className="px-4 py-2">{appointment.appointmentType || 'Consultation'}</td>
                        <td className="px-4 py-2"><StatusBadge status={appointment.status} /></td>
                        <td className="px-4 py-2 text-center"><ActionButtons appointment={appointment} isDetailView={true} /></td>
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
  }, [selectedPatientDetails, currentTheme, handleBackToList, formatDate, isFutureAppointment, handleStatusUpdate, handleDelete]);

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
            <CustomButton onClick={handleBackToList} variant="secondary" aria-label="Close PID details">
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
                      <td className="px-4 py-2"><div className="flex items-center gap-2"><Calendar size={16} style={{ color: currentTheme.text.secondary }} /><span>{appointment.formattedDate} {appointment.time}</span></div></td>
                      <td className="px-4 py-2">{appointment.appointmentType || 'Consultation'}</td>
                      <td className="px-4 py-2"><StatusBadge status={appointment.status} /></td>
                      <td className="px-4 py-2 text-center"><ActionButtons appointment={appointment} isDetailView={true} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }, [selectedPid, getPidAppointments, currentTheme, handleBackToList, formatDate, isFutureAppointment, handleStatusUpdate, handleDelete]);

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
        <div className="fixed top-2 right-2 sm:top-4 sm:right-4 p-3 sm:p-4 rounded-lg shadow-lg z-50" style={{
          minWidth: '280px', maxWidth: '90vw', animation: 'slideIn 0.5s ease-out',
          backgroundColor: notification.type === 'success' ? currentTheme.success.light : currentTheme.error.light,
          color: notification.type === 'success' ? currentTheme.success.dark : currentTheme.error.dark,
          border: `2px solid ${notification.type === 'success' ? currentTheme.success.dark : currentTheme.error.dark}`
        }}>
          <div className="flex items-center">
            <div className="mr-2 text-base sm:text-lg">{notification.type === 'success' ? '🔔' : '⚠️'}</div>
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
                    { key: 'clientNames', label: 'Client Name(s)', className: 'text-left' },
                    { key: 'pid', label: 'PID', className: 'text-left' },
                    { key: 'consultationCount', label: 'Consultation Count', className: 'text-left' },
                    { key: 'latestAppointment', label: 'Latest Appointment', className: 'text-left' },
                    { key: 'appointmentType', label: 'Consultation Type', className: 'text-left' },
                    { key: 'status', label: 'Status', className: 'text-left' },
                    { key: 'actions', label: 'Actions', className: 'text-center' }
                  ]}
                  onBulkDelete={handleBulkDelete}
                >
                  {filteredAppointments.map((appointmentData) => {
                    const latestAppointment = appointmentData.appointments[0];
                    const consultationCount = appointmentData.consultationCount || 0;
                    return (
                      <tr key={appointmentData.pid} id={appointmentData.pid}>
                        <td className="px-4 py-2">{appointmentData.clientNames || 'Unknown'}</td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => consultationCount > 1 ? handleViewDetails(appointmentData.pid) : handleViewPatientDetails(appointmentData.pid)}
                            className="text-blue-600 hover:underline"
                            disabled={!appointmentData.pid || appointmentData.pid === 'Unknown'}
                            aria-label={consultationCount > 1 ? `View appointments for PID ${appointmentData.pid}` : `View patient details for PID ${appointmentData.pid}`}
                          >
                            {appointmentData.pid || '-'}
                          </button>
                        </td>
                        <td className="px-4 py-2">{appointmentData.consultationCount}</td>
                        <td className="px-4 py-2">
                        <td>
                          <span>{consultationCount}</span>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <Calendar size={16} style={{ color: currentTheme.text.secondary }} />
                            <span>{latestAppointment ? `${latestAppointment.formattedDate} ${latestAppointment.time}` : '-'}</span>
                          </div>
                        </td>

                        <td className="px-4 py-2">{latestAppointment ? latestAppointment.appointmentType : 'Consultation'}</td>
                        <td className="px-4 py-2"><StatusBadge status={latestAppointment ? latestAppointment.status : 'pending'} /></td>
                        <td className="px-4 py-2 text-center"><ActionButtons appointment={latestAppointment} /></td>

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
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        table {
          border-collapse: collapse;
          width: 100%;
        }
        th, td {
          text-align: left;
          padding: 8px;
        }
        th {
          ${Object.entries({
            'Client Name(s)': 'text-left',
            'PID': 'text-left',
            'Consultation Count': 'text-left',
            'Latest Appointment': 'text-left',
            'Consultation Type': 'text-left',
            'Status': 'text-left',
            'Actions': 'text-center'
          }).map(([key, align]) => `th:contains("${key}") { text-align: ${align}; }`).join('\n')}
        }
      `}</style>
    </div>
  );
};

export default AppointmentsContent;