import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, MapPin, Trash2, Check, Eye, ThumbsUp, ArrowLeft } from 'lucide-react';
import CustomSearch from '../../../components/CustomSearch';
import CustomButton from '../../../components/CustomButton';
import CustomTable from '../../../components/CustomTable';
import CustomSelect from '../../../components/CustomSelect';
import CustomDeleteConfirmation from '../../../components/CustomDeleteConfirmation';
import CustomInput from '../../../components/CustomInput';
import { collection, getDocs, updateDoc, doc, deleteDoc, onSnapshot, query, orderBy, where, setDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useTheme } from '../../../context/ThemeContext';

function AppointmentsContent() {
  const [appointments, setAppointments] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    appointmentId: null
  });
  const { currentTheme } = useTheme();
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [notification, setNotification] = useState(null);
  const [notificationSound] = useState(new Audio('/notifications.wav'));

  // Function to check if an appointment is in the future
  const isFutureAppointment = (appointment) => {
    try {
      const appointmentDateTime = new Date(`${appointment.date} ${appointment.time}`);
      const currentDateTime = new Date();
      return appointmentDateTime > currentDateTime;
    } catch (error) {
      console.error('Error parsing appointment date/time:', error);
      return false; // Default to false if date parsing fails
    }
  };

  // Fetch appointments from Firebase
  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const appointmentsRef = collection(db, 'appointments/data/bookings');
        const q = query(appointmentsRef);
        const snapshot = await getDocs(q);
        const appointmentsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          clientName: doc.data().name,
          status: doc.data().status || 'pending'
        }));
        setAppointments(appointmentsList);
      } catch (error) {
        console.error('Error fetching appointments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, []);

  // Real-time listener for appointments
  useEffect(() => {
    const appointmentsRef = collection(db, 'appointments/data/bookings');
    const q = query(appointmentsRef, orderBy('createdAt', 'desc'));
    let hasInitialized = false;

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const appointmentsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        clientName: doc.data().name,
        status: doc.data().status || 'pending'
      }));

      if (!hasInitialized) {
        hasInitialized = true;
        setAppointments(appointmentsList);
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const newAppointment = change.doc.data();
          try {
            notificationSound.currentTime = 0;
            notificationSound.play().catch(error => {
              if (error.name !== "NotAllowedError") {
                console.error('Notification sound error:', error);
              }
            });
          } catch (error) {
            console.error('Error playing notification:', error);
          }

          setNotification({
            message: `New appointment booked by ${newAppointment.name} for ${newAppointment.date} at ${newAppointment.time}`,
            type: 'success'
          });

          setTimeout(() => {
            setNotification(null);
          }, 5000);
        }
      });

      setAppointments(appointmentsList);
    });

    return () => unsubscribe();
  }, [notificationSound]);

  // Handle status update
  const handleStatusUpdate = async (appointmentId, newStatus) => {
    try {
      const appointmentRef = doc(db, 'appointments/data/bookings', appointmentId);
      await updateDoc(appointmentRef, {
        status: newStatus
      });

      setAppointments(prev =>
        prev.map(appointment =>
          appointment.id === appointmentId
            ? { ...appointment, status: newStatus }
            : appointment
        )
      );

      if (selectedAppointment && selectedAppointment.id === appointmentId) {
        setSelectedAppointment(prev => ({
          ...prev,
          status: newStatus
        }));
      }
    } catch (error) {
      console.error('Error updating appointment status:', error);
    }
  };

  // Handle delete
  const handleDelete = async (appointmentId) => {
    try {
      const appointment = appointments.find(app => app.id === appointmentId);
      if (!isFutureAppointment(appointment)) {
        setNotification({
          message: 'Cannot delete past appointments.',
          type: 'error'
        });
        setTimeout(() => {
          setNotification(null);
        }, 5000);
        return;
      }

      const adminDeletedRef = doc(db, 'appointments/admin/deletedAppointments', appointmentId);
      const appointmentRef = doc(db, 'appointments/data/bookings', appointmentId);
      const appointmentData = (await getDocs(appointmentRef)).data();

      await setDoc(adminDeletedRef, {
        ...appointmentData,
        deletedAt: new Date(),
        deletedBy: 'admin'
      });

      await updateDoc(appointmentRef, {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledBy: 'admin'
      });

      setAppointments(prev => prev.filter(appointment => appointment.id !== appointmentId));
      setDeleteConfirmation({ isOpen: false, appointmentId: null });

      if (selectedAppointment && selectedAppointment.id === appointmentId) {
        setSelectedAppointment(null);
      }
    } catch (error) {
      console.error('Error handling appointment deletion:', error);
    }
  };

  // Handle delete click
  const handleDeleteClick = (appointmentId) => {
    const appointment = appointments.find(app => app.id === appointmentId);
    if (!isFutureAppointment(appointment)) {
      setNotification({
        message: 'Cannot delete past appointments.',
        type: 'error'
      });
      setTimeout(() => {
        setNotification(null);
      }, 5000);
      return;
    }
    setDeleteConfirmation({
      isOpen: true,
      appointmentId
    });
  };

  // Handle bulk delete
  const handleBulkDelete = async (ids) => {
    try {
      const futureAppointmentIds = ids.filter(id => {
        const appointment = appointments.find(app => app.id === id);
        return isFutureAppointment(appointment);
      });

      if (futureAppointmentIds.length === 0) {
        setNotification({
          message: 'Cannot delete past appointments.',
          type: 'error'
        });
        setTimeout(() => {
          setNotification(null);
        }, 5000);
        return;
      }

      for (const id of futureAppointmentIds) {
        const appointmentRef = doc(db, 'appointments/data/bookings', id);
        const adminDeletedRef = doc(db, 'appointments/admin/deletedAppointments', id);
        const appointmentData = (await getDocs(appointmentRef)).data();

        await setDoc(adminDeletedRef, {
          ...appointmentData,
          deletedAt: new Date(),
          deletedBy: 'admin'
        });

        await updateDoc(appointmentRef, {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelledBy: 'admin'
        });
      }

      setAppointments(prev => prev.filter(appointment => !futureAppointmentIds.includes(appointment.id)));
      setDeleteConfirmation({ isOpen: false, appointmentId: null });
    } catch (error) {
      console.error('Error deleting appointments:', error);
    }
  };

  // View appointment details
  const handleViewDetails = (appointment) => {
    setSelectedAppointment(appointment);
  };

  // Back to appointment list
  const handleBackToList = () => {
    setSelectedAppointment(null);
  };

  const filteredAppointments = appointments?.filter(appointment => {
    const matchesFilter = filter === 'all' || appointment.status === filter;
    const matchesSearch = appointment.clientName?.toLowerCase().includes(searchTerm?.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status) => {
    switch(status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Individual Appointment Detail View Component
  const AppointmentDetailView = ({ appointment }) => {
    if (!appointment) return null;

    return (
      <div
        className="rounded-lg shadow-sm overflow-hidden"
        style={{
          backgroundColor: currentTheme.surface,
          border: `1px solid ${currentTheme.border}`
        }}
      >
        <div
          className="px-4 py-3 border-b"
          style={{
            backgroundColor: currentTheme.secondary,
            borderColor: currentTheme.border
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CustomButton
                onClick={handleBackToList}
                variant="secondary"
                className="p-1"
                icon={() => <ArrowLeft size={20} />}
              />
              <h3
                className="text-lg font-medium"
                style={{ color: currentTheme.text.primary }}
              >
                Appointment Details
              </h3>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(appointment.status)}`}>
                {appointment.status}
              </span>
              <CustomButton
                onClick={handleBackToList}
                variant="secondary"
              >
                Close
              </CustomButton>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h4
                  className="text-sm font-medium mb-2"
                  style={{ color: currentTheme.text.secondary }}
                >
                  Client Information
                </h4>
                <div
                  className="p-3 rounded-md"
                  style={{ backgroundColor: currentTheme.secondary }}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <User size={18} style={{ color: currentTheme.text.secondary }} />
                    <span
                      className="font-medium"
                      style={{ color: currentTheme.text.primary }}
                    >
                      {appointment.name}
                    </span>
                  </div>
                  {appointment.email && (
                    <p
                      className="text-sm mb-1 ml-7"
                      style={{ color: currentTheme.text.secondary }}
                    >
                      Email: {appointment.email}
                    </p>
                  )}
                  {appointment.phone && (
                    <p
                      className="text-sm ml-7"
                      style={{ color: currentTheme.text.secondary }}
                    >
                      Phone: {appointment.phone}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <h4
                  className="text-sm font-medium mb-2"
                  style={{ color: currentTheme.text.secondary }}
                >
                  Appointment Details
                </h4>
                <div
                  className="p-3 rounded-md"
                  style={{ backgroundColor: currentTheme.secondary }}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <Calendar size={18} style={{ color: currentTheme.text.secondary }} />
                    <span style={{ color: currentTheme.text.primary }}>
                      Date: {appointment.date}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock size={18} style={{ color: currentTheme.text.secondary }} />
                    <span style={{ color: currentTheme.text.primary }}>
                      Time: {appointment.time}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin size={18} style={{ color: currentTheme.text.secondary }} />
                    <span style={{ color: currentTheme.text.primary }}>
                      Type: {appointment.appointmentType || 'Consultation'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              {appointment.message && (
                <div>
                  <h4
                    className="text-sm font-medium mb-2"
                    style={{ color: currentTheme.text.secondary }}
                  >
                    Client Message
                  </h4>
                  <p
                    className="p-3 rounded-md whitespace-pre-wrap"
                    style={{
                      backgroundColor: currentTheme.secondary,
                      color: currentTheme.text.primary
                    }}
                  >
                    {appointment.message}
                  </p>
                </div>
              )}
              {appointment.notes && (
                <div>
                  <h4
                    className="text-sm font-medium mb-2"
                    style={{ color: currentTheme.text.secondary }}
                  >
                    Notes
                  </h4>
                  <p
                    className="p-3 rounded-md whitespace-pre-wrap"
                    style={{
                      backgroundColor: currentTheme.secondary,
                      color: currentTheme.text.primary
                    }}
                  >
                    {appointment.notes}
                  </p>
                </div>
              )}
              <div>
                <h4
                  className="text-sm font-medium mb-2"
                  style={{ color: currentTheme.text.secondary }}
                >
                  Actions
                </h4>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <CustomButton
                    onClick={() => handleStatusUpdate(appointment.id, 'confirmed')}
                    variant="primary"
                    icon={() => <Check size={16} />}
                    className="text-sm font-medium w-full sm:w-auto"
                  >
                    Approve
                  </CustomButton>
                  {isFutureAppointment(appointment) && (
                    <CustomButton
                      onClick={() => handleStatusUpdate(appointment.id, 'cancelled')}
                      variant="danger"
                      icon={() => <Trash2 size={16} />}
                      className="text-sm font-medium w-full sm:w-auto"
                    >
                      Cancel
                    </CustomButton>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="p-0 sm:p-0 w-full max-w-[1400px] mx-auto"
      style={{ color: currentTheme.text.primary }}
    >
      <CustomDeleteConfirmation
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation({ isOpen: false, appointmentId: null })}
        onConfirm={() => handleDelete(deleteConfirmation.appointmentId)}
        title="Delete Appointment"
        message="Are you sure you want to delete this appointment? This action cannot be undone."
      />

      {notification && (
        <div
          className={`fixed top-2 right-2 sm:top-4 sm:right-4 p-3 sm:p-4 rounded-lg shadow-lg z-50`}
          style={{
            minWidth: '280px',
            maxWidth: '90vw',
            animation: 'slideIn 0.5s ease-out',
            backgroundColor: notification.type === 'success'
              ? currentTheme.success.light
              : currentTheme.error.light,
            color: notification.type === 'success'
              ? currentTheme.success.dark
              : currentTheme.error.dark,
            border: `2px solid ${notification.type === 'success'
              ? currentTheme.success.dark
              : currentTheme.error.dark}`
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
        <div
          className="text-center py-8 sm:py-10"
          style={{ color: currentTheme.text.secondary }}
        >
          <p className="text-sm sm:text-base">Loading appointments...</p>
        </div>
      ) : (
        <>
          {selectedAppointment ? (
            <AppointmentDetailView appointment={selectedAppointment} />
          ) : (
            <>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="w-full sm:w-auto flex-grow">
                  <CustomSearch
                    placeholder="Search appointments with Client Name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
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
                  />
                </div>
              </div>

              <div className="overflow-hidden rounded-lg shadow">
                <CustomTable
                  headers={[
                    'Client Name',
                    'Date & Time',
                    'Consultation Type',
                    'Status',
                    'Actions'
                  ]}
                  onBulkDelete={handleBulkDelete}
                >
                  {filteredAppointments.map((appointment) => (
                    <tr key={appointment.id} id={appointment.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span>{appointment.name}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Calendar size={16} style={{ color: currentTheme.text.secondary }} />
                          <span>{appointment.date} {appointment.time}</span>
                        </div>
                      </td>
                      <td>
                        <span>{appointment.appointmentType || 'Consultation'}</span>
                      </td>
                      <td>
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(appointment.status)}`}>
                          {appointment.status}
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        <div className="flex justify-center space-x-1 sm:space-x-2">
                        <button
                              onClick={() => handleViewClick(service)}
                              className="p-1 text-gray-600 hover:text-gray-800 transition-colors"
                              title="View"
                            >
                              <Eye size={20} />
                            </button>
                          <button
                            onClick={() => handleStatusUpdate(appointment.id, 'confirmed')}
                            className="p-1 text-green-600 hover:opacity-80 transition-opacity"
                            title="Approve Appointment"
                          >
                            <ThumbsUp size={20} />
                          </button>
                          {isFutureAppointment(appointment) && (
                            <button
                              onClick={() => handleDeleteClick(appointment.id)}
                              className="p-1 hover:opacity-80 transition-opacity"
                              title="Delete Appointment"
                              style={{ color: currentTheme.destructive }}
                            >
                              <Trash2 size={20} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </CustomTable>
              </div>

              {filteredAppointments?.length === 0 && (
                <div
                  className="text-center py-4 sm:py-6"
                  style={{ color: currentTheme.text.secondary }}
                >
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
      `}</style>
    </div>
  );
}

export default AppointmentsContent;