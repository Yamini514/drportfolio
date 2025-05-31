import React, { useState, useEffect } from "react";
import { collection, doc, setDoc, getDoc, addDoc, getDocs, query, where, deleteDoc } from "firebase/firestore";
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
  const { currentTheme } = useTheme();
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedTab, setSelectedTab] = useState("schedule");
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "",
  });
  const [formErrors, setFormErrors] = useState({
    name: "",
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    days: "",
  });
  const [schedule, setSchedule] = useState({
    locations: [],
    defaultTimes: {
      startTime: "09:00",
      endTime: "17:00",
    },
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
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingLocation, setEditingLocation] = useState(null);
  const [viewingLocation, setViewingLocation] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAddScheduleForm, setShowAddScheduleForm] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    show: false,
    periodId: null,
    locationIndex: null,
    scheduleId: null,
  });

  const getTodayString = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
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

  const validateForm = () => {
    const errors = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Validate location name
    if (!newSchedule.name.trim()) {
      errors.name = "Location name is required";
    } else if (newSchedule.name.trim().length < 3) {
      errors.name = "Location name must be at least 3 characters";
    } else if (!/^[a-zA-Z0-9\s-]+$/.test(newSchedule.name.trim())) {
      errors.name = "Location name can only contain letters, numbers, spaces and hyphens";
    }

    // Validate start date
    if (!newSchedule.startDate) {
      errors.startDate = "Start date is required";
    } else {
      const startDate = new Date(newSchedule.startDate);
      if (startDate < today) {
        errors.startDate = "Cannot select past dates";
      }

      // Check for existing schedule conflict
      const existingSchedule = schedule.locations.find(
        (loc) =>
          loc.startDate === newSchedule.startDate &&
          loc.name !== newSchedule.name &&
          loc.startTime === newSchedule.startTime
      );
      if (existingSchedule) {
        errors.startDate = "A schedule already exists for this date and time slot";
      }

      // Check if start date is blocked
      const isStartBlocked = blockedPeriods.some((period) => {
        const blockStart = new Date(period.startDate);
        if (period.type === "day") {
          return blockStart.toDateString() === startDate.toDateString();
        }
        const blockEnd = new Date(period.endDate);
        return startDate >= blockStart && startDate <= blockEnd;
      });
      if (isStartBlocked) {
        errors.startDate = "Selected start date is blocked";
      }
    }

    // Validate end date if provided
    if (newSchedule.endDate) {
      const startDate = new Date(newSchedule.startDate);
      const endDate = new Date(newSchedule.endDate);
      if (endDate < startDate) {
        errors.endDate = "End date cannot be before start date";
      }

      // Check if end date is blocked
      const isEndBlocked = blockedPeriods.some((period) => {
        const blockStart = new Date(period.startDate);
        if (period.type === "day") {
          return blockStart.toDateString() === endDate.toDateString();
        }
        const blockEnd = new Date(period.endDate);
        return endDate >= blockStart && endDate <= blockEnd;
      });
      if (isEndBlocked) {
        errors.endDate = "Selected end date is blocked";
      }

      // Validate days selection for multiple-day schedules
      const isMultipleDays = endDate.getTime() !== startDate.getTime();
      if (isMultipleDays) {
        const hasSelectedDays = Object.values(newSchedule.days).some((day) => day);
        if (!hasSelectedDays) {
          errors.days = "Please select at least one day for multiple day schedules";
        }
      }
    }

    // Validate times
    if (!newSchedule.startTime) {
      errors.startTime = "Start time is required";
    }
    if (!newSchedule.endTime) {
      errors.endTime = "End time is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const checkForBookingConflicts = async (schedule) => {
    try {
      const appointmentsRef = collection(db, "appointments");
      const appointmentsSnapshot = await getDocs(
        query(
          appointmentsRef,
          where("date", ">=", schedule.startDate),
          where("date", "<=", schedule.endDate || schedule.startDate),
          where("location", "==", schedule.name)
        )
      );

      const conflicts = [];
      appointmentsSnapshot.forEach((doc) => {
        const appointment = doc.data();
        if (
          appointment.time >= schedule.startTime &&
          appointment.time <= schedule.endTime
        ) {
          conflicts.push({
            date: appointment.date,
            time: appointment.time,
          });
        }
      });

      return conflicts;
    } catch (error) {
      console.error("Error checking conflicts:", error);
      throw error;
    }
  };

  const checkExistingBookings = async (index) => {
    try {
      const location = schedule.locations[index];
      if (!location) return false;

      const appointmentsRef = collection(db, "appointments","data","");
      const q = query(
        appointmentsRef,
        where("date", ">=", location.startDate),
        where("date", "<=", location.endDate || location.startDate),
        where("location", "==", location.name)
      );
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error("Error checking bookings:", error);
      return false;
    }
  };

  const handleSaveSchedule = async () => {
    try {
      if (!validateForm()) {
        showNotification("Please fix form errors before saving", "error");
        return;
      }
      setIsSaving(true);

      const startDate = new Date(newSchedule.startDate);
      const endDate = newSchedule.endDate ? new Date(newSchedule.endDate) : startDate;
      const isMultipleDays = endDate.getTime() !== startDate.getTime();

      const scheduleData = {
        ...newSchedule,
        id: Date.now().toString(),
        type: "schedule",
        createdAt: new Date().toISOString(),
        isMultipleDays,
        endDate: newSchedule.endDate || newSchedule.startDate,
      };

      const updatedLocations = [...schedule.locations, scheduleData].sort((a, b) => {
        const dateA = new Date(a.startDate);
        const dateB = new Date(b.startDate);
        if (dateA.getTime() === dateB.getTime()) {
          return new Date(a.createdAt) - new Date(b.createdAt);
        }
        return dateA - dateB;
      });

      await setDoc(doc(db, "settings", "schedule"), {
        locations: updatedLocations,
        defaultTimes: {
          startTime: newSchedule.startTime,
          endTime: newSchedule.endTime,
        },
        startDate: newSchedule.startDate,
        endDate: newSchedule.endDate || newSchedule.startDate,
      });

      setSchedule((prev) => ({
        ...prev,
        locations: updatedLocations,
      }));

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
        },
      });
      setShowAddScheduleForm(false);

      showNotification("Schedule saved successfully");
    } catch (error) {
      console.error("Error saving schedule:", error);
      showNotification("Error saving schedule: " + error.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (index) => {
    setDeleteConfirmation({
      show: true,
      periodId: null,
      locationIndex: index,
      scheduleId: null,
    });
  };

  const handleDeleteConfirm = async () => {
    try {
      const { locationIndex } = deleteConfirmation;
      if (locationIndex === null) return;

      setLoading(true);

      const hasBookings = await checkExistingBookings(locationIndex);
      if (hasBookings) {
        showNotification("Cannot delete schedule with existing bookings", "error");
        setDeleteConfirmation({
          show: false,
          periodId: null,
          locationIndex: null,
          scheduleId: null,
        });
        return;
      }

      const locationToDelete = schedule.locations[locationIndex];

      const updatedLocations = schedule.locations.filter((_, i) => i !== locationIndex);
      await setDoc(doc(db, "settings", "schedule"), {
        ...schedule,
        locations: updatedLocations,
      });

      const scheduleRef = collection(db, "appointments/data/schedule");
      const q = query(scheduleRef, where("location", "==", locationToDelete.name));
      const querySnapshot = await getDocs(q);
      const deletePromises = querySnapshot.docs.map((doc) => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      setSchedule((prev) => ({
        ...prev,
        locations: updatedLocations,
      }));

      setDeleteConfirmation({
        show: false,
        periodId: null,
        locationIndex: null,
        scheduleId: null,
      });

      showNotification("Schedule deleted successfully");
    } catch (error) {
      console.error("Error deleting schedule:", error);
      showNotification("Error deleting schedule: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLocation = async (index) => {
    handleDeleteClick(index);
  };

  const handleLocationUpdate = async () => {
    try {
      if (!newSchedule.name || !newSchedule.startDate) {
        showNotification("Please fill in all required fields", "error");
        return;
      }

      if (!validateForm()) {
        showNotification("Please fix form errors before updating", "error");
        return;
      }

      const updatedLocations = schedule.locations.map((loc, idx) =>
        idx === editingIndex ? { ...newSchedule, id: loc.id || Date.now().toString() } : loc
      );

      await setDoc(doc(db, "settings", "schedule"), {
        ...schedule,
        locations: updatedLocations,
      });

      setSchedule((prev) => ({
        ...prev,
        locations: updatedLocations,
      }));

      setShowAddScheduleForm(false);
      setEditingIndex(null);
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
        },
      });

      showNotification("Schedule updated successfully");
    } catch (error) {
      console.error("Error updating schedule:", error);
      showNotification("Error updating schedule: " + error.message, "error");
    }
  };

  const handleViewLocation = (location) => {
    setViewingLocation(location);
    setShowViewModal(true);
  };

  const handleEditLocation = (index) => {
    const locationToEdit = schedule.locations[index];
    setEditingIndex(index);
    setEditingLocation({ ...locationToEdit });
    setNewSchedule({ ...locationToEdit });
    setShowAddScheduleForm(true);
  };

  const handleDateRangeChange = (field, value) => {
    setDateRange((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNewBlockChange = (field, value) => {
    setNewBlock((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const addBlockedPeriod = async () => {
    if (!newBlock.startDate || (newBlock.type !== "day" && !newBlock.endDate) || !newBlock.reason) {
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

      await setDoc(doc(db, "settings", "blockedPeriods"), {
        periods: [...blockedPeriods, newPeriod],
        updatedAt: new Date().toISOString(),
      });

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
      scheduleId: null,
    });
  };

  const confirmRemoveBlockedPeriod = async () => {
    try {
      const { periodId } = deleteConfirmation;
      setBlockedPeriods((prev) => prev.filter((period) => period.id !== periodId));

      await setDoc(doc(db, "settings", "blockedPeriods"), {
        periods: blockedPeriods.filter((period) => period.id !== periodId),
        updatedAt: new Date().toISOString(),
      });

      setDeleteConfirmation({
        show: false,
        periodId: null,
        locationIndex: null,
        scheduleId: null,
      });
      showNotification("Blocked period removed successfully");
    } catch (error) {
      console.error("Error removing blocked period:", error);
      showNotification("Failed to remove blocked period", "error");
    }
  };

  const createTimeSlots = (location) => {
    try {
      if (!location || !location.startTime || !location.endTime) {
        console.error("Invalid location data:", location);
        return [];
      }

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
    } catch (error) {
      console.error("Error creating time slots:", error);
      return [];
    }
  };

  const generateScheduleDocuments = async () => {
    try {
      setLoading(true);

      const dataDocRef = doc(db, "appointments", "data");
      const dataDoc = await getDoc(dataDocRef);
      if (!dataDoc.exists()) {
        await setDoc(dataDocRef, {
          created: new Date(),
          description: "Container for appointment data",
        });
      }

      const scheduleRef = collection(db, "appointments/data/schedule");

      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);

      for (const location of schedule.locations || []) {
        if (!location.startDate) {
          console.warn(`Skipping location "${location.name}" due to missing dates`);
          continue;
        }

        const startDate = new Date(location.startDate);
        const endDate = new Date(location.endDate || location.startDate);

        if (startDate < currentDate) {
          console.warn(`Skipping location "${location.name}" due to past start date`);
          continue;
        }

        if (startDate > endDate) {
          console.warn(`Invalid date range for location "${location.name}"`);
          continue;
        }

        for (
          let currentDate = new Date(startDate);
          currentDate <= endDate;
          currentDate.setDate(currentDate.getDate() + 1)
        ) {
          const dateString = currentDate.toISOString().split("T")[0];
          const dayName = currentDate
            .toLocaleDateString("en-US", { weekday: "long" })
            .toLowerCase();

          if (dayName === "sunday") continue;
          if (!location.days[dayName]) continue;

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
          startTime: location.startTime || "09:00",
          endTime: location.endTime || "17:00",
          days: { ...location.days, sunday: false },
        })),
      };

      await setDoc(doc(db, "settings", "schedule"), {
        locations: updatedSchedule.locations.map((location) => ({
          name: location.name,
          startTime: location.startTime,
          endTime: location.endTime,
          startDate: location.startDate,
          endDate: location.endDate || location.startDate,
          timings: createTimeSlots(location),
          days: {
            monday: location.days.monday || false,
            tuesday: location.days.tuesday || false,
            wednesday: location.days.wednesday || false,
            thursday: location.days.thursday || false,
            friday: location.days.friday || false,
            saturday: location.days.saturday || false,
            sunday: false,
          },
        })),
        updatedAt: new Date().toISOString(),
      });

      await setDoc(doc(db, "settings", "blockedPeriods"), {
        periods: blockedPeriods,
        updatedAt: new Date().toISOString(),
      });

      const success = await generateScheduleDocuments();

      if (success) {
        showNotification("Schedule and availability settings saved successfully");
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

  const ViewModal = ({ location, onClose }) => {
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
              <label className="font-medium" style={{ color: currentTheme.text.primary }}>
                Location Name
              </label>
              <p style={{ color: currentTheme.text.secondary }}>{location.name}</p>
            </div>
            <div>
              <label className="font-medium" style={{ color: currentTheme.text.primary }}>
                Timing
              </label>
              <p style={{ color: currentTheme.text.secondary }}>
                {location.startTime} - {location.endTime}
              </p>
            </div>
            <div className="col-span-2">
              <label className="font-medium" style={{ color: currentTheme.text.primary }}>
                Available Days
              </label>
              <div className="flex gap-2 mt-1 text-black">
                {Object.entries(location.days).map(([day, isAvailable]) => (
                  <span
                    key={day}
                    className={`px-2 py-1 rounded`}
                    style={{
                      backgroundColor: isAvailable
                        ? currentTheme.success.light
                        : currentTheme.error.light,
                      color: isAvailable ? currentTheme.success.dark : currentTheme.error.dark,
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

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        const scheduleDoc = await getDoc(doc(db, "settings", "schedule"));
        if (scheduleDoc.exists()) {
          const data = scheduleDoc.data();
          setSchedule(data);

          if (data.defaultTimes) {
            setNewSchedule((prev) => ({
              ...prev,
              startTime: data.defaultTimes.startTime || "09:00",
              endTime: data.defaultTimes.endTime || "17:00",
            }));
          }
        } else {
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

        const blockedPeriodsDoc = await getDoc(doc(db, "settings", "blockedPeriods"));
        if (blockedPeriodsDoc.exists()) {
          setBlockedPeriods(blockedPeriodsDoc.data().periods || []);
        }

        const dateRangeDoc = await getDoc(doc(db, "settings", "schedule"));
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
        setLoading(false);
      }
    };

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

  return (
    <div className="p-0 relative">
      {notification.show && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center transition-opacity duration-300 ${
            notification.type === "error" ? "bg-red-500 text-white" : "bg-green-500 text-white"
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
            scheduleId: null,
          })
        }
        onConfirm={
          deleteConfirmation.periodId ? confirmRemoveBlockedPeriod : handleDeleteConfirm
        }
        title={deleteConfirmation.periodId ? "Delete Blocked Period" : "Remove Schedule"}
        message={
          deleteConfirmation.periodId
            ? "Are you sure you want to remove this blocked period? This action cannot be undone."
            : "Are you sure you want to remove this schedule? This action cannot be undone."
        }
      />

      <h2 className="text-2xl font-bold mb-6" style={{ color: currentTheme.text.primary }}>
        Configure Schedule & Availability
      </h2>

      <div className="flex border-b mb-6" style={{ borderColor: currentTheme.border }}>
        <button
          className={`px-4 py-2 mr-2 font-medium rounded-t-lg transition-colors ${
            selectedTab === "schedule" ? "border-b-2" : ""
          }`}
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
          className={`px-4 py-2 mr-2 font-medium rounded-t-lg transition-colors flex items-center ${
            selectedTab === "blocks" ? "border-b-2" : ""
          }`}
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
              {showAddScheduleForm
                ? editingIndex !== null
                  ? "Edit Schedule"
                  : "Add New Schedule"
                : "Schedule List"}
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
                    },
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
                        onClick={() => handleEditLocation(index)}
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
                          className={`px-2 py-1 text-sm rounded ${
                            isAvailable ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}
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
                <div>
                  <CustomInput
                    label="Location Name"
                    value={newSchedule.name}
                    onChange={(e) => setNewSchedule({ ...newSchedule, name: e.target.value })}
                    placeholder="Enter location name"
                  />
                  {formErrors.name && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>
                  )}
                </div>
                <div>
                  <CustomInput
                    type="date"
                    label="Start Date"
                    value={newSchedule.startDate}
                    onChange={(e) => setNewSchedule({ ...newSchedule, startDate: e.target.value })}
                    icon={<Calendar size={20} />}
                  />
                  {formErrors.startDate && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.startDate}</p>
                  )}
                </div>
                <div>
                  <CustomInput
                    type="date"
                    label="End Date (Optional)"
                    value={newSchedule.endDate}
                    onChange={(e) => setNewSchedule({ ...newSchedule, endDate: e.target.value })}
                    icon={<Calendar size={20} />}
                  />
                  {formErrors.endDate && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.endDate}</p>
                  )}
                </div>
                <div>
                  <CustomInput
                    type="time"
                    label="Start Time"
                    value={newSchedule.startTime}
                    onChange={(e) => setNewSchedule({ ...newSchedule, startTime: e.target.value })}
                    icon={<Clock size={20} />}
                  />
                  {formErrors.startTime && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.startTime}</p>
                  )}
                </div>
                <div>
                  <CustomInput
                    type="time"
                    label="End Time"
                    value={newSchedule.endTime}
                    onChange={(e) => setNewSchedule({ ...newSchedule, endTime: e.target.value })}
                    icon={<Clock size={20} />}
                  />
                  {formErrors.endTime && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.endTime}</p>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <label className="block mb-2" style={{ color: currentTheme.text.primary }}>
                  Available Days
                </label>
                <div className="flex flex-wrap gap-3">
                  {formErrors.days && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.days}</p>
                  )}
                  {Object.entries(newSchedule.days).map(([day, isSelected]) => (
                    <button
                      key={day}
                      onClick={() =>
                        setNewSchedule({
                          ...newSchedule,
                          days: { ...newSchedule.days, [day]: !isSelected },
                        })
                      }
                      className={`px-3 py-1 rounded-full ${
                        isSelected ? "bg-primary text-white" : "bg-gray-200 text-black"
                      }`}
                      style={isSelected ? { backgroundColor: currentTheme.primary } : {}}
                    >
                      {day.charAt(0).toUpperCase() + day.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <CustomButton
                  onClick={() => {
                    setShowAddScheduleForm(false);
                    setEditingIndex(null);
                  }}
                  variant="outlined"
                >
                  Cancel
                </CustomButton>
                <CustomButton
                  onClick={() => {
                    if (editingIndex !== null) {
                      handleLocationUpdate();
                    } else {
                      handleSaveSchedule();
                    }
                  }}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : editingIndex !== null ? "Update Changes" : "Save Changes"}
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
                onChange={(e) => handleNewBlockChange("startDate", e.target.value)}
                min={getTodayString()}
                required
              />
              {newBlock.type !== "day" && (
                <CustomInput
                  label="End Date"
                  type="date"
                  value={newBlock.endDate}
                  className="w-full sm:w-auto"
                  onChange={(e) => handleNewBlockChange("endDate", e.target.value)}
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
                      borderColor: isBlockActive(period) ? "#ef4444" : currentTheme.border,
                      backgroundColor: isBlockActive(period)
                        ? "rgba(239, 68, 68, 0.1)"
                        : currentTheme.surface,
                    }}
                  >
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <strong className="mr-2" style={{ color: currentTheme.text.primary }}>
                          {formatBlockType(period.type)}
                        </strong>
                        {isBlockActive(period) && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <AlertTriangle size={12} className="mr-1" />
                            Active Now
                          </span>
                        )}
                      </div>
                      <div className="text-sm mb-2" style={{ color: currentTheme.text.secondary }}>
                        <Clock size={14} className="inline mr-1" />
                        {period.type === "day" ? (
                          <span>Date: {formatDate(period.startDate)}</span>
                        ) : (
                          <span>
                            From {formatDate(period.startDate)} to {formatDate(period.endDate)}
                          </span>
                        )}
                      </div>
                      <div className="text-sm">
                        <span style={{ color: currentTheme.text.secondary }}>Message: </span>
                        <span style={{ color: currentTheme.text.primary }}>{period.reason}</span>
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