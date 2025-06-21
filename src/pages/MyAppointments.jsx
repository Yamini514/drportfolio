import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { db, auth } from '../firebase/config';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { format } from 'date-fns';
import { onAuthStateChanged } from 'firebase/auth';

function MyAppointments() {
  const { currentTheme } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchAppointments = async () => {
      if (!auth.currentUser) return;
      
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
        
        setAppointments(appointmentsList);
      } catch (error) {
        console.error('Error fetching appointments:', error);
      } finally {
        setLoadingAppointments(false);
      }
    };

    if (isAuthenticated) {
      fetchAppointments();
    }
  }, [isAuthenticated]);

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'text-green-500';
      case 'deleted':
        return 'text-red-500';
      case 'pending':
        return 'text-orange-500';
      default:
        return '';
    }
  };

  if (loading || loadingAppointments) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: currentTheme.background }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: currentTheme.primary }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8" style={{ backgroundColor: currentTheme.background }}>
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
                className="p-4 rounded-lg shadow-md"
                style={{ 
                  backgroundColor: currentTheme.surface,
                  borderColor: currentTheme.border,
                  color: currentTheme.text.primary
                }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">Date: {format(new Date(appointment.date), 'MMMM d, yyyy')}</p>
                    <p>Time: {appointment.time}</p>
                    <p>Location: {appointment.location}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold capitalize ${getStatusColor(appointment.status)}`}>
                      Status: {appointment.status}
                    </p>
                    <p>Type: {appointment.appointmentType}</p>
                    <p className="mt-2 text-sm" style={{ color: currentTheme.text.secondary }}>
                      Reason: {appointment.reasonForVisit}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MyAppointments;