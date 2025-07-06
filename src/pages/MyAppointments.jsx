import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { db, auth } from '../firebase/config';
import { collection, query, where, getDocs, orderBy, doc, deleteDoc, updateDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const MyAppointments = () => {
  const { currentTheme } = useTheme() || { 
    currentTheme: { 
      background: '#fff', 
      surface: '#fff', 
      border: '#ccc', 
      text: { primary: '#000', secondary: '#666' } 
    } 
  };
  const [appointments, setAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let unsubscribe;
    const fetchAppointments = async () => {
      if (!auth.currentUser) {
        setError('No authenticated user found.');
        setLoadingAppointments(false);
        return;
      }

      try {
        const appointmentsRef = collection(db, 'appointments/data/bookings');
        const q = query(
          appointmentsRef,
          where('email', '==', auth.currentUser.email),
          orderBy('date', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const appointmentsList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log('Fetched appointments:', appointmentsList);
        setAppointments(appointmentsList);

        unsubscribe = onSnapshot(q, (snapshot) => {
          const updatedAppointments = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          console.log('Real-time update:', updatedAppointments);
          setAppointments(updatedAppointments);
        }, (error) => {
          console.error('Real-time error:', error);
          setError('Failed to update appointments in real-time.');
        });
      } catch (error) {
        console.error('Error fetching appointments:', error);
        setError('Failed to load appointments. Check console for details.');
      } finally {
        setLoadingAppointments(false);
      }
    };

    fetchAppointments();
    return () => unsubscribe && unsubscribe();
  }, []);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return 'text-green-500';
      case 'canceled':
        return 'text-red-500';
      case 'pending':
        return 'text-orange-500';
      default:
        return '';
    }
  };

  const handleCancelAppointment = async (appointmentId, date, time, location) => {
    if (window.confirm('Are you sure you want to cancel this appointment?')) {
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        const userRole = userDoc.exists() ? userDoc.data().role || 'patient' : 'patient';
        const appointmentRef = doc(db, 'appointments/data/bookings', appointmentId);
        await updateDoc(appointmentRef, {
          status: 'canceled',
          canceledBy: auth.currentUser.email,
          canceledByRole: userRole,
          canceledAt: new Date().toISOString()
        });
        console.log('Appointment canceled:', appointmentId, 'by', auth.currentUser.email, 'role:', userRole);
      } catch (error) {
        console.error('Error canceling appointment:', error);
        setError('Failed to cancel appointment. Check console for details.');
      }
    }
  };

  const handleDeleteAppointment = async (appointmentId) => {
    if (window.confirm('Are you sure you want to permanently delete this appointment?')) {
      try {
        const appointmentRef = doc(db, 'appointments/data/bookings', appointmentId);
        await deleteDoc(appointmentRef);
        setAppointments(appointments.filter(apt => apt.id !== appointmentId));
        console.log('Appointment deleted:', appointmentId);
      } catch (error) {
        console.error('Error deleting appointment:', error);
        setError('Failed to delete appointment. Check console for details.');
      }
    }
  };

  const handleRescheduleAppointment = (location) => {
    navigate(`/bookappointment`);
  };

  if (loadingAppointments) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: currentTheme.background }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: currentTheme.primary }}></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-4 sm:p-6 lg:p-8 flex items-center justify-center" style={{ backgroundColor: currentTheme.background }}>
        <p className="text-center text-red-500" style={{ color: currentTheme.text.primary }}>{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8" style={{ backgroundColor: currentTheme.background }} role="main" aria-label="My Appointments List">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center" style={{ color: currentTheme.text.primary }}>
          My Appointments
        </h1>
        
        {appointments.length === 0 ? (
          <p className="text-center py-8" style={{ color: currentTheme.text.secondary }}>
            No appointments found.
          </p>
        ) : (
          <div className="space-y-4">
            {appointments.map((appointment) => (
              <div
                key={appointment.id}
                className="p-4 rounded-lg shadow-md flex justify-between items-start"
                style={{ 
                  backgroundColor: currentTheme.surface,
                  borderColor: currentTheme.border,
                  color: currentTheme.text.primary
                }}
              >
                <div>
                  <p className="font-semibold">Date: {format(new Date(appointment.date), 'MMMM d, yyyy')}</p>
                  <p>Time: {appointment.time || 'N/A'}</p>
                  <p>Location: {appointment.location || 'N/A'}</p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold capitalize ${getStatusColor(appointment.status)}`}>
                    Status: {appointment.status || 'Unknown'}
                  </p>
                  {appointment.status?.toLowerCase() === 'canceled' && appointment.canceledByRole === 'doctor' && (
                    <p className="text-sm" style={{ color: currentTheme.text.secondary }}>
                      Canceled By: Doctor
                    </p>
                  )}
                  <p>Type: {appointment.appointmentType || 'N/A'}</p>
                  <p className="mt-2 text-sm" style={{ color: currentTheme.text.secondary }}>
                    Reason: {appointment.reasonForVisit || 'Not specified'}
                  </p>
                  <div className="mt-2 flex gap-2 justify-end">
                    {appointment.status?.toLowerCase() !== 'canceled' && (
                      <button
                        onClick={() => handleCancelAppointment(appointment.id, appointment.date, appointment.time, appointment.location)}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                        aria-label={`Cancel appointment on ${format(new Date(appointment.date), 'MMMM d, yyyy')} at ${appointment.time || 'N/A'}`}
                      >
                        Cancel
                      </button>
                    )}
                    {appointment.status?.toLowerCase() === 'canceled' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRescheduleAppointment(appointment.location)}
                          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          aria-label={`Reschedule appointment at ${appointment.location || 'N/A'}`}
                        >
                          Reschedule
                        </button>
                        <button
                          onClick={() => handleDeleteAppointment(appointment.id)}
                          className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
                          aria-label={`Delete appointment on ${format(new Date(appointment.date), 'MMMM d, yyyy')} at ${appointment.time || 'N/A'}`}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyAppointments;
console.log('MyAppointments defined:', typeof MyAppointments === 'function');