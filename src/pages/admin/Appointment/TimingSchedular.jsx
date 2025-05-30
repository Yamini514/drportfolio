import React, { useState, useEffect } from "react";
import { collection, doc, setDoc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "../../../firebase/config";
import { useTheme } from "../../../context/ThemeContext";
import CustomButton from "../../../components/CustomButton";
import CustomInput from "../../../components/CustomInput";
import CustomSelect from "../../../components/CustomSelect";
import CustomDeleteConfirmation from "../../../components/CustomDeleteConfirmation";
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Plus,
  Trash2,
  Eye,
  Pencil,
} from "lucide-react";
import { getAuth } from "firebase/auth";



const TimingSchedular = () => {
  // const { currentTheme } = useTheme();

  const checkForBookingConflicts = async (schedule) => {
  try {
    // Get all existing appointments for the date range
    const appointmentsRef = collection(db, 'appointments');
    const appointmentsSnapshot = await getDocs(query(appointmentsRef, 
      where('date', '>=', schedule.startDate),
      where('date', '<=', schedule.endDate)
    ));
    
    const conflicts = [];
    appointmentsSnapshot.forEach(doc => {
      const appointment = doc.data();
      if (appointment.time >= schedule.startTime && 
          appointment.time <= schedule.endTime) {
        conflicts.push({
          date: appointment.date,
          time: appointment.time
        });
      }
    });
    
    return conflicts;
  } catch (error) {
    console.error('Error checking conflicts:', error);
    throw error;
  }
};

const handleSaveSchedule = async () => {
  try {
    // Validate the form
    if (!newSchedule.name || !newSchedule.startDate || !newSchedule.endDate) {
      showNotification('Please fill in all required fields', 'error');
      return;
    }

    // Check for booking conflicts
    const conflicts = await checkForBookingConflicts(newSchedule);
    if (conflicts.length > 0) {
      const conflictDates = conflicts.map(c => 
        `${formatDate(c.date)} at ${c.time}`
      ).join(', ');
      showNotification(`Cannot save schedule. Conflicts found on: ${conflictDates}`, 'error');
      return;
    }

    // Add the new schedule to the locations array
    const updatedLocations = [...schedule.locations, newSchedule];
      
    // Update Firestore
    await setDoc(doc(db, 'settings', 'schedule'), {
      ...schedule,
      locations: updatedLocations
    });

    // Update local state
    setSchedule(prev => ({
      ...prev,
      locations: updatedLocations
    }));

    // Reset form and hide it
    setNewSchedule({
      name: '',
      startTime: '09:00',
      endTime: '17:00',
      startDate: '',
      endDate: '',
      isActive: true,
      days: {
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false,
      }
    });
    setShowAddScheduleForm(false);
      
    showNotification('Schedule saved successfully');
  } catch (error) {
    console.error('Error saving schedule:', error);
    showNotification('Error saving schedule', 'error');
  }
};

  const { currentTheme } = useTheme();

  const [editingIndex, setEditingIndex] = useState(null);
  const [editingLocation, setEditingLocation] = useState(null);

  const [viewingLocation, setViewingLocation] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  // const [showAddScheduleForm, setShowAddScheduleForm] = useState(false);

  // const [newSchedule, setNewSchedule] = useState({
  //   name: "",
  //   startTime: "09:00",
  //   endTime: "17:00",
  //   startDate: "",
  //   endDate: "",
  //   isActive: true,
  //   days: {
  //     monday: false,
  //     tuesday: false,
  //     wednesday: false,
  //     thursday: false,
  //     friday: false,
  //     saturday: false,
  //     sunday: false,
  //   },
  // });

  const [schedule, setSchedule] = useState({
    locations: [],
    defaultTimes: {
      startTime: "09:00",
      endTime: "17:00",
    },
    schedules: [], // Array to store all schedules including history
  });

  const [newSchedule, setNewSchedule] = useState({
    name: "",
    startTime: "09:00",
    endTime: "17:00",
    startDate: "",
    endDate: "",
    isActive: true,
    days: {
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false,
    },
  });
  const ViewModal = ({ location, onClose }) => {
    const { currentTheme } = useTheme();
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div 
          className="bg-white rounded-lg p-6 w-full max-w-2xl"
          style={{ backgroundColor: currentTheme.surface }}
        >
          <h2 
            className="text-2xl font-semibold mb-4"
            style={{ color: currentTheme.text.primary }}
          >
            Location Details
          </h2>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="font-medium" style={{ color: currentTheme.text.primary }}>Location Name</label>
              <p style={{ color: currentTheme.text.secondary }}>{location.name}</p>
            </div>
            <div>
              <label className="font-medium" style={{ color: currentTheme.text.primary }}>Timing</label>
              <p style={{ color: currentTheme.text.secondary }}>{location.startTime} - {location.endTime}</p>
            </div>
            <div className="col-span-2">
              <label className="font-medium" style={{ color: currentTheme.text.primary }}>Available Days</label>
              <div className="flex gap-2 mt-1 text-black">
                {Object.entries(location.days).map(([day, isAvailable]) => (
                  <span 
                    key={day}
                    className={`px-2 py-1 rounded`}
                    style={{
                      backgroundColor: isAvailable ? currentTheme.success.light : currentTheme.error.light,
                      color: isAvailable ? currentTheme.success.dark : currentTheme.error.dark
                    }}
                  >
                    {day.charAt(0).toUpperCase() + day.slice(1)}
                  </span>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <CustomButton onClick={onClose}>Close</CustomButton>
          </div>
        </div>
      </div>
    );
  };
  // Update the newLocation state to include date range
  const [showAddScheduleForm, setShowAddScheduleForm] = useState(false);

  const [newLocation, setNewLocation] = useState({
    name: "",
    startTime: "09:00",
    endTime: "17:00",
    startDate: "",
    endDate: "",
    days: {
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false,
    },
  });
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [blockedPeriods, setBlockedPeriods] = useState([]);
  const [newBlock, setNewBlock] = useState({
    type: "day",
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedTab, setSelectedTab] = useState("schedule");
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "",
  });
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    show: false,
    periodId: null,
    locationIndex: null,
  });

  const getTodayString = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  const handleEditLocation = (index) => {
    const locationToEdit = schedule.locations[index];
    setEditingIndex(index);
    setEditingLocation({ ...locationToEdit });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
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

  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
  };
  const loadData = async () => {
    try {
      setLoading(true); // Add loading state

      const scheduleDoc = await getDoc(doc(db, "settings", "schedule"));
      if (scheduleDoc.exists()) {
        const data = scheduleDoc.data();
        setSchedule(data);

        // Also update newLocation with the saved default times if they exist
        if (data.defaultTimes) {
          setNewLocation((prev) => ({
            ...prev,
            startTime: data.defaultTimes.startTime || "09:00",
            endTime: data.defaultTimes.endTime || "17:00",
          }));
        }
      } else {
        // If no document exists, create one with default values
        const defaultSchedule = {
          locations: [],
          defaultTimes: {
            startTime: "09:00",
            endTime: "17:00",
          },
        };
        await setDoc(doc(db, "settings", "schedule"), defaultSchedule);
        setSchedule(defaultSchedule);
      }

      const blockedPeriodsDoc = await getDoc(
        doc(db, "settings", "blockedPeriods")
      );
      if (blockedPeriodsDoc.exists()) {
        setBlockedPeriods(blockedPeriodsDoc.data().periods || []);
      }

      // ✅ Load and set dateRange here
      const dateRangeDoc = await getDoc(doc(db, "settings", "dateRange"));
      if (dateRangeDoc.exists()) {
        const storedRange = dateRangeDoc.data();
        setDateRange({
          startDate: storedRange.startDate || "",
          endDate: storedRange.endDate || "",
        });
      }
    } catch (error) {
      console.error("Error loading data:", error);
      setError("Failed to load schedule data");
    } finally {
      setLoading(false); // Clear loading state
    }
  };

  const handleAddLocation = async () => {
    if (
      !newLocation.name ||
      !Object.values(newLocation.days).some((day) => day)
    ) {
      setError("Please provide location name and select at least one day");
      return;
    }

    try {
      const updatedLocations = [
        ...(schedule.locations || []),
        { ...newLocation },
      ];

      // Update local state
      setSchedule((prev) => ({
        ...prev,
        locations: updatedLocations,
      }));

      // Update in Firestore
      await setDoc(doc(db, "settings", "schedule"), {
        ...schedule,
        locations: updatedLocations,
      });

      // Reset newLocation with safe defaultTimes access
      setNewLocation({
        name: "",
        startTime: schedule.defaultTimes?.startTime || "09:00",
        endTime: schedule.defaultTimes?.endTime || "17:00",
        days: {
          monday: false,
          tuesday: false,
          wednesday: false,
          thursday: false,
          friday: false,
          saturday: false,
          sunday: false,
        },
      });

      showNotification("Location added successfully");
    } catch (error) {
      console.error("Error adding location:", error);
      showNotification("Failed to add location", "error");
    }
  };

  const handleLocationChange = (field, value) => {
    setNewLocation((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleDayToggle = (day) => {
    if (day === "sunday") {
      setNewLocation((prev) => ({
        ...prev,
        days: { ...prev.days, sunday: false },
      }));
      showNotification("Sunday is set as unavailable by default", "error");
      return;
    }

    setNewLocation((prev) => ({
      ...prev,
      days: { ...prev.days, [day]: !prev.days[day] },
    }));
  };
  const handleViewLocation = (location) => {
    setViewingLocation(location);
    setShowViewModal(true);
  };

  const handleLocationUpdate = async () => {
    try {
      if (!newSchedule.name || !newSchedule.startDate || !newSchedule.endDate) {
        showNotification('Please fill in all required fields', 'error');
        return;
      }

      const updatedLocations = schedule.locations.map((loc, idx) =>
        idx === editingIndex ? newSchedule : loc
      );

      await setDoc(doc(db, 'settings', 'schedule'), {
        ...schedule,
        locations: updatedLocations
      });

      setSchedule(prev => ({
        ...prev,
        locations: updatedLocations
      }));

      setShowAddScheduleForm(false);
      setEditingIndex(null);
      setNewSchedule({
        name: '',
        startTime: '09:00',
        endTime: '17:00',
        startDate: '',
        endDate: '',
        isActive: true,
        days: {
          monday: false,
          tuesday: false,
          wednesday: false,
          thursday: false,
          friday: false,
          saturday: false,
          sunday: false,
        }
      });

      showNotification('Schedule updated successfully');
    } catch (error) {
      console.error('Error updating schedule:', error);
      showNotification('Error updating schedule', 'error');
    }
  };
  const handleDeleteLocation = async (index) => {
    try {
      const updatedLocations = schedule.locations.filter((_, i) => i !== index);
      
      // Update Firestore
      await setDoc(doc(db, 'settings', 'schedule'), {
        ...schedule,
        locations: updatedLocations
      });

      // Update local state
      setSchedule(prev => ({
        ...prev,
        locations: updatedLocations
      }));

      showNotification('Schedule deleted successfully');
    } catch (error) {
      console.error('Error deleting schedule:', error);
      showNotification('Error deleting schedule', 'error');
    }
  };

  const confirmRemoveLocation = async () => {
    try {
      const { locationIndex } = deleteConfirmation;
      if (locationIndex === null) return;

      // Check if user is authenticated using localStorage
      const adminToken = localStorage.getItem("adminToken");
      const isAdminLoggedIn =
        localStorage.getItem("isAdminLoggedIn") === "true";

      if (!adminToken || !isAdminLoggedIn) {
        throw new Error("User must be authenticated");
      }

      setLoading(true);

      // Get the current schedule document
      const scheduleRef = doc(db, "settings", "schedule");
      const scheduleDoc = await getDoc(scheduleRef);

      if (!scheduleDoc.exists()) {
        throw new Error("Schedule document not found");
      }

      const currentData = scheduleDoc.data();
      const updatedLocations = currentData.locations.filter(
        (_, i) => i !== locationIndex
      );

      // Update in Firestore with merge option
      await setDoc(
        scheduleRef,
        {
          locations: updatedLocations,
        },
        { merge: true }
      );

      // Update local state
      setSchedule((prev) => ({
        ...prev,
        locations: updatedLocations,
      }));

      setDeleteConfirmation({
        show: false,
        periodId: null,
        locationIndex: null,
      });
      showNotification("Location removed successfully");
    } catch (error) {
      console.error("Error removing location:", error);
      showNotification(error.message || "Failed to remove location", "error");
    } finally {
      setLoading(false);
    }
  };

  // const handleDateRangeChange = (field, value) => {
  //   setDateRange((prev) => ({
  //     ...prev,
  //     [field]: value,
  //   }));
  // };

  const handleNewBlockChange = (field, value) => {
    setNewBlock((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const addBlockedPeriod = async () => {
    // Make this function async
    if (
      !newBlock.startDate ||
      (newBlock.type !== "day" && !newBlock.endDate) ||
      !newBlock.reason
    ) {
      setError("Please fill all required fields");
      return;
    }

    const startDate = new Date(newBlock.startDate);
    const today = new Date(getTodayString());
    if (startDate < today) {
      setError("Cannot block past dates");
      return;
    }

    if (newBlock.type !== "day") {
      const endDate = new Date(newBlock.endDate);
      if (endDate < startDate) {
        setError("End date must be after start date");
        return;
      }
    }

    try {
      const newPeriod = {
        id: Date.now().toString(),
        ...newBlock,
        createdAt: new Date().toISOString(),
      };

      // Update in Firebase first
      await setDoc(doc(db, "settings", "blockedPeriods"), {
        periods: [...blockedPeriods, newPeriod],
        updatedAt: new Date().toISOString(),
      });

      // Then update local state
      setBlockedPeriods((prev) => [...prev, newPeriod]);
      setNewBlock({
        type: "day",
        startDate: "",
        endDate: "",
        reason: "",
      });
      setError("");
      showNotification("Blocked period added successfully");
    } catch (error) {
      console.error("Error adding blocked period:", error);
      showNotification("Failed to add blocked period", "error");
    }
  };

  const removeBlockedPeriod = (id) => {
    setDeleteConfirmation({
      show: true,
      periodId: id,
      locationIndex: null,
    });
  };

  const confirmRemoveBlockedPeriod = async () => {
    try {
      const { periodId } = deleteConfirmation;
      // Remove from local state
      setBlockedPeriods((prev) =>
        prev.filter((period) => period.id !== periodId)
      );

      // Update in Firestore
      await setDoc(doc(db, "settings", "blockedPeriods"), {
        periods: blockedPeriods.filter((period) => period.id !== periodId),
        updatedAt: new Date().toISOString(),
      });

      setDeleteConfirmation({
        show: false,
        periodId: null,
        locationIndex: null,
      });
      showNotification("Blocked period removed successfully");
    } catch (error) {
      console.error("Error removing blocked period:", error);
      showNotification("Failed to remove blocked period", "error");
    }
  };

  const createTimeSlots = (location) => {
    const slots = [];
    const [startHour] = location.startTime.split(":");
    const [endHour] = location.endTime.split(":");

    for (let hour = parseInt(startHour); hour < parseInt(endHour); hour++) {
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const period = hour >= 12 ? "PM" : "AM";
      slots.push(`${displayHour}:00 ${period}`);
      slots.push(`${displayHour}:30 ${period}`);
    }

    return slots;
  };

  const generateScheduleDocuments = async () => {
    try {
      if (!dateRange.startDate || !dateRange.endDate) {
        setError("Please select a date range for schedule generation");
        return false;
      }

      setLoading(true);
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);

      if (startDate > endDate) {
        setError("Start date must be before end date");
        setLoading(false);
        return false;
      }

      const dataDocRef = doc(db, "appointments", "data");
      const dataDoc = await getDoc(dataDocRef);
      if (!dataDoc.exists()) {
        await setDoc(dataDocRef, {
          created: new Date(),
          description: "Container for appointment data",
        });
      }

      const scheduleRef = collection(db, "appointments/data/schedule");

      for (
        let currentDate = new Date(startDate);
        currentDate <= endDate;
        currentDate.setDate(currentDate.getDate() + 1)
      ) {
        const dateString = currentDate.toISOString().split("T")[0];
        const dayName = currentDate
          .toLocaleDateString("en-US", { weekday: "long" })
          .toLowerCase();

        if (dayName === "sunday") {
          continue;
        }

        for (const location of schedule.locations || []) {
          if (location.days[dayName]) {
            const timeSlots = createTimeSlots(location);

            const isBlocked = blockedPeriods.some((period) => {
              const blockStart = new Date(period.startDate);
              if (period.type === "day") {
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
                createdAt: new Date(),
              });
            }
          }
        }
      }

      showNotification("Schedule documents generated successfully");
      return true;
    } catch (error) {
      console.error("Error generating schedule documents:", error);
      setError("Failed to generate schedule documents: " + error.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError("");

    try {
      const updatedSchedule = {
        ...schedule,
        locations: schedule.locations.map((location) => ({
          ...location,
          days: { ...location.days, sunday: false },
        })),
      };

      // Save schedule
      await setDoc(doc(db, "settings", "schedule"), updatedSchedule);

      // Save blocked periods
      await setDoc(doc(db, "settings", "blockedPeriods"), {
        periods: blockedPeriods,
        updatedAt: new Date().toISOString(),
      });

      // ✅ Save dateRange
      await setDoc(doc(db, "settings", "dateRange"), {
        startDate: dateRange.startDate || "",
        endDate: dateRange.endDate || "",
        updatedAt: new Date().toISOString(),
      });

      // Generate schedule documents
      const success = await generateScheduleDocuments();

      if (success) {
        showNotification(
          "Schedule and availability settings saved successfully"
        );
      }
    } catch (error) {
      console.error("Error saving data:", error);
      setError("Failed to save changes: " + error.message);
      showNotification("Failed to save changes", "error");
    } finally {
      setLoading(false);
    }
  };
  const saveEditedLocation = async (index) => {
    const updatedLocations = [...schedule.locations];
    updatedLocations[index] = editingLocation;

    try {
      await setDoc(doc(db, "settings", "schedule"), {
        ...schedule,
        locations: updatedLocations,
      });

      setSchedule((prev) => ({ ...prev, locations: updatedLocations }));
      setEditingIndex(null);
      setEditingLocation(null);
      showNotification("Location updated successfully");
    } catch (error) {
      console.error("Error saving edited location:", error);
      showNotification("Failed to save changes", "error");
    }
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingLocation(null);
  };

  const isBlockActive = (period) => {
    const now = new Date();
    const startDate = new Date(period.startDate);

    if (period.type === "day") {
      return startDate.toDateString() === now.toDateString();
    }

    const endDate = new Date(period.endDate);
    return now >= startDate && now <= endDate;
  };

  const activeBlocksCount = blockedPeriods.filter(isBlockActive).length;

  const formatBlockType = (type) => {
    if (type === "day") {
      return "Single Day";
    }
    return "Extended Period";
  };

  return (
    <div className="p-0 relative">


      {notification.show && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center transition-opacity duration-300 ${
            notification.type === "error"
              ? "bg-red-500 text-white"
              : "bg-green-500 text-white"
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

      <CustomDeleteConfirmation
        isOpen={deleteConfirmation.show}
        onClose={() =>
          setDeleteConfirmation({
            show: false,
            periodId: null,
            locationIndex: null,
          })
        }
        onConfirm={
          deleteConfirmation.periodId
            ? confirmRemoveBlockedPeriod
            : confirmRemoveLocation
        }
        title={
          deleteConfirmation.periodId
            ? "Delete Blocked Period"
            : "Remove Location"
        }
        message={
          deleteConfirmation.periodId
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
          className={`px-4 py-2 mr-2 font-medium rounded-t-lg transition-colors ${selectedTab === "schedule" ? "border-b-2" : ""}`}
          style={{
            borderColor: selectedTab === "schedule" ? currentTheme.primary : "transparent",
            color: selectedTab === "schedule" ? currentTheme.primary : currentTheme.text.secondary,
          }}
          onClick={() => setSelectedTab("schedule")}
        >
          <Calendar size={16} className="inline mr-2" />
          Regular Schedule
        </button>
        <button
          className={`px-4 py-2 mr-2 font-medium rounded-t-lg transition-colors flex items-center ${selectedTab === "blocks" ? "border-b-2" : ""}`}
          style={{
            borderColor: selectedTab === "blocks" ? currentTheme.primary : "transparent",
            color: selectedTab === "blocks" ? currentTheme.primary : currentTheme.text.secondary,
          }}
          onClick={() => setSelectedTab("blocks")}
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

      {selectedTab === "schedule" && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold" style={{ color: currentTheme.text.primary }}>
              {showAddScheduleForm ? (editingIndex !== null ? 'Edit Schedule' : 'Add New Schedule') : 'Schedule List'}
            </h2>
            {!showAddScheduleForm && (
              <CustomButton
                onClick={() => {
                  setNewSchedule({
                    name: "",
                    startTime: "09:00",
                    endTime: "17:00",
                    startDate: "",
                    endDate: "",
                    isActive: true,
                    days: {
                      monday: false,
                      tuesday: false,
                      wednesday: false,
                      thursday: false,
                      friday: false,
                      saturday: false,
                      sunday: false,
                    }
                  });
                  setEditingIndex(null);
                  setShowAddScheduleForm(true);
                }}
                icon={Plus}
              >
                Add New Schedule
              </CustomButton>
            )}
          </div>

          {!showAddScheduleForm && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {schedule.locations.map((location, index) => (
              <div 
                key={index}
                className="rounded-lg p-6 shadow-md"
                style={{ backgroundColor: currentTheme.surface }}
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold" style={{ color: currentTheme.text.primary }}>
                    {location.name}
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setNewSchedule(location);
                        setShowAddScheduleForm(true);
                        setEditingIndex(index);
                      }}
                      className="p-2 rounded-full hover:bg-gray-100"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteLocation(index)}
                      className="p-2 rounded-full hover:bg-gray-100 text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <p style={{ color: currentTheme.text.secondary }}>
                    <Clock size={16} className="inline mr-2" />
                    {location.startTime} - {location.endTime}
                  </p>
                  <p style={{ color: currentTheme.text.secondary }}>
                    <Calendar size={16} className="inline mr-2" />
                    {formatDate(location.startDate)} - {formatDate(location.endDate)}
                  </p>
                </div>
                
                <div className="mt-4">
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(location.days).map(([day, isAvailable]) => (
                      <span
                        key={day}
                        className={`px-2 py-1 text-sm rounded ${isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                      >
                        {day.charAt(0).toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}

          {showAddScheduleForm && (
            <div className="bg-white rounded-lg p-6 mb-6" style={{ backgroundColor: currentTheme.surface }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CustomInput
                  label="Location Name"
                  value={newSchedule.name}
                  onChange={(e) => setNewSchedule({ ...newSchedule, name: e.target.value })}
                  placeholder="Enter location name"
                />
                <div className="grid grid-cols-2 gap-4">
                  <CustomInput
                    type="time"
                    label="Start Time"
                    value={newSchedule.startTime}
                    onChange={(e) => setNewSchedule({ ...newSchedule, startTime: e.target.value })}
                  />
                  <CustomInput
                    type="time"
                    label="End Time"
                    value={newSchedule.endTime}
                    onChange={(e) => setNewSchedule({ ...newSchedule, endTime: e.target.value })}
                  />
                </div>
                <CustomInput
                  type="date"
                  label="Start Date"
                  value={newSchedule.startDate}
                  onChange={(e) => setNewSchedule({ ...newSchedule, startDate: e.target.value })}
                />
                <CustomInput
                  type="date"
                  label="End Date"
                  value={newSchedule.endDate}
                  onChange={(e) => setNewSchedule({ ...newSchedule, endDate: e.target.value })}
                />
              </div>
              
              <div className="mt-4">
                <label className="block mb-2" style={{ color: currentTheme.text.primary }}>Available Days</label>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(newSchedule.days).map(([day, isSelected]) => (
                    <button
                      key={day}
                      onClick={() => setNewSchedule({
                        ...newSchedule,
                        days: { ...newSchedule.days, [day]: !isSelected }
                      })}
                      className={`px-3 py-1 rounded-full ${isSelected ? 'bg-primary text-white' : 'bg-gray-200'}`}
                      style={isSelected ? { backgroundColor: currentTheme.primary } : {}}
                    >
                      {day.charAt(0).toUpperCase() + day.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <CustomButton onClick={() => {
                  setShowAddScheduleForm(false);
                  setEditingIndex(null);
                }} variant="outlined">
                  Cancel
                </CustomButton>
                <CustomButton onClick={() => {
                  if (editingIndex !== null) {
                    handleLocationUpdate();
                  } else {
                    handleSaveSchedule();
                  }
                }}>
                  {editingIndex !== null ? 'Update Changes' : 'Save Changes'}
                </CustomButton>
              </div>
            </div>
          )}
        </div>
      )}

      {selectedTab === "blocks" && (
        <div>
          <div
            className="mb-6 p-4 border rounded-lg"
            style={{
              borderColor: currentTheme.border,
              backgroundColor: currentTheme.surface,
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
                onChange={(e) => handleNewBlockChange("type", e.target.value)}
                options={[
                  { value: "day", label: "Single Day" },
                  { value: "period", label: "Extended Period" },
                ]}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <CustomInput
                label="Start Date"
                type="date"
                value={newBlock.startDate}
                className="w-full sm:w-auto"
                onChange={(e) =>
                  handleNewBlockChange("startDate", e.target.value)
                }
                min={getTodayString()}
                required
              />

              {newBlock.type !== "day" && (
                <CustomInput
                  label="End Date"
                  type="date"
                  value={newBlock.endDate}
                  className="w-full sm:w-auto"
                  onChange={(e) =>
                    handleNewBlockChange("endDate", e.target.value)
                  }
                  min={newBlock.startDate || getTodayString()}
                />
              )}
            </div>

            <CustomInput
              label="Reason / Message to Display"
              value={newBlock.reason || ""}
              onChange={(e) => handleNewBlockChange("reason", e.target.value)}
              placeholder="Enter reason for blocking this period"
              required
            />

            <div className="mt-4">
              <CustomButton onClick={addBlockedPeriod} icon={Calendar}>
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
                  backgroundColor: currentTheme.surface,
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
                      borderColor: isBlockActive(period)
                        ? "#ef4444"
                        : currentTheme.border,
                      backgroundColor: isBlockActive(period)
                        ? "rgba(239, 68, 68, 0.1)"
                        : currentTheme.surface,
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
                        {period.type === "day" ? (
                          <span>Date: {formatDate(period.startDate)}</span>
                        ) : (
                          <span>
                            From {formatDate(period.startDate)} to{" "}
                            {formatDate(period.endDate)}
                          </span>
                        )}
                      </div>

                      <div className="text-sm">
                        <span style={{ color: currentTheme.text.secondary }}>
                          Message:{" "}
                        </span>
                        <span style={{ color: currentTheme.text.primary }}>
                          {period.reason}
                        </span>
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
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            borderColor: "#ef4444",
            color: "#dc2626",
          }}
        >
          <AlertTriangle size={16} className="mr-2 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div
        className="flex flex-wrap items-center gap-4 pt-4 border-t"
        style={{ borderColor: currentTheme.border }}
      >
        <CustomButton
          onClick={handleSave}
          disabled={loading}
          icon={loading ? Clock : CheckCircle}
        >
          {loading ? "Saving..." : "Save Changes"}
        </CustomButton>

        <div
          className="text-sm p-3 rounded-lg flex-1"
          style={{
            color: currentTheme.text.secondary,
            backgroundColor: currentTheme.primary + "10",
          }}
        >
          <CheckCircle size={14} className="inline mr-2" />
          This will save your schedule and generate available slots from{" "}
          {formatDate(dateRange.startDate)} to {formatDate(dateRange.endDate)}.
        </div>
      </div>
    </div>
  );
};

export default TimingSchedular;
