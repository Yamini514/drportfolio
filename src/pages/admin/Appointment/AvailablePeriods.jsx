import React, { useState, useEffect, useCallback } from "react";
import {
  collection,
  doc,
  setDoc,
  getDocs,
  addDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../../firebase/config";
import { useTheme } from "../../../context/ThemeContext";
import CustomButton from "../../../components/CustomButton";
import CustomInput from "../../../components/CustomInput";
import CustomSelect from "../../../components/CustomSelect";
import CustomDeleteConfirmation from "../../../components/CustomDeleteConfirmation";
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Pencil,
  CheckCircle,
  AlertTriangle,
  Timer,
  Settings,
  Info,
} from "lucide-react";

const dayOrder = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const appointmentDurationOptions = [
  { value: 15, label: "15 minutes" },
  { value: 20, label: "20 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
  { value: 120, label: "2 hours" },
];

const bufferTimeOptions = [
  { value: 0, label: "No buffer" },
  { value: 5, label: "5 minutes" },
  { value: 10, label: "10 minutes" },
  { value: 15, label: "15 minutes" },
  { value: 20, label: "20 minutes" },
  { value: 30, label: "30 minutes" },
];

const advanceBookingOptions = [
  { value: 1, label: "1 day" },
  { value: 7, label: "1 week" },
  { value: 14, label: "2 weeks" },
  { value: 30, label: "1 month" },
  { value: 60, label: "2 months" },
  { value: 90, label: "3 months" },
  { value: 180, label: "6 months" },
  { value: 365, label: "1 year" },
];

const minAdvanceBookingOptions = [
  { value: 0.5, label: "30 minutes" },
  { value: 1, label: "1 hour" },
  { value: 2, label: "2 hours" },
  { value: 4, label: "4 hours" },
  { value: 12, label: "12 hours" },
  { value: 24, label: "1 day" },
  { value: 48, label: "2 days" },
];

const AvailablePeriods = () => {
  const { currentTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [availablePeriods, setAvailablePeriods] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "",
  });
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    show: false,
    periodId: null,
  });
  const [formData, setFormData] = useState({
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
    scheduleType: "specific-dates", // "specific-dates" or "recurring-days" or "ongoing-recurring"
    appointmentDuration: 30,
    bufferTime: 5,
    maxAdvanceBookingDays: 90,
    minAdvanceBookingHours: 2,
  });
  const [errors, setErrors] = useState({});

  const showNotification = useCallback((message, type = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(
      () => setNotification({ show: false, message: "", type: "" }),
      5000
    );
  }, []);

  const getTodayString = () => new Date().toISOString().split("T")[0];
  const getMaxDateString = () => {
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 2);
    return maxDate.toISOString().split("T")[0];
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return "";
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const calculateTotalSlots = (
    startTime,
    endTime,
    appointmentDuration,
    bufferTime
  ) => {
    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const totalMinutes = endMinutes - startMinutes;

    const slotDuration = appointmentDuration + bufferTime;
    return Math.floor(totalMinutes / slotDuration);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Location name is required";
    } else if (formData.name.trim().length < 3) {
      newErrors.name = "Location name must be at least 3 characters";
    }

    if (!formData.startTime) {
      newErrors.startTime = "Start time is required";
    }

    if (!formData.endTime) {
      newErrors.endTime = "End time is required";
    } else if (formData.startTime >= formData.endTime) {
      newErrors.endTime = "End time must be after start time";
    }

    // Validate if there's enough time for at least one appointment
    if (formData.startTime && formData.endTime) {
      const totalSlots = calculateTotalSlots(
        formData.startTime,
        formData.endTime,
        formData.appointmentDuration,
        formData.bufferTime
      );
      if (totalSlots < 1) {
        newErrors.endTime =
          "Time period too short for any appointments with current duration and buffer settings";
      }
    }

    if (!formData.startDate) {
      newErrors.startDate = "Start date is required";
    } else {
      const startDate = new Date(formData.startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (startDate < today) {
        newErrors.startDate = "Cannot select past dates";
      }
    }

    // Validation based on schedule type
    if (formData.scheduleType === "specific-dates") {
      // For specific dates, end date is required
      if (!formData.endDate) {
        newErrors.endDate = "End date is required for specific date range";
      } else {
        const startDate = new Date(formData.startDate);
        const endDate = new Date(formData.endDate);
        if (endDate < startDate) {
          newErrors.endDate = "End date cannot be before start date";
        }
      }
    } else if (formData.scheduleType === "recurring-days") {
      // For recurring days within a date range
      if (!formData.endDate) {
        newErrors.endDate = "End date is required for recurring schedule with end date";
      } else {
        const startDate = new Date(formData.startDate);
        const endDate = new Date(formData.endDate);
        if (endDate < startDate) {
          newErrors.endDate = "End date cannot be before start date";
        }
      }
      
      const hasSelectedDays = Object.values(formData.days).some((day) => day);
      if (!hasSelectedDays) {
        newErrors.days = "Please select at least one day for recurring schedule";
      }
    } else if (formData.scheduleType === "ongoing-recurring") {
      // For ongoing recurring, days are required
      const hasSelectedDays = Object.values(formData.days).some((day) => day);
      if (!hasSelectedDays) {
        newErrors.days = "Please select at least one day for ongoing recurring schedule";
      }
    }

    if (formData.appointmentDuration <= 0) {
      newErrors.appointmentDuration =
        "Appointment duration must be greater than 0";
    }

    if (formData.bufferTime < 0) {
      newErrors.bufferTime = "Buffer time cannot be negative";
    }

    if (formData.maxAdvanceBookingDays <= 0) {
      newErrors.maxAdvanceBookingDays =
        "Maximum advance booking must be at least 1 day";
    }

    if (formData.minAdvanceBookingHours < 0) {
      newErrors.minAdvanceBookingHours =
        "Minimum advance booking cannot be negative";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setFormData({
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
      scheduleType: "specific-dates",
      appointmentDuration: 30,
      bufferTime: 5,
      maxAdvanceBookingDays: 90,
      minAdvanceBookingHours: 2,
    });
    setErrors({});
    setEditingIndex(null);
  };

  const loadAvailablePeriods = useCallback(async () => {
    setLoading(true);
    try {
      const periodsRef = collection(
        db,
        "schedules",
        "available-periods",
        "periods"
      );
      const querySnapshot = await getDocs(periodsRef);
      const periods = [];
      querySnapshot.forEach((doc) => {
        periods.push({
          id: doc.id,
          ...doc.data(),
        });
      });
      setAvailablePeriods(periods);
    } catch (error) {
      console.error("Error loading available periods:", error);
      showNotification("Failed to load available periods", "error");
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      const periodsRef = collection(
        db,
        "schedules",
        "available-periods",
        "periods"
      );

      // Determine if it's recurring based on schedule type
      const isRecurring = formData.scheduleType !== "specific-dates";
      
      const periodData = {
        ...formData,
        isRecurring,
        // Only include endDate for specific-dates and recurring-days
        endDate: formData.scheduleType === "ongoing-recurring" ? null : formData.endDate,
        updatedAt: new Date().toISOString(),
        createdAt:
          editingIndex === null
            ? new Date().toISOString()
            : availablePeriods[editingIndex].createdAt,
      };

      if (editingIndex !== null) {
        // Update existing period
        const periodId = availablePeriods[editingIndex].id;
        await setDoc(doc(periodsRef, periodId), periodData);
      } else {
        // Add new period
        await addDoc(periodsRef, periodData);
      }

      await loadAvailablePeriods();
      setShowAddForm(false);
      resetForm();
      showNotification(
        editingIndex !== null
          ? "Available period updated successfully"
          : "Available period added successfully"
      );
    } catch (error) {
      console.error("Error saving available period:", error);
      showNotification("Failed to save available period", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (index) => {
    const period = availablePeriods[index];
    
    // Determine schedule type from the period data
    let scheduleType = "specific-dates";
    if (period.isRecurring && !period.endDate) {
      scheduleType = "ongoing-recurring";
    } else if (period.isRecurring && period.endDate) {
      scheduleType = "recurring-days";
    }
    
    setFormData({
      name: period.name,
      startTime: period.startTime,
      endTime: period.endTime,
      startDate: period.startDate,
      endDate: period.endDate || "",
      days: period.days || {
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false,
      },
      scheduleType,
      appointmentDuration: period.appointmentDuration || 30,
      bufferTime: period.bufferTime || 5,
      maxAdvanceBookingDays: period.maxAdvanceBookingDays || 90,
      minAdvanceBookingHours: period.minAdvanceBookingHours || 2,
    });
    setEditingIndex(index);
    setShowAddForm(true);
  };

  const handleDelete = async () => {
    try {
      const periodId = deleteConfirmation.periodId;
      const periodsRef = collection(
        db,
        "schedules",
        "available-periods",
        "periods"
      );
      await deleteDoc(doc(periodsRef, periodId));

      await loadAvailablePeriods();
      setDeleteConfirmation({ show: false, periodId: null });
      showNotification("Available period deleted successfully");
    } catch (error) {
      console.error("Error deleting available period:", error);
      showNotification("Failed to delete available period", "error");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name.includes("Hours") ? parseFloat(value) : parseInt(value),
    }));
  };

  const handleScheduleTypeChange = (e) => {
    const newType = e.target.value;
    setFormData((prev) => ({
      ...prev,
      scheduleType: newType,
      // Reset days when switching to specific-dates
      days: newType === "specific-dates" ? {
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false,
      } : prev.days,
      // Clear end date when switching to ongoing-recurring
      endDate: newType === "ongoing-recurring" ? "" : prev.endDate,
    }));
  };

  const getScheduleTypeDescription = () => {
    switch (formData.scheduleType) {
      case "specific-dates":
        return "Available every day between the start and end dates";
      case "recurring-days":
        return "Available only on selected days between the start and end dates";
      case "ongoing-recurring":
        return "Available on selected days every week, starting from the start date (no end date)";
      default:
        return "";
    }
  };

  useEffect(() => {
    loadAvailablePeriods();
  }, [loadAvailablePeriods]);

  return (
    <div>
      {/* Notification */}
      {notification.show && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center transition-opacity duration-300 ${
            notification.type === "error"
              ? "bg-red-500 text-white"
              : "bg-green-500 text-white"
          }`}
          role="alert"
        >
          {notification.type === "error" ? (
            <AlertTriangle size={20} className="mr-2" />
          ) : (
            <CheckCircle size={20} className="mr-2" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Delete Confirmation */}
      <CustomDeleteConfirmation
        isOpen={deleteConfirmation.show}
        onClose={() => setDeleteConfirmation({ show: false, periodId: null })}
        onConfirm={handleDelete}
        title="Delete Available Period"
        message="Are you sure you want to delete this available period? This action cannot be undone and may affect existing appointments."
      />

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h3
          className="text-xl font-semibold"
          style={{ color: currentTheme.text.primary }}
        >
          {showAddForm
            ? editingIndex !== null
              ? "Edit Available Period"
              : "Add Available Period"
            : "Available Periods"}
        </h3>
        {!showAddForm && (
          <CustomButton
            onClick={() => {
              resetForm();
              setShowAddForm(true);
            }}
            icon={Plus}
          >
            Add Available Period
          </CustomButton>
        )}
      </div>

      {/* Form */}
      {showAddForm && (
        <div
          className="bg-white rounded-lg p-6 mb-6"
          style={{ backgroundColor: currentTheme.surface }}
        >
          {/* Basic Information */}
          <div className="mb-6">
            <h4
              className="text-lg font-medium mb-4"
              style={{ color: currentTheme.text.primary }}
            >
              Basic Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <CustomInput
                  label="Location Name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter location name (e.g., Main Office, Clinic A)"
                  error={errors.name}
                />
              </div>

              <div>
                <CustomInput
                  type="time"
                  label="Start Time"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleInputChange}
                  error={errors.startTime}
                />
              </div>

              <div>
                <CustomInput
                  type="time"
                  label="End Time"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleInputChange}
                  error={errors.endTime}
                />
              </div>
            </div>
          </div>

          {/* Schedule Type Selection */}
          <div className="mb-6">
            <h4
              className="text-lg font-medium mb-4"
              style={{ color: currentTheme.text.primary }}
            >
              Schedule Type
            </h4>
            
            <div className="space-y-4">
              <div>
                <label className="block mb-2 font-medium" style={{ color: currentTheme.text.primary }}>
                  How do you want to set your availability? *
                </label>
                <select
                  value={formData.scheduleType}
                  onChange={handleScheduleTypeChange}
                  className="w-full p-3 border rounded-lg"
                  style={{ 
                    backgroundColor: currentTheme.surface,
                    borderColor: currentTheme.border,
                    color: currentTheme.text.primary
                  }}
                >
                  <option value="specific-dates">Specific Date Range (All days)</option>
                  <option value="recurring-days">Specific Date Range (Selected days only)</option>
                  <option value="ongoing-recurring">Ongoing Weekly Schedule (Selected days)</option>
                </select>
              </div>

              {/* Description */}
              <div
                className="p-3 rounded-lg flex items-start gap-2"
                style={{ backgroundColor: currentTheme.muted }}
              >
                <Info size={16} className="mt-0.5 flex-shrink-0" style={{ color: currentTheme.text.secondary }} />
                <p className="text-sm" style={{ color: currentTheme.text.secondary }}>
                  {getScheduleTypeDescription()}
                </p>
              </div>
            </div>
          </div>

          {/* Date Selection */}
          <div className="mb-6">
            <h4
              className="text-lg font-medium mb-4"
              style={{ color: currentTheme.text.primary }}
            >
              Date Range
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <CustomInput
                  type="date"
                  label="Start Date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  min={getTodayString()}
                  max={getMaxDateString()}
                  error={errors.startDate}
                />
              </div>

              {formData.scheduleType !== "ongoing-recurring" && (
                <div>
                  <CustomInput
                    type="date"
                    label="End Date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    min={formData.startDate || getTodayString()}
                    max={getMaxDateString()}
                    error={errors.endDate}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Days Selection for recurring schedules */}
          {(formData.scheduleType === "recurring-days" || formData.scheduleType === "ongoing-recurring") && (
            <div className="mb-6">
              <h4
                className="text-lg font-medium mb-4"
                style={{ color: currentTheme.text.primary }}
              >
                Available Days
              </h4>
              <div>
                <label
                  className="block mb-2 font-medium"
                  style={{ color: currentTheme.text.primary }}
                >
                  Select the days when you are available *
                </label>
                <div className="flex flex-wrap gap-2">
                  {dayOrder.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          days: { ...prev.days, [day]: !prev.days[day] },
                        }))
                      }
                      className={`px-4 py-2 rounded-full font-medium transition-colors ${
                        formData.days[day] ? "text-white" : "text-gray-700"
                      }`}
                      style={{
                        backgroundColor: formData.days[day]
                          ? currentTheme.primary
                          : currentTheme.muted,
                      }}
                    >
                      {day.charAt(0).toUpperCase() + day.slice(1)}
                    </button>
                  ))}
                </div>
                {errors.days && (
                  <p className="text-red-500 text-sm mt-2">{errors.days}</p>
                )}
              </div>
            </div>
          )}

          {/* Appointment Settings */}
          <div className="mb-6">
            <h4
              className="text-lg font-medium mb-4"
              style={{ color: currentTheme.text.primary }}
            >
              <Settings size={18} className="inline mr-2" />
              Appointment Settings
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CustomSelect
                label="Appointment Duration *"
                name="appointmentDuration"
                value={formData.appointmentDuration}
                onChange={handleSelectChange}
                options={appointmentDurationOptions}
                error={errors.appointmentDuration}
              />

              <CustomSelect
                label="Buffer Time Between Appointments"
                name="bufferTime"
                value={formData.bufferTime}
                onChange={handleSelectChange}
                options={bufferTimeOptions}
                error={errors.bufferTime}
              />

              <CustomSelect
                label="Maximum Advance Booking"
                name="maxAdvanceBookingDays"
                value={formData.maxAdvanceBookingDays}
                onChange={handleSelectChange}
                options={advanceBookingOptions}
                error={errors.maxAdvanceBookingDays}
              />

              <CustomSelect
                label="Minimum Advance Booking"
                name="minAdvanceBookingHours"
                value={formData.minAdvanceBookingHours}
                onChange={handleSelectChange}
                options={minAdvanceBookingOptions}
                error={errors.minAdvanceBookingHours}
              />
            </div>

            {/* Slot Calculation Display */}
            {formData.startTime && formData.endTime && (
              <div
                className="mt-4 p-3 rounded-lg"
                style={{ backgroundColor: currentTheme.muted }}
              >
                <div
                  className="flex items-center text-sm"
                  style={{ color: currentTheme.text.secondary }}
                >
                  <Timer size={16} className="mr-2" />
                  <span>
                    Available slots per day:{" "}
                    {calculateTotalSlots(
                      formData.startTime,
                      formData.endTime,
                      formData.appointmentDuration,
                      formData.bufferTime
                    )}{" "}
                    appointments
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div
            className="flex justify-end gap-3 pt-4 border-t"
            style={{ borderColor: currentTheme.border }}
          >
            <CustomButton
              onClick={() => {
                setShowAddForm(false);
                resetForm();
              }}
              variant="outlined"
            >
              Cancel
            </CustomButton>
            <CustomButton onClick={handleSave} disabled={isSaving}>
              {isSaving
                ? "Saving..."
                : editingIndex !== null
                ? "Update Period"
                : "Save Period"}
            </CustomButton>
          </div>
        </div>
      )}

      {/* Available Periods List */}
      {!showAddForm && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-8">
              <p style={{ color: currentTheme.text.secondary }}>
                Loading available periods...
              </p>
            </div>
          ) : availablePeriods.length === 0 ? (
            <div
              className="col-span-full text-center py-8 border rounded-lg"
              style={{
                borderColor: currentTheme.border,
                backgroundColor: currentTheme.surface,
              }}
            >
              <Calendar size={32} className="mx-auto mb-2 opacity-50" />
              <p style={{ color: currentTheme.text.secondary }}>
                No available periods configured
              </p>
              <p
                className="text-sm mt-1"
                style={{ color: currentTheme.text.secondary }}
              >
                Add your first available period to start accepting appointments
              </p>
            </div>
          ) : (
            availablePeriods.map((period, index) => (
              <div
                key={period.id}
                className="rounded-lg p-5 shadow-md border"
                style={{
                  backgroundColor: currentTheme.surface,
                  borderColor: currentTheme.border,
                }}
              >
                <div className="flex justify-between items-start mb-4">
                  <h4
                    className="text-lg font-semibold"
                    style={{ color: currentTheme.text.primary }}
                  >
                    {period.name}
                  </h4>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(index)}
                      className="p-2 rounded hover:bg-gray-100 transition-colors"
                      title="Edit period"
                    >
                      <Pencil
                        size={16}
                        style={{ color: currentTheme.text.secondary }}
                      />
                    </button>
                    <button
                      onClick={() =>
                        setDeleteConfirmation({
                          show: true,
                          periodId: period.id,
                        })
                      }
                      className="p-2 rounded hover:bg-gray-100 transition-colors"
                      title="Delete period"
                    >
                      <Trash2 size={16} className="text-red-500" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div
                    className="flex items-center"
                    style={{ color: currentTheme.text.secondary }}
                  >
                    <Clock size={14} className="mr-2" />
                    <span>
                      {formatTime(period.startTime)} -{" "}
                      {formatTime(period.endTime)}
                    </span>
                  </div>

                  <div
                    className="flex items-center"
                    style={{ color: currentTheme.text.secondary }}
                  >
                    <Calendar size={14} className="mr-2" />
                    <span>
                      {period.isRecurring && !period.endDate
                        ? `From ${formatDate(period.startDate)} (Ongoing)`
                        : period.isRecurring && period.endDate
                        ? `${formatDate(period.startDate)} - ${formatDate(period.endDate)} (Selected days)`
                        : `${formatDate(period.startDate)} - ${formatDate(period.endDate)} (All days)`}
                    </span>
                  </div>

                  <div
                    className="flex items-center"
                    style={{ color: currentTheme.text.secondary }}
                  >
                    <Timer size={14} className="mr-2" />
                    <span>
                      {period.appointmentDuration || 30}min appointments
                      {(period.bufferTime || 0) > 0 &&
                        ` + ${period.bufferTime}min buffer`}
                    </span>
                  </div>

                  <div
                    className="grid grid-cols-2 gap-2 text-xs"
                    style={{ color: currentTheme.text.secondary }}
                  >
                    <div>
                      Max advance: {period.maxAdvanceBookingDays || 90} days
                    </div>
                    <div>
                      Min advance: {period.minAdvanceBookingHours || 2}h
                    </div>
                  </div>

                  {/* Show schedule type indicator */}
                  <div className="pt-2">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        period.isRecurring && !period.endDate
                          ? "bg-blue-100 text-blue-800"
                          : period.isRecurring && period.endDate
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {period.isRecurring && !period.endDate
                        ? "Ongoing Weekly"
                        : period.isRecurring && period.endDate
                        ? "Recurring Days"
                        : "Specific Dates"}
                    </span>
                  </div>

                  {/* Show selected days for recurring schedules */}
                  {period.isRecurring && period.days && (
                    <div className="pt-2">
                      <div className="flex flex-wrap gap-1">
                        {dayOrder.map((day) => (
                          <span
                            key={day}
                            className={`px-2 py-1 text-xs rounded ${
                              period.days[day]
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Total slots calculation */}
                  <div
                    className="pt-2 border-t"
                    style={{ borderColor: currentTheme.border }}
                  >
                    <div
                      className="flex items-center text-xs"
                      style={{ color: currentTheme.text.secondary }}
                    >
                      <Timer size={12} className="mr-1" />
                      <span>
                        {calculateTotalSlots(
                          period.startTime,
                          period.endTime,
                          period.appointmentDuration || 30,
                          period.bufferTime || 5
                        )}{" "}
                        slots per day
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default AvailablePeriods;