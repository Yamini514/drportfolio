import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  MapPin,
  Eye,
  Check,
  X,
  Trash2,
  ArrowLeft,
  Search,
  AlertTriangle,
  CheckCircle,
  Info,
  Edit3,
  FileText,
} from "lucide-react";
import CustomButton from "../../../components/CustomButton";
import CustomInput from "../../../components/CustomInput";
import CustomSelect from "../../../components/CustomSelect";
import CustomDeleteConfirmation from "../../../components/CustomDeleteConfirmation";
import {
  collection,
  updateDoc,
  doc,
  onSnapshot,
  query,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../../firebase/config";
import { useTheme } from "../../../context/ThemeContext";

const ViewAppointments = () => {
  const { currentTheme } = useTheme();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [notification, setNotification] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    appointmentId: null,
    appointmentData: null,
  });
  const [statusUpdateLoading, setStatusUpdateLoading] = useState({});

  const showNotification = useCallback((message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  const formatDate = useCallback((dateStr) => {
    if (!dateStr) return "N/A";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      console.error("Error formatting date:", error);

      return dateStr;
    }
  }, []);

  const formatTime = useCallback((timeStr) => {
    if (!timeStr) return "N/A";
    try {
      const [hours, minutes] = timeStr.split(":");
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? "PM" : "AM";
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch (error) {
      console.error("Error formatting time:", error);
      return timeStr;
    }
  }, []);

  const isUpcoming = useCallback((appointment) => {
    if (!appointment.appointmentDate || !appointment.appointmentTime)
      return false;
    try {
      const appointmentDateTime = new Date(
        `${appointment.appointmentDate}T${appointment.appointmentTime}`
      );
      return appointmentDateTime > new Date();
    } catch (error) {
      console.error("Error checking if appointment is upcoming:", error);
      return false;
    }
  }, []);

  const getStatusColor = useCallback((status) => {
    const colors = {
      Pending: "bg-yellow-100 text-yellow-800",
      Confirmed: "bg-green-100 text-green-800",
      Cancelled: "bg-red-100 text-red-800",
      Completed: "bg-blue-100 text-blue-800",
      "No-show": "bg-gray-100 text-gray-800",
      Rescheduled: "bg-purple-100 text-purple-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  }, []);

  const handleStatusUpdate = useCallback(
    async (appointmentId, newStatus) => {
      setStatusUpdateLoading((prev) => ({ ...prev, [appointmentId]: true }));
      try {
        const appointmentRef = doc(
          db,
          "appointments",
          "bookings",
          "appointments",
          appointmentId
        );
        await updateDoc(appointmentRef, {
          status: newStatus,
          updatedAt: new Date().toISOString(),
          [`${newStatus}At`]: new Date().toISOString(), // Track when status was changed
        });

        setAppointments((prev) =>
          prev.map((app) =>
            app.id === appointmentId ? { ...app, status: newStatus } : app
          )
        );

        showNotification(`Appointment ${newStatus} successfully`);
      } catch (error) {
        console.error("Error updating appointment:", error);
        showNotification("Failed to update appointment", "error");
      } finally {
        setStatusUpdateLoading((prev) => ({ ...prev, [appointmentId]: false }));
      }
    },
    [showNotification]
  );

  const handleDeleteAppointment = useCallback(async () => {
    try {
      const { appointmentId } = deleteConfirmation;
      const appointmentRef = doc(
        db,
        "appointments",
        "bookings",
        "appointments",
        appointmentId
      );
      await deleteDoc(appointmentRef);

      setAppointments((prev) => prev.filter((app) => app.id !== appointmentId));
      setDeleteConfirmation({
        isOpen: false,
        appointmentId: null,
        appointmentData: null,
      });
      showNotification("Appointment deleted successfully");
    } catch (error) {
      console.error("Error deleting appointment:", error);
      showNotification("Failed to delete appointment", "error");
    }
  }, [deleteConfirmation, showNotification]);

  const handleViewDetails = useCallback((appointment) => {
    setSelectedAppointment(appointment);
  }, []);

  const handleBackToList = useCallback(() => {
    setSelectedAppointment(null);
  }, []);

  // Get unique locations for filter
  const uniqueLocations = useMemo(() => {
    const locations = [
      ...new Set(appointments.map((app) => app.location).filter(Boolean)),
    ];
    return locations.map((location) => ({ value: location, label: location }));
  }, [appointments]);

  // Filter appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      const matchesFilter = filter === "all" || appointment.status === filter;
      const matchesSearch =
        !searchTerm ||
        appointment.patientName
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        appointment.patientEmail
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        appointment.patientPhone?.includes(searchTerm);
      const matchesDate =
        !dateFilter || appointment.appointmentDate === dateFilter;
      const matchesLocation =
        locationFilter === "all" || appointment.location === locationFilter;

      return matchesFilter && matchesSearch && matchesDate && matchesLocation;
    });
  }, [appointments, filter, searchTerm, dateFilter, locationFilter]);

  // Set up real-time listener
  useEffect(() => {
    const appointmentsRef = collection(
      db,
      "appointments",
      "bookings",
      "appointments"
    );
    // Simplified query to avoid index requirement
    const q = query(appointmentsRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const appointmentsList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          formattedDate: formatDate(doc.data().appointmentDate),
          formattedTime: formatTime(doc.data().appointmentTime),
          isUpcoming: isUpcoming(doc.data()),
        }));

        // Sort manually in JavaScript to avoid compound index
        appointmentsList.sort((a, b) => {
          const dateA = new Date(a.createdAt || "");
          const dateB = new Date(b.createdAt || "");
          return dateB - dateA; // Descending order (newest first)
        });

        setAppointments(appointmentsList);
        setLoading(false);

        // Check for new appointments
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const newAppointment = change.doc.data();
            showNotification(
              `New appointment: ${newAppointment.patientName} for ${formatDate(
                newAppointment.appointmentDate
              )}`,
              "info"
            );
          }
        });
      },
      (error) => {
        console.error("Error in real-time listener:", error);
        showNotification("Error receiving real-time updates", "error");
      }
    );

    return () => unsubscribe();
  }, [formatDate, formatTime, isUpcoming, showNotification]);

  // Status Badge Component
  const StatusBadge = ({
    status,
    appointmentId,
    isUpcoming: upcoming,
    disabled = false,
  }) => (
    <div className="flex items-center gap-2">
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
          status
        )}`}
      >
        {status || "Pending"}
      </span>
      {upcoming && status === "Pending" && !disabled && (
        <div className="flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleStatusUpdate(appointmentId, "Confirmed");
            }}
            disabled={statusUpdateLoading[appointmentId]}
            className="p-1 rounded text-green-600 hover:bg-green-50 transition-colors"
            title="Confirm appointment"
          >
            <Check size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleStatusUpdate(appointmentId, "Cancelled");
            }}
            disabled={statusUpdateLoading[appointmentId]}
            className="p-1 rounded text-red-600 hover:bg-red-50 transition-colors"
            title="Cancel appointment"
          >
            <X size={14} />
          </button>
        </div>
      )}
      {upcoming && status === "Confirmed" && !disabled && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleStatusUpdate(appointmentId, "Completed");
          }}
          disabled={statusUpdateLoading[appointmentId]}
          className="p-1 rounded text-blue-600 hover:bg-blue-50 transition-colors"
          title="Mark as completed"
        >
          <FileText size={14} />
        </button>
      )}
    </div>
  );

  // Appointment Details View
  const AppointmentDetailsView = () => {
    if (!selectedAppointment) return null;

    return (
      <div
        className="rounded-lg shadow-md overflow-hidden"
        style={{
          backgroundColor: currentTheme.surface,
          border: `1px solid ${currentTheme.border}`,
        }}
      >
        <div
          className="px-6 py-4 border-b flex justify-between items-center"
          style={{
            backgroundColor: currentTheme.secondary,
            borderColor: currentTheme.border,
          }}
        >
          <h3
            className="text-xl font-semibold"
            style={{ color: currentTheme.text.primary }}
          >
            Appointment Details
          </h3>
          <CustomButton
            onClick={handleBackToList}
            variant="outlined"
            icon={ArrowLeft}
          >
            Back to List
          </CustomButton>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Patient Information */}
            <div>
              <h4
                className="text-lg font-medium mb-4"
                style={{ color: currentTheme.text.primary }}
              >
                Patient Information
              </h4>
              <div className="space-y-3">
                <div className="flex items-center">
                  <User
                    size={16}
                    className="mr-2"
                    style={{ color: currentTheme.text.secondary }}
                  />
                  <span className="font-medium mr-2">Name:</span>
                  <span>{selectedAppointment.patientName || "N/A"}</span>
                </div>
                <div className="flex items-center">
                  <Mail
                    size={16}
                    className="mr-2"
                    style={{ color: currentTheme.text.secondary }}
                  />
                  <span className="font-medium mr-2">Email:</span>
                  <span>{selectedAppointment.patientEmail || "N/A"}</span>
                </div>
                <div className="flex items-center">
                  <Phone
                    size={16}
                    className="mr-2"
                    style={{ color: currentTheme.text.secondary }}
                  />
                  <span className="font-medium mr-2">Phone:</span>
                  <span>{selectedAppointment.patientPhone || "N/A"}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-medium mr-2">Age:</span>
                  <span>{selectedAppointment.patientAge || "N/A"}</span>
                </div>
              </div>
            </div>

            {/* Appointment Information */}
            <div>
              <h4
                className="text-lg font-medium mb-4"
                style={{ color: currentTheme.text.primary }}
              >
                Appointment Information
              </h4>
              <div className="space-y-3">
                <div className="flex items-center">
                  <Calendar
                    size={16}
                    className="mr-2"
                    style={{ color: currentTheme.text.secondary }}
                  />
                  <span className="font-medium mr-2">Date:</span>
                  <span>{selectedAppointment.formattedDate}</span>
                </div>
                <div className="flex items-center">
                  <Clock
                    size={16}
                    className="mr-2"
                    style={{ color: currentTheme.text.secondary }}
                  />
                  <span className="font-medium mr-2">Time:</span>
                  <span>{selectedAppointment.formattedTime}</span>
                </div>
                <div className="flex items-center">
                  <MapPin
                    size={16}
                    className="mr-2"
                    style={{ color: currentTheme.text.secondary }}
                  />
                  <span className="font-medium mr-2">Location:</span>
                  <span>{selectedAppointment.location || "N/A"}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-medium mr-2">Status:</span>
                  <StatusBadge
                    status={selectedAppointment.status}
                    appointmentId={selectedAppointment.id}
                    isUpcoming={selectedAppointment.isUpcoming}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          {(selectedAppointment.reasonForVisit ||
            selectedAppointment.medicalHistory) && (
            <div className="mt-6">
              <h4
                className="text-lg font-medium mb-4"
                style={{ color: currentTheme.text.primary }}
              >
                Additional Information
              </h4>
              {selectedAppointment.reasonForVisit && (
                <div className="mb-3">
                  <span className="font-medium">Reason for Visit:</span>
                  <p
                    className="mt-1"
                    style={{ color: currentTheme.text.secondary }}
                  >
                    {selectedAppointment.reasonForVisit}
                  </p>
                </div>
              )}
              {selectedAppointment.medicalHistory && (
                <div>
                  <span className="font-medium">Medical History:</span>
                  <p
                    className="mt-1"
                    style={{ color: currentTheme.text.secondary }}
                  >
                    {selectedAppointment.medicalHistory}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Status Update Actions */}
          {selectedAppointment.isUpcoming && (
            <div className="mt-6 flex gap-3">
              {selectedAppointment.status === "Pending" && (
                <>
                  <CustomButton
                    onClick={() =>
                      handleStatusUpdate(selectedAppointment.id, "Confirmed")
                    }
                    icon={Check}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    disabled={statusUpdateLoading[selectedAppointment.id]}
                  >
                    Confirm
                  </CustomButton>
                  <CustomButton
                    onClick={() =>
                      handleStatusUpdate(selectedAppointment.id, "Cancelled")
                    }
                    icon={X}
                    variant="outlined"
                    className="border-red-500 text-red-500 hover:bg-red-50"
                    disabled={statusUpdateLoading[selectedAppointment.id]}
                  >
                    Cancel
                  </CustomButton>
                </>
              )}
              {selectedAppointment.status === "Confirmed" && (
                <>
                  <CustomButton
                    onClick={() =>
                      handleStatusUpdate(selectedAppointment.id, "Completed")
                    }
                    icon={FileText}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={statusUpdateLoading[selectedAppointment.id]}
                  >
                    Mark Completed
                  </CustomButton>
                  <CustomButton
                    onClick={() =>
                      handleStatusUpdate(selectedAppointment.id, "No-show")
                    }
                    variant="outlined"
                    className="border-gray-500 text-gray-500 hover:bg-gray-50"
                    disabled={statusUpdateLoading[selectedAppointment.id]}
                  >
                    No Show
                  </CustomButton>
                </>
              )}
              <CustomButton
                onClick={() =>
                  setDeleteConfirmation({
                    isOpen: true,
                    appointmentId: selectedAppointment.id,
                    appointmentData: selectedAppointment,
                  })
                }
                icon={Trash2}
                variant="outlined"
                className="border-red-500 text-red-500 hover:bg-red-50"
              >
                Delete
              </CustomButton>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (selectedAppointment) {
    return <AppointmentDetailsView />;
  }

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center transition-opacity duration-300 ${
            notification.type === "error"
              ? "bg-red-500 text-white"
              : notification.type === "info"
              ? "bg-blue-500 text-white"
              : "bg-green-500 text-white"
          }`}
        >
          {notification.type === "error" ? (
            <AlertTriangle size={20} className="mr-2" />
          ) : notification.type === "info" ? (
            <Info size={20} className="mr-2" />
          ) : (
            <CheckCircle size={20} className="mr-2" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Delete Confirmation */}
      <CustomDeleteConfirmation
        isOpen={deleteConfirmation.isOpen}
        onClose={() =>
          setDeleteConfirmation({
            isOpen: false,
            appointmentId: null,
            appointmentData: null,
          })
        }
        onConfirm={handleDeleteAppointment}
        title="Delete Appointment"
        message={`Are you sure you want to delete the appointment for ${
          deleteConfirmation.appointmentData?.patientName || "this patient"
        }? This action cannot be undone.`}
      />

      {/* Header */}
      <div className="flex justify-between items-center">
        <h2
          className="text-2xl font-semibold"
          style={{ color: currentTheme.text.primary }}
        >
          View Appointments
        </h2>
        <div className="text-sm" style={{ color: currentTheme.text.secondary }}>
          Total: {filteredAppointments.length} appointments
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <CustomInput
          placeholder="Search by name, email, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mt-6"
        />

        <CustomSelect
          label="Status"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          options={[
            { value: "all", label: "All Status" },
            { value: "Pending", label: "Pending" },
            { value: "Confirmed", label: "Confirmed" },
            { value: "Cancelled", label: "Cancelled" },
            { value: "Completed", label: "Completed" },
            { value: "No-show", label: "No Show" },
            { value: "Rescheduled", label: "Rescheduled" },
          ]}
        />

        <CustomInput
          type="date"
          label="Filter by Date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        />

        <CustomSelect
          label="Location"
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          options={[
            { value: "all", label: "All Locations" },
            ...uniqueLocations,
          ]}
        />
      </div>

      {/* Appointments Table */}
      {loading ? (
        <div className="text-center py-12">
          <div
            className="text-lg"
            style={{ color: currentTheme.text.secondary }}
          >
            Loading appointments...
          </div>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div
          className="text-center py-12 rounded-lg border"
          style={{
            backgroundColor: currentTheme.surface,
            borderColor: currentTheme.border,
          }}
        >
          <Calendar size={48} className="mx-auto mb-4 opacity-50" />
          <div
            className="text-lg mb-2"
            style={{ color: currentTheme.text.primary }}
          >
            No appointments found
          </div>
          <div style={{ color: currentTheme.text.secondary }}>
            {appointments.length === 0
              ? "No appointments have been booked yet"
              : "Try adjusting your filters"}
          </div>
        </div>
      ) : (
        <div
          className="overflow-x-auto rounded-lg border"
          style={{ borderColor: currentTheme.border }}
        >
          <table
            className="w-full"
            style={{ backgroundColor: currentTheme.surface }}
          >
            <thead style={{ backgroundColor: currentTheme.secondary }}>
              <tr>
                <th
                  className="px-4 py-3 text-left font-medium"
                  style={{ color: currentTheme.text.primary }}
                >
                  Patient Name
                </th>
                <th
                  className="px-4 py-3 text-left font-medium"
                  style={{ color: currentTheme.text.primary }}
                >
                  Date & Time
                </th>
                <th
                  className="px-4 py-3 text-left font-medium"
                  style={{ color: currentTheme.text.primary }}
                >
                  Location
                </th>
                <th
                  className="px-4 py-3 text-left font-medium"
                  style={{ color: currentTheme.text.primary }}
                >
                  Contact
                </th>
                <th
                  className="px-4 py-3 text-left font-medium"
                  style={{ color: currentTheme.text.primary }}
                >
                  Status & Actions
                </th>
                <th
                  className="px-4 py-3 text-center font-medium"
                  style={{ color: currentTheme.text.primary }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.map((appointment, index) => (
                <tr
                  key={appointment.id}
                  className="border-b hover:bg-opacity-50 transition-colors"
                  style={{
                    borderColor: currentTheme.border,
                    backgroundColor:
                      index % 2 === 0
                        ? "transparent"
                        : currentTheme.muted + "20",
                  }}
                >
                  <td className="px-4 py-3">
                    <div>
                      <div
                        className="font-medium"
                        style={{ color: currentTheme.text.primary }}
                      >
                        {appointment.patientName || "N/A"}
                      </div>
                      <div
                        className="text-sm"
                        style={{ color: currentTheme.text.secondary }}
                      >
                        Age: {appointment.patientAge || "N/A"}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">
                      <div className="flex items-center mb-1">
                        <Calendar
                          size={14}
                          className="mr-1"
                          style={{ color: currentTheme.text.secondary }}
                        />
                        <span style={{ color: currentTheme.text.primary }}>
                          {appointment.formattedDate}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <Clock
                          size={14}
                          className="mr-1"
                          style={{ color: currentTheme.text.secondary }}
                        />
                        <span style={{ color: currentTheme.text.primary }}>
                          {appointment.formattedTime}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      <MapPin
                        size={14}
                        className="mr-1"
                        style={{ color: currentTheme.text.secondary }}
                      />
                      <span style={{ color: currentTheme.text.primary }}>
                        {appointment.location || "N/A"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">
                      <div className="flex items-center mb-1">
                        <Phone
                          size={14}
                          className="mr-1"
                          style={{ color: currentTheme.text.secondary }}
                        />
                        <span style={{ color: currentTheme.text.primary }}>
                          {appointment.patientPhone || "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <Mail
                          size={14}
                          className="mr-1"
                          style={{ color: currentTheme.text.secondary }}
                        />
                        <span
                          className="truncate max-w-32"
                          style={{ color: currentTheme.text.primary }}
                        >
                          {appointment.patientEmail || "N/A"}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          appointment.status
                        )}`}
                      >
                        {appointment.status || "Pending"}
                      </span>
                      {appointment.isUpcoming && (
                        <div className="flex gap-1">
                          {appointment.status === "Pending" && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusUpdate(
                                    appointment.id,
                                    "Confirmed"
                                  );
                                }}
                                disabled={statusUpdateLoading[appointment.id]}
                                className="p-1 rounded text-green-600 hover:bg-green-50 transition-colors disabled:opacity-50"
                                title="Confirm appointment"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusUpdate(
                                    appointment.id,
                                    "Cancelled"
                                  );
                                }}
                                disabled={statusUpdateLoading[appointment.id]}
                                className="p-1 rounded text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                                title="Cancel appointment"
                              >
                                <X size={14} />
                              </button>
                            </>
                          )}
                          {appointment.status === "Confirmed" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusUpdate(appointment.id, "Completed");
                              }}
                              disabled={statusUpdateLoading[appointment.id]}
                              className="p-1 rounded text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
                              title="Mark as completed"
                            >
                              <FileText size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-1">
                      <button
                        onClick={() => handleViewDetails(appointment)}
                        className="p-1 rounded text-blue-600 hover:bg-blue-50 transition-colors"
                        title="View details"
                      >
                        <Eye size={16} />
                      </button>
                      {appointment.isUpcoming && (
                        <button
                          onClick={() =>
                            setDeleteConfirmation({
                              isOpen: true,
                              appointmentId: appointment.id,
                              appointmentData: appointment,
                            })
                          }
                          className="p-1 rounded text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete appointment"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ViewAppointments;
