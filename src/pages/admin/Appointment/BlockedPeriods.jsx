import React, { useState, useEffect, useCallback } from "react";
import {
  collection,
  doc,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
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
  AlertTriangle,
  CheckCircle,
  Edit3,
  Mail,
  Users,
  Info,
} from "lucide-react";

const blockTypeOptions = [
  { value: "single", label: "Single Day" },
  { value: "range", label: "Date Range" },
  { value: "time-slot", label: "Specific Time Slot" },
];

const BlockedPeriods = () => {
  const { currentTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);
  const [blockedPeriods, setBlockedPeriods] = useState([]);
  const [availableLocations, setAvailableLocations] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState(null);
  const [conflictingAppointments, setConflictingAppointments] = useState([]);
  const [showConflictWarning, setShowConflictWarning] = useState(false);
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
    type: "single",
    location: "",
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    reason: "",
    notifyPatients: true,
    isEmergency: false,
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
    maxDate.setFullYear(maxDate.getFullYear() + 1);
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

  const validateForm = () => {
    const newErrors = {};

    if (!formData.location) {
      newErrors.location = "Location is required";
    }

    if (!formData.startDate) {
      newErrors.startDate = "Start date is required";
    } else {
      const startDate = new Date(formData.startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (startDate < today && !formData.isEmergency) {
        newErrors.startDate = "Cannot select past dates (unless emergency)";
      }
    }

    if (formData.type === "range" && !formData.endDate) {
      newErrors.endDate = "End date is required for date range";
    } else if (formData.type === "range" && formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      if (endDate < startDate) {
        newErrors.endDate = "End date cannot be before start date";
      }
    }

    if (formData.type === "time-slot") {
      if (!formData.startTime) {
        newErrors.startTime = "Start time is required for time slot blocking";
      }
      if (!formData.endTime) {
        newErrors.endTime = "End time is required for time slot blocking";
      } else if (formData.startTime && formData.startTime >= formData.endTime) {
        newErrors.endTime = "End time must be after start time";
      }
    }

    if (!formData.reason.trim()) {
      newErrors.reason = "Reason is required";
    } else if (formData.reason.trim().length < 5) {
      newErrors.reason = "Reason must be at least 5 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      type: "single",
      location: "",
      startDate: "",
      endDate: "",
      startTime: "",
      endTime: "",
      reason: "",
      notifyPatients: true,
      isEmergency: false,
    });
    setErrors({});
    setEditingPeriod(null);
    setConflictingAppointments([]);
    setShowConflictWarning(false);
  };

  const loadAvailableLocations = useCallback(async () => {
    try {
      const periodsRef = collection(db, "schedules", "available-periods", "periods");
      const querySnapshot = await getDocs(periodsRef);
      const locations = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (!locations.find(loc => loc.value === data.name)) {
          locations.push({
            value: data.name,
            label: data.name,
          });
        }
      });
      
      setAvailableLocations(locations);
    } catch (error) {
      console.error("Error loading available locations:", error);
    }
  }, []);

  const checkConflictingAppointments = useCallback(async () => {
    setIsCheckingConflicts(true);
    try {
      // For now, we'll simulate this functionality
      // const appointmentsRef = collection(db, "appointments", "bookings", "appointments");
      const conflicts = [];
      
      // TODO: Implement actual conflict checking logic here
      // This should query appointments that fall within the blocked period
      
      setConflictingAppointments(conflicts);
      setShowConflictWarning(conflicts.length > 0);
      return conflicts;
    } catch (error) {
      console.error("Error checking conflicting appointments:", error);
      return [];
    } finally {
      setIsCheckingConflicts(false);
    }
  }, []);

  const loadBlockedPeriods = useCallback(async () => {
    setLoading(true);
    try {
      const periodsRef = collection(db, "schedules", "blocked-periods", "periods");
      const querySnapshot = await getDocs(periodsRef);
      const periods = [];
      
      querySnapshot.forEach((doc) => {
        periods.push({
          id: doc.id,
          ...doc.data(),
        });
      });
      
      // Sort by start date (most recent first)
      periods.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
      setBlockedPeriods(periods);
    } catch (error) {
      console.error("Error loading blocked periods:", error);
      showNotification("Failed to load blocked periods", "error");
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  const handleFormSubmit = async () => {
    if (!validateForm()) return;

    // Check for conflicting appointments before saving
    await checkConflictingAppointments(formData);
    
    // If there are conflicts and it's not an emergency, show warning
    if (conflictingAppointments.length > 0 && !formData.isEmergency) {
      // For now, we'll proceed anyway, but in a real app you'd want user confirmation
    }

    handleSave();
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const periodsRef = collection(db, "schedules", "blocked-periods", "periods");
      
      const periodData = {
        ...formData,
        endDate: formData.type === "single" ? formData.startDate : formData.endDate,
        startTime: formData.type === "time-slot" ? formData.startTime : "",
        endTime: formData.type === "time-slot" ? formData.endTime : "",
        conflictingAppointmentsCount: conflictingAppointments.length,
        createdAt: editingPeriod ? editingPeriod.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (editingPeriod) {
        await updateDoc(doc(periodsRef, editingPeriod.id), periodData);
        showNotification("Blocked period updated successfully");
      } else {
        await addDoc(periodsRef, periodData);
        showNotification("Blocked period added successfully");
      }
      
      await loadBlockedPeriods();
      setShowAddForm(false);
      resetForm();

      // TODO: Send notifications to affected patients if notifyPatients is true
      if (formData.notifyPatients && conflictingAppointments.length > 0) {
        showNotification(`${conflictingAppointments.length} patients will be notified`, "info");
      }

    } catch (error) {
      console.error("Error saving blocked period:", error);
      showNotification("Failed to save blocked period", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (period) => {
    setFormData({
      type: period.type || "single",
      location: period.location,
      startDate: period.startDate,
      endDate: period.endDate === period.startDate ? "" : period.endDate,
      startTime: period.startTime || "",
      endTime: period.endTime || "",
      reason: period.reason,
      notifyPatients: period.notifyPatients !== false,
      isEmergency: period.isEmergency || false,
    });
    setEditingPeriod(period);
    setShowAddForm(true);
  };

  const handleDelete = async () => {
    try {
      const periodId = deleteConfirmation.periodId;
      const periodsRef = collection(db, "schedules", "blocked-periods", "periods");
      await deleteDoc(doc(periodsRef, periodId));
      
      await loadBlockedPeriods();
      setDeleteConfirmation({ show: false, periodId: null });
      showNotification("Blocked period deleted successfully");
    } catch (error) {
      console.error("Error deleting blocked period:", error);
      showNotification("Failed to delete blocked period", "error");
    }
  };

  const getBlockStatus = (period) => {
    const now = new Date();
    const startDate = new Date(period.startDate);
    const endDate = new Date(period.endDate || period.startDate);
    
    now.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    
    if (now < startDate) {
      return { 
        status: "upcoming", 
        color: "bg-blue-100 text-blue-800",
        label: "Upcoming"
      };
    } else if (now >= startDate && now <= endDate) {
      return { 
        status: "active", 
        color: "bg-red-100 text-red-800",
        label: "Active"
      };
    } else {
      return { 
        status: "past", 
        color: "bg-gray-100 text-gray-600",
        label: "Past"
      };
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    // Clear end date when switching to single day
    if (name === "type" && value === "single") {
      setFormData((prev) => ({ ...prev, endDate: "" }));
    }

    // Clear times when not using time-slot
    if (name === "type" && value !== "time-slot") {
      setFormData((prev) => ({ ...prev, startTime: "", endTime: "" }));
    }
  };

  useEffect(() => {
    loadAvailableLocations();
    loadBlockedPeriods();
  }, [loadAvailableLocations, loadBlockedPeriods]);

  return (
    <div>
      {/* Notification */}
      {notification.show && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center transition-opacity duration-300 ${
            notification.type === "error"
              ? "bg-red-500 text-white"
              : notification.type === "info"
              ? "bg-blue-500 text-white"
              : "bg-green-500 text-white"
          }`}
          role="alert"
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
        isOpen={deleteConfirmation.show}
        onClose={() =>
          setDeleteConfirmation({ show: false, periodId: null })
        }
        onConfirm={handleDelete}
        title="Delete Blocked Period"
        message="Are you sure you want to delete this blocked period? This action cannot be undone and may affect existing appointments."
      />

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h3
          className="text-xl font-semibold"
          style={{ color: currentTheme.text.primary }}
        >
          {showAddForm 
            ? editingPeriod 
              ? "Edit Blocked Period" 
              : "Add Blocked Period" 
            : "Blocked Periods"}
        </h3>
        {!showAddForm && (
          <CustomButton
            onClick={() => {
              resetForm();
              setShowAddForm(true);
            }}
            icon={Plus}
          >
            Add Blocked Period
          </CustomButton>
        )}
      </div>

      {/* Form */}
      {showAddForm && (
        <div
          className="bg-white rounded-lg p-6 mb-6"
          style={{ backgroundColor: currentTheme.surface }}
        >
          {/* Block Type and Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <CustomSelect
              label="Block Type"
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              options={blockTypeOptions}
            />

            <CustomSelect
              label="Location *"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              options={[
                { value: "", label: "Select location" },
                ...availableLocations,
              ]}
              error={errors.location}
            />
          </div>

          {/* Date and Time Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <CustomInput
              type="date"
              label="Start Date *"
              name="startDate"
              value={formData.startDate}
              onChange={handleInputChange}
              min={formData.isEmergency ? undefined : getTodayString()}
              max={getMaxDateString()}
              error={errors.startDate}
            />

            {formData.type === "range" && (
              <CustomInput
                type="date"
                label="End Date *"
                name="endDate"
                value={formData.endDate}
                onChange={handleInputChange}
                min={formData.startDate || getTodayString()}
                max={getMaxDateString()}
                error={errors.endDate}
              />
            )}

            {formData.type === "time-slot" && (
              <>
                <CustomInput
                  type="time"
                  label="Start Time *"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleInputChange}
                  error={errors.startTime}
                />

                <CustomInput
                  type="time"
                  label="End Time *"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleInputChange}
                  error={errors.endTime}
                />
              </>
            )}
          </div>

          {/* Reason */}
          <div className="mb-6">
            <CustomInput
              label="Reason *"
              name="reason"
              value={formData.reason}
              onChange={handleInputChange}
              placeholder="Enter detailed reason for blocking this period"
              error={errors.reason}
            />
          </div>

          {/* Options */}
          <div className="mb-6">
            <h4 className="text-lg font-medium mb-3" style={{ color: currentTheme.text.primary }}>
              Options
            </h4>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="notifyPatients"
                  checked={formData.notifyPatients}
                  onChange={handleInputChange}
                  className="mr-3"
                />
                <span style={{ color: currentTheme.text.primary }}>
                  <Mail size={16} className="inline mr-1" />
                  Notify affected patients via email
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="isEmergency"
                  checked={formData.isEmergency}
                  onChange={handleInputChange}
                  className="mr-3"
                />
                <span style={{ color: currentTheme.text.primary }}>
                  <AlertTriangle size={16} className="inline mr-1" />
                  Emergency block (allows past dates)
                </span>
              </label>
            </div>
          </div>

          {/* Conflict Warning */}
          {showConflictWarning && conflictingAppointments.length > 0 && (
            <div className="mb-6 p-4 rounded-lg bg-yellow-50 border border-yellow-200">
              <div className="flex items-start">
                <AlertTriangle size={20} className="text-yellow-600 mr-2 mt-0.5" />
                <div>
                  <h5 className="font-medium text-yellow-800 mb-2">
                    Conflicting Appointments Found
                  </h5>
                  <p className="text-yellow-700 text-sm mb-2">
                    {conflictingAppointments.length} appointment(s) will be affected by this block.
                    {formData.notifyPatients 
                      ? " Patients will be notified automatically."
                      : " Consider enabling patient notifications."
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: currentTheme.border }}>
            <CustomButton
              onClick={() => {
                setShowAddForm(false);
                resetForm();
              }}
              variant="outlined"
            >
              Cancel
            </CustomButton>
            <CustomButton 
              onClick={handleFormSubmit} 
              disabled={isSaving || isCheckingConflicts}
            >
              {isSaving 
                ? "Saving..." 
                : isCheckingConflicts 
                ? "Checking..." 
                : editingPeriod 
                ? "Update Block" 
                : "Save Block"}
            </CustomButton>
          </div>
        </div>
      )}

      {/* Blocked Periods List */}
      {!showAddForm && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <p style={{ color: currentTheme.text.secondary }}>
                Loading blocked periods...
              </p>
            </div>
          ) : blockedPeriods.length === 0 ? (
            <div
              className="text-center py-8 border rounded-lg"
              style={{
                borderColor: currentTheme.border,
                backgroundColor: currentTheme.surface,
              }}
            >
              <AlertTriangle size={32} className="mx-auto mb-2 opacity-50" />
              <p style={{ color: currentTheme.text.secondary }}>
                No blocked periods configured
              </p>
              <p className="text-sm mt-1" style={{ color: currentTheme.text.secondary }}>
                Block periods when the doctor is unavailable
              </p>
            </div>
          ) : (
            blockedPeriods.map((period) => {
              const blockStatus = getBlockStatus(period);
              return (
                <div
                  key={period.id}
                  className="rounded-lg p-5 shadow-md border"
                  style={{
                    backgroundColor: currentTheme.surface,
                    borderColor: currentTheme.border,
                  }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4
                          className="text-lg font-semibold"
                          style={{ color: currentTheme.text.primary }}
                        >
                          {period.location}
                        </h4>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${blockStatus.color}`}
                        >
                          {blockStatus.label}
                        </span>
                        {period.isEmergency && (
                          <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                            Emergency
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center" style={{ color: currentTheme.text.secondary }}>
                          <Calendar size={14} className="mr-2" />
                          <span>
                            {period.type === "single" || !period.endDate || period.endDate === period.startDate
                              ? formatDate(period.startDate)
                              : `${formatDate(period.startDate)} - ${formatDate(period.endDate)}`}
                          </span>
                        </div>

                        {period.type === "time-slot" && period.startTime && period.endTime && (
                          <div className="flex items-center" style={{ color: currentTheme.text.secondary }}>
                            <Clock size={14} className="mr-2" />
                            <span>{formatTime(period.startTime)} - {formatTime(period.endTime)}</span>
                          </div>
                        )}

                        <div className="flex items-center" style={{ color: currentTheme.text.secondary }}>
                          <AlertTriangle size={14} className="mr-2" />
                          <span>{period.reason}</span>
                        </div>

                        {period.conflictingAppointmentsCount > 0 && (
                          <div className="flex items-center text-yellow-600">
                            <Users size={14} className="mr-2" />
                            <span>{period.conflictingAppointmentsCount} affected appointments</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(period)}
                        className="p-2 rounded hover:bg-gray-100 transition-colors"
                        title="Edit blocked period"
                      >
                        <Edit3 size={16} style={{ color: currentTheme.text.secondary }} />
                      </button>
                      <button
                        onClick={() =>
                          setDeleteConfirmation({
                            show: true,
                            periodId: period.id,
                          })
                        }
                        className="p-2 rounded hover:bg-gray-100 transition-colors"
                        title="Delete blocked period"
                      >
                        <Trash2 size={16} className="text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default BlockedPeriods;