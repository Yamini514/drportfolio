import React, { useState, useEffect, useCallback, useMemo } from "react";
import { collection, doc, setDoc, getDoc, getDocs, query, where, writeBatch, deleteDoc } from "firebase/firestore";
import { db } from "../../../firebase/config";
import { useTheme } from "../../../context/ThemeContext";
import CustomButton from "../../../components/CustomButton";
import CustomInput from "../../../components/CustomInput";
import CustomSelect from "../../../components/CustomSelect";
import CustomDeleteConfirmation from "../../../components/CustomDeleteConfirmation";
import { Calendar, Clock, AlertTriangle, CheckCircle, Plus, Trash2, Pencil } from "lucide-react";
import debounce from "lodash/debounce";

const dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const TimingSchedular = React.memo(() => {
  const { currentTheme } = useTheme();
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedTab, setSelectedTab] = useState("schedule");
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });
  const [formErrors, setFormErrors] = useState({ name: "", startDate: "", endDate: "", startTime: "", endTime: "", days: "", scheduleConflict: "" });
  const [timeFormErrors, setTimeFormErrors] = useState({ startDate: "", endDate: "", startTime: "", endTime: "", scheduleConflict: "", days: "" });
  const [schedule, setSchedule] = useState({ locations: [], defaultTimes: { startTime: "09:00", endTime: "17:00" } });
  const [newSchedule, setNewSchedule] = useState({
    name: "",
    startTime: "09:00",
    endTime: "17:00",
    startDate: "",
    endDate: "",
    isActive: true,
    isEndDateUserDefined: false,
    days: { monday: false, tuesday: false, wednesday: false, thursday: false, friday: false, saturday: false, sunday: false },
  });
  const [blockedPeriods, setBlockedPeriods] = useState([]);
  const [newBlock, setNewBlock] = useState({
    type: "day",
    startDate: "",
    endDate: "",
    reason: "",
    location: "",
    startTime: "09:00",
    endTime: "17:00",
  });
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingTimeIndex, setEditingTimeIndex] = useState(null);
  const [lastSavedSchedule, setLastSavedSchedule] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState({ show: false, periodId: null, locationIndex: null, scheduleId: null, bookedSlotsCount: 0 });
  const [showAddScheduleForm, setShowAddScheduleForm] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showTimeUpdateModal, setShowTimeUpdateModal] = useState(false);
  const [timeUpdate, setTimeUpdate] = useState({
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    days: { monday: false, tuesday: false, wednesday: false, thursday: false, friday: false, saturday: false, sunday: false },
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [scheduleDetails, setScheduleDetails] = useState({});

  const showNotification = useCallback((message, type = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: "", type: "" }), 5000);
  }, []);

  const getTodayString = useCallback(() => new Date().toISOString().split("T")[0], []);
  const getMaxDateString = useCallback(() => {
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 10);
    return maxDate.toISOString().split("T")[0];
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const parseTimeToMinutes = (time) => {
    if (!time || !/^\d{2}:\d{2}$/.test(time)) return 0;
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const checkScheduleConflicts = useCallback((checkSchedule, checkIndex) => {
    const startDate = new Date(checkSchedule.startDate);
    const hasSelectedDays = Object.values(checkSchedule.days).some((day) => day);
    let endDate = checkSchedule.isEndDateUserDefined && checkSchedule.endDate ? new Date(checkSchedule.endDate) : new Date(startDate);
    if (hasSelectedDays && !checkSchedule.isEndDateUserDefined) endDate.setFullYear(startDate.getFullYear() + 1);

    const newStartTime = parseTimeToMinutes(checkSchedule.startTime);
    const newEndTime = parseTimeToMinutes(checkSchedule.endTime);

    return schedule.locations.reduce((conflicts, loc, idx) => {
      if (checkIndex === idx || loc.id === checkSchedule.id) return conflicts;

      const locStartDate = new Date(loc.startDate);
      const locEndDate = new Date(loc.endDate || loc.startDate);
      const locHasSelectedDays = Object.values(loc.days).some((day) => day);

      if (startDate <= locEndDate && endDate >= locStartDate && loc.name === checkSchedule.name) {
        const locStartTime = parseTimeToMinutes(loc.startTime);
        const locEndTime = parseTimeToMinutes(loc.endTime);
        const timeOverlap = newStartTime < locEndTime && newEndTime > locStartTime;

        if (hasSelectedDays || locHasSelectedDays) {
          for (let d = new Date(Math.max(startDate, locStartDate)); d <= new Date(Math.min(endDate, locEndDate)); d.setDate(d.getDate() + 1)) {
            const dayName = d.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
            const newScheduleDayActive = hasSelectedDays ? checkSchedule.days[dayName] : true;
            const locDayActive = locHasSelectedDays ? loc.days[dayName] : true;

            if (newScheduleDayActive && locDayActive && timeOverlap) {
              conflicts.push({
                date: d.toISOString().split("T")[0],
                day: dayName.charAt(0).toUpperCase() + dayName.slice(1),
                location: loc.name,
                startTime: loc.startTime,
                endTime: loc.endTime,
              });
            }
          }
        } else if (timeOverlap) {
          conflicts.push({
            date: loc.startDate,
            day: new Date(loc.startDate).toLocaleDateString("en-US", { weekday: "long" }),
            location: loc.name,
            startTime: loc.startTime,
            endTime: loc.endTime,
          });
        }
      }
      return conflicts;
    }, []);
  }, [schedule.locations]);

  const validateForm = useCallback(() => {
    const errors = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date(getMaxDateString());
    const originalSchedule = editingIndex !== null ? schedule.locations[editingIndex] : null;

    if (!newSchedule.name.trim()) {
      errors.name = "Location name is required";
    } else if (newSchedule.name.trim().length < 3 && (!originalSchedule || newSchedule.name !== originalSchedule.name)) {
      errors.name = "Location name must be at least 3 characters";
    } else if (!/^[a-zA-Z0-9\s-]+$/.test(newSchedule.name.trim()) && (!originalSchedule || newSchedule.name !== originalSchedule.name)) {
      errors.name = "Location name can only contain letters, numbers, spaces, and hyphens";
    }

    if (!newSchedule.startTime) {
      errors.startTime = "Start time is required";
    } else if (newSchedule.startTime >= newSchedule.endTime && (!originalSchedule || newSchedule.startTime !== originalSchedule.startTime)) {
      errors.endTime = "End time must be after start time";
    }

    if (!newSchedule.endTime) {
      errors.endTime = "End time is required";
    }

    if (!newSchedule.startDate) {
      errors.startDate = "Start date is required";
    } else {
      const startDate = new Date(newSchedule.startDate);
      if (startDate < today && (!originalSchedule || newSchedule.startDate !== originalSchedule.startDate)) {
        errors.startDate = "Cannot select past dates";
      } else if (startDate > maxDate && (!originalSchedule || newSchedule.startDate !== originalSchedule.startDate)) {
        errors.startDate = "Start date exceeds maximum limit";
      }
    }

    const hasSelectedDays = Object.values(newSchedule.days).some((day) => day);
    if (!newSchedule.endDate && !hasSelectedDays && (!originalSchedule || newSchedule.endDate !== originalSchedule.endDate || !Object.values(newSchedule.days).every((d, i) => d === Object.values(originalSchedule.days)[i]))) {
      errors.days = "Please select either an end date or specific days";
    } else if (newSchedule.endDate && newSchedule.isEndDateUserDefined) {
      const startDate = new Date(newSchedule.startDate);
      const endDate = new Date(newSchedule.endDate);
      if (endDate < startDate && (!originalSchedule || newSchedule.endDate !== originalSchedule.endDate)) {
        errors.endDate = "End date cannot be before start date";
      } else if (endDate > maxDate && (!originalSchedule || newSchedule.endDate !== originalSchedule.endDate)) {
        errors.endDate = "End date exceeds maximum limit";
      }
    }

    const conflicts = checkScheduleConflicts(newSchedule, editingIndex);
    if (conflicts.length > 0) {
      errors.scheduleConflict = `There is an overlapping schedule at ${conflicts[0].location} on ${conflicts[0].day}, ${formatDate(conflicts[0].date)} from ${conflicts[0].startTime} to ${conflicts[0].endTime}. Adjust the time to resolve.`;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [newSchedule, editingIndex, checkScheduleConflicts, getMaxDateString, formatDate, schedule.locations]);

  const validateTimeForm = useCallback(() => {
    const errors = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date(getMaxDateString());
    const location = schedule.locations[editingTimeIndex];

    if (!timeUpdate.startTime) {
      errors.startTime = "Start time is required";
    }
    if (!timeUpdate.endTime) {
      errors.endTime = "End time is required";
    } else if (timeUpdate.startTime >= timeUpdate.endTime) {
      errors.endTime = "End time must be after start time";
    }

    if (!timeUpdate.startDate) {
      errors.startDate = "Start date is required";
    } else {
      const startDate = new Date(timeUpdate.startDate);
      if (startDate < today) {
        errors.startDate = "Cannot select past dates";
      } else if (startDate > maxDate) {
        errors.startDate = "Start date exceeds maximum limit";
      }
    }

    if (timeUpdate.endDate) {
      const startDate = new Date(timeUpdate.startDate);
      const endDate = new Date(timeUpdate.endDate);
      if (endDate < startDate) {
        errors.endDate = "End date cannot be before start date";
      } else if (endDate > maxDate) {
        errors.endDate = "End date exceeds maximum limit";
      }
    }

    const hasSelectedDays = Object.values(timeUpdate.days).some(day => day);
    if (!timeUpdate.endDate && !hasSelectedDays) {
      errors.days = "Please select either an end date or specific days";
    }

    if (location) {
      const checkSchedule = {
        ...location,
        startDate: timeUpdate.startDate || location.startDate,
        endDate: timeUpdate.endDate || location.endDate,
        startTime: timeUpdate.startTime,
        endTime: timeUpdate.endTime,
        days: timeUpdate.days,
      };
      const conflicts = checkScheduleConflicts(checkSchedule, editingTimeIndex);
      if (conflicts.length > 0) {
        errors.scheduleConflict = `There is an overlapping schedule at ${conflicts[0].location} on ${conflicts[0].day}, ${formatDate(conflicts[0].date)} from ${conflicts[0].startTime} to ${conflicts[0].endTime}. Adjust the time to resolve.`;
      }
    }

    setTimeFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [timeUpdate, editingTimeIndex, schedule.locations, checkScheduleConflicts, getMaxDateString, formatDate]);

  const createTimeSlots = useCallback((location) => {
    if (!location?.startTime || !location?.endTime || !/^\d{2}:\d{2}$/.test(location.startTime) || !/^\d{2}:\d{2}$/.test(location.endTime)) {
      console.error("Invalid time format in createTimeSlots:", location.startTime, location.endTime);
      return [];
    }
    const slots = [];
    const [startHour, startMinute] = location.startTime.split(":").map(Number);
    const [endHour, endMinute] = location.endTime.split(":").map(Number);
    let currentHour = startHour;
    let currentMinute = startMinute;

    while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
      const displayHour = currentHour > 12 ? currentHour - 12 : currentHour === 0 ? 12 : currentHour;
      const period = currentHour >= 12 ? "PM" : "AM";
      slots.push(`${displayHour}:${currentMinute.toString().padStart(2, "0")} ${period}`);
      currentMinute += 30;
      if (currentMinute >= 60) {
        currentHour += 1;
        currentMinute = 0;
      }
    }
    return slots;
  }, []);

  const mergeTimeSlots = useCallback((schedules) => {
    const timeRanges = schedules.map(schedule => ({
      startTime: parseTimeToMinutes(schedule.startTime),
      endTime: parseTimeToMinutes(schedule.endTime),
      startTimeStr: schedule.startTime,
      endTimeStr: schedule.endTime,
    }));

    timeRanges.sort((a, b) => a.startTime - b.startTime);
    const mergedRanges = [];
    let currentRange = null;

    timeRanges.forEach(range => {
      if (!currentRange) {
        currentRange = { ...range };
      } else if (range.startTime <= currentRange.endTime + 30) {
        if (range.endTime > currentRange.endTime) {
          currentRange.endTime = range.endTime;
          currentRange.endTimeStr = range.endTimeStr;
        }
      } else {
        mergedRanges.push({ startTime: currentRange.startTimeStr, endTime: currentRange.endTimeStr });
        currentRange = { ...range };
      }
    });

    if (currentRange) {
      mergedRanges.push({ startTime: currentRange.startTimeStr, endTime: currentRange.endTimeStr });
    }

    return mergedRanges.flatMap(range => createTimeSlots(range));
  }, [createTimeSlots]);

  const getUniqueLocations = useCallback(() => {
    const uniqueNames = [...new Set(schedule.locations.map(loc => loc.name))];
    return uniqueNames.map(name => ({
      value: name,
      label: name
    }));
  }, [schedule.locations]);

  const generateScheduleDocuments = useCallback(async (location, oldLocationName = null) => {
    setLoading(true);
    try {
      const dataDocRef = doc(db, "appointments", "data");
      if (!(await getDoc(dataDocRef)).exists()) {
        await setDoc(dataDocRef, { createdAt: new Date(), description: "Container for appointment data" });
      }

      const scheduleRef = collection(db, "appointments", "data", "schedule");
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);

      if (!location.startDate) {
        setError("Invalid start date for schedule generation");
        return false;
      }

      const startDate = new Date(location.startDate);
      const endDate = new Date(location.endDate || location.startDate);
      const hasSelectedDays = Object.values(location.days).some(day => day);

      if (startDate < currentDate) {
        setError("Cannot generate schedule for past dates");
        return false;
      }

      if (hasSelectedDays && !location.isEndDateUserDefined) {
        endDate.setFullYear(startDate.getFullYear() + 1);
      }

      const batch = writeBatch(db);

      // Update existing documents for this location and schedule
      const q = query(scheduleRef, where("location", "==", oldLocationName || location.name), where("scheduleId", "==", location.id));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach(doc => batch.delete(doc.ref));

      for (let currentDate = new Date(startDate); currentDate <= endDate; currentDate.setDate(currentDate.getDate() + 1)) {
        const dateString = currentDate.toISOString().split("T")[0];
        const dayName = currentDate.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();

        if (hasSelectedDays ? location.days[dayName] : true) {
          const baseTimeSlots = createTimeSlots(location);
          const applicableBlocks = blockedPeriods.filter(period =>
            period.location === location.name &&
            new Date(period.startDate) <= currentDate &&
            (period.endDate ? new Date(period.endDate) >= currentDate : true)
          );
          let filteredTimeSlots = baseTimeSlots;

          if (applicableBlocks.length > 0) {
            const blockStartTime = Math.min(...applicableBlocks.map(p => parseTimeToMinutes(p.startTime)));
            const blockEndTime = Math.max(...applicableBlocks.map(p => parseTimeToMinutes(p.endTime)));
            filteredTimeSlots = baseTimeSlots.filter(slot => {
              const [time, period] = slot.split(" ");
              let [hour, minute] = time.split(":").map(Number);
              if (period === "PM" && hour !== 12) hour += 12;
              if (period === "AM" && hour === 12) hour = 0;
              const slotMinutes = hour * 60 + minute;
              return slotMinutes < blockStartTime || slotMinutes >= blockEndTime;
            });
          }

          if (filteredTimeSlots.length > 0) {
            batch.set(doc(scheduleRef), {
              date: dateString,
              dayName,
              location: location.name,
              scheduleId: location.id,
              timeSlots: filteredTimeSlots,
              isOpen: true,
              isBooked: false,
              createdAt: new Date(),
            });
          }
        }
      }

      await batch.commit();
      return true;
    } catch (error) {
      console.error("Error generating schedule documents:", error);
      setError("Failed to generate schedule documents: " + error.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [blockedPeriods, createTimeSlots]);

  const handleSaveSchedule = useCallback(async () => {
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      const startDate = new Date(newSchedule.startDate);
      let endDate = newSchedule.isEndDateUserDefined && newSchedule.endDate ? new Date(newSchedule.endDate) : new Date(startDate);
      if (Object.values(newSchedule.days).some(day => day) && !newSchedule.isEndDateUserDefined) {
        endDate.setFullYear(startDate.getFullYear() + 1);
      }

      const scheduleData = {
        ...newSchedule,
        id: Date.now().toString(),
        type: "schedule",
        createdAt: new Date().toISOString(),
        isMultipleDays: endDate.getTime() !== startDate.getTime(),
        endDate: endDate.toISOString().split("T")[0],
      };

      const updatedLocations = [...schedule.locations, scheduleData];
      const batch = writeBatch(db);

      batch.set(doc(db, "settings", "schedule"), {
        locations: updatedLocations,
        defaultTimes: { startTime: newSchedule.startTime, endTime: newSchedule.endTime },
        updatedAt: new Date().toISOString(),
      });

      await batch.commit();
      const success = await generateScheduleDocuments(scheduleData);
      if (!success) throw new Error("Failed to generate schedule documents");

      setSchedule(prev => ({ ...prev, locations: updatedLocations }));
      setLastSavedSchedule(scheduleData);
      setShowConfirmationModal(true);
      setNewSchedule({
        name: "",
        startTime: "09:00",
        endTime: "17:00",
        startDate: "",
        endDate: "",
        isActive: true,
        isEndDateUserDefined: false,
        days: { monday: false, tuesday: false, wednesday: false, thursday: false, friday: false, saturday: false, sunday: false },
      });
      setShowAddScheduleForm(false);
      setRefreshTrigger(prev => prev + 1);
      showNotification("Schedule saved successfully");
    } catch (error) {
      console.error("Error saving schedule:", error);
      showNotification("Error saving schedule: " + error.message, "error");
    } finally {
      setIsSaving(false);
    }
  }, [newSchedule, schedule.locations, validateForm, generateScheduleDocuments, showNotification]);

  const handleLocationUpdate = useCallback(async () => {
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      const originalSchedule = schedule.locations[editingIndex];
      const oldLocationName = originalSchedule.name;
      const startDate = new Date(newSchedule.startDate || originalSchedule.startDate);
      let endDate = newSchedule.isEndDateUserDefined && newSchedule.endDate ? new Date(newSchedule.endDate) : new Date(startDate);
      if (Object.values(newSchedule.days).some(day => day) && !newSchedule.isEndDateUserDefined) {
        endDate.setFullYear(startDate.getFullYear() + 1);
      }

      const updatedSchedule = {
        ...originalSchedule,
        name: newSchedule.name || originalSchedule.name,
        startTime: newSchedule.startTime || originalSchedule.startTime,
        endTime: newSchedule.endTime || originalSchedule.endTime,
        startDate: newSchedule.startDate || originalSchedule.startDate,
        isActive: newSchedule.isActive !== undefined ? newSchedule.isActive : originalSchedule.isActive,
        isEndDateUserDefined: newSchedule.isEndDateUserDefined !== undefined ? newSchedule.isEndDateUserDefined : originalSchedule.isEndDateUserDefined,
        days: Object.keys(newSchedule.days).reduce((acc, day) => ({
          ...acc,
          [day]: newSchedule.days[day] !== undefined ? newSchedule.days[day] : originalSchedule.days[day],
        }), {}),
        isMultipleDays: endDate.getTime() !== startDate.getTime(),
        updatedAt: new Date().toISOString(),
        id: originalSchedule.id,
        createdAt: originalSchedule.createdAt || new Date().toISOString(),
        endDate: endDate.toISOString().split("T")[0],
      };

      const updatedLocations = schedule.locations.map((loc, idx) =>
        idx === editingIndex ? updatedSchedule : loc
      );

      let updatedBlockedPeriods = blockedPeriods;
      if (oldLocationName !== updatedSchedule.name) {
        updatedBlockedPeriods = blockedPeriods.map(period =>
          period.location === oldLocationName ? { ...period, location: updatedSchedule.name } : period
        );
      }

      const batch = writeBatch(db);

      batch.set(doc(db, "settings", "schedule"), {
        locations: updatedLocations,
        defaultTimes: schedule.defaultTimes,
        updatedAt: new Date().toISOString(),
      });

      if (oldLocationName !== updatedSchedule.name) {
        batch.set(doc(db, "settings", "blockedPeriods"), {
          periods: updatedBlockedPeriods,
          updatedAt: new Date().toISOString(),
        });

        const scheduleRef = collection(db, "appointments", "data", "schedule");
        const q = query(scheduleRef, where("location", "==", oldLocationName), where("scheduleId", "==", updatedSchedule.id));
        const querySnapshot = await getDocs(q);
        querySnapshot.docs.forEach(doc => {
          batch.update(doc.ref, { location: updatedSchedule.name });
        });
      }

      await batch.commit();

      const success = await generateScheduleDocuments(updatedSchedule, oldLocationName);
      if (!success) {
        throw new Error(`Failed to generate schedule documents for ${updatedSchedule.name}`);
      }

      setSchedule(prev => ({ ...prev, locations: updatedLocations }));
      setBlockedPeriods(updatedBlockedPeriods);
      setLastSavedSchedule(updatedSchedule);
      setShowConfirmationModal(true);
      setShowAddScheduleForm(false);
      setEditingIndex(null);
      setNewSchedule({
        name: "",
        startTime: "09:00",
        endTime: "17:00",
        startDate: "",
        endDate: "",
        isActive: true,
        isEndDateUserDefined: false,
        days: { monday: false, tuesday: false, wednesday: false, thursday: false, friday: false, saturday: false, sunday: false },
      });
      setRefreshTrigger(prev => prev + 1);
      showNotification("Schedule updated successfully");
    } catch (error) {
      console.error("Error updating schedule:", error);
      showNotification("Error updating schedule: " + error.message, "error");
    } finally {
      setIsSaving(false);
    }
  }, [newSchedule, schedule.locations, editingIndex, validateForm, generateScheduleDocuments, blockedPeriods, showNotification]);

  const handleTimeUpdate = useCallback(async () => {
    if (!validateTimeForm()) return;
    setIsSaving(true);
    try {
      const location = schedule.locations[editingTimeIndex];
      const startDate = new Date(timeUpdate.startDate || location.startDate);
      let endDate = timeUpdate.endDate ? new Date(timeUpdate.endDate) : new Date(startDate);
      if (Object.values(timeUpdate.days).some(day => day) && !timeUpdate.endDate) {
        endDate.setFullYear(startDate.getFullYear() + 1);
      }

      const updatedSchedule = {
        ...location,
        startDate: timeUpdate.startDate || location.startDate,
        endDate: endDate.toISOString().split("T")[0],
        startTime: timeUpdate.startTime,
        endTime: timeUpdate.endTime,
        days: { ...timeUpdate.days },
        isEndDateUserDefined: !!timeUpdate.endDate,
        isMultipleDays: endDate.getTime() !== startDate.getTime(),
        updatedAt: new Date().toISOString(),
      };

      const updatedLocations = schedule.locations.map((loc, idx) => (idx === editingTimeIndex ? updatedSchedule : loc));
      const batch = writeBatch(db);

      batch.set(doc(db, "settings", "schedule"), {
        locations: updatedLocations,
        defaultTimes: schedule.defaultTimes,
        updatedAt: new Date().toISOString(),
      });

      const scheduleRef = collection(db, "appointments", "data", "schedule");
      const q = query(scheduleRef, where("location", "==", location.name), where("scheduleId", "==", location.id));
      const querySnapshot = await getDocs(q);
      querySnapshot.docs.forEach(doc => batch.delete(doc.ref));

      await batch.commit();
      const success = await generateScheduleDocuments(updatedSchedule);
      if (!success) {
        throw new Error("Failed to generate schedule documents");
      }

      setSchedule(prev => ({ ...prev, locations: updatedLocations }));
      setLastSavedSchedule(updatedSchedule);
      setShowConfirmationModal(true);
      setShowTimeUpdateModal(false);
      setEditingTimeIndex(null);
      setTimeUpdate({
        startDate: "",
        endDate: "",
        startTime: "",
        endTime: "",
        days: { monday: false, tuesday: false, wednesday: false, thursday: false, friday: false, saturday: false, sunday: false },
      });
      setRefreshTrigger(prev => prev + 1);
      showNotification("Schedule updated successfully");
    } catch (error) {
      console.error("Error in handleTimeUpdate:", error);
      showNotification("Error updating schedule: " + error.message, "error");
    } finally {
      setIsSaving(false);
    }
  }, [timeUpdate, editingTimeIndex, schedule.locations, validateTimeForm, generateScheduleDocuments, showNotification]);

  const handleDeleteClick = useCallback(async (index) => {
    setLoading(true);
    try {
      const locationToDelete = schedule.locations[index];
      const scheduleRef = collection(db, "appointments", "data", "schedule");
      const q = query(scheduleRef, where("location", "==", locationToDelete.name), where("scheduleId", "==", locationToDelete.id));
      const querySnapshot = await getDocs(q);
      const bookedSlotsCount = querySnapshot.docs.filter(doc => doc.data().isBooked).length;

      setDeleteConfirmation({ show: true, periodId: null, locationIndex: index, scheduleId: null, bookedSlotsCount });
    } catch (error) {
      console.error("Error fetching booked slots count:", error);
      showNotification("Error checking booked slots: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  }, [schedule.locations, showNotification]);

  const handleDeleteConfirm = useCallback(async () => {
    const { locationIndex } = deleteConfirmation;
    if (locationIndex === null) return;
    setLoading(true);
    try {
      const locationToDelete = schedule.locations[locationIndex];
      const updatedLocations = schedule.locations.filter((_, i) => i !== locationIndex);
      await setDoc(doc(db, "settings", "schedule"), { ...schedule, locations: updatedLocations });

      const scheduleRef = collection(db, "appointments", "data", "schedule");
      const q = query(scheduleRef, where("location", "==", locationToDelete.name), where("scheduleId", "==", locationToDelete.id));
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      querySnapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();

      try {
        await deleteDoc(doc(db, "appointments", "schedule", locationToDelete.id));
      } catch (error) {
        console.log("No document in appointments/schedule to delete");
      }

      setSchedule(prev => ({ ...prev, locations: updatedLocations }));
      setDeleteConfirmation({ show: false, periodId: null, locationIndex: null, scheduleId: null, bookedSlotsCount: 0 });
      setRefreshTrigger(prev => prev + 1);
      showNotification("Schedule deleted successfully");
    } catch (error) {
      console.error("Error deleting schedule:", error);
      showNotification("Error deleting schedule: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  }, [deleteConfirmation, schedule, showNotification]);

  const handleEditLocation = useCallback((index) => {
    const locationToEdit = JSON.parse(JSON.stringify(schedule.locations[index]));
    const hasSelectedDays = Object.values(locationToEdit.days).some(day => day);
    const adjustedLocation = {
      ...locationToEdit,
      endDate: locationToEdit.isEndDateUserDefined || !hasSelectedDays ? locationToEdit.endDate : "",
    };
    setEditingIndex(index);
    setNewSchedule(adjustedLocation);
    setShowAddScheduleForm(true);
  }, [schedule.locations]);

  const handleEditTime = useCallback((index) => {
    const location = schedule.locations[index];
    setEditingTimeIndex(index);
    setTimeUpdate({
      startDate: location.startDate,
      endDate: location.endDate,
      startTime: location.startTime,
      endTime: location.endTime,
      days: { ...location.days },
    });
    setShowTimeUpdateModal(true);
  }, [schedule.locations]);

  const handleNewBlockChange = useCallback(debounce((field, value) => {
    setNewBlock(prev => ({ ...prev, [field]: value }));
  }, 300), []);

  const validateBlockedPeriod = useCallback(() => {
    if (!newBlock.startDate) {
      setError("Start date is required");
      return false;
    }
    if (newBlock.type !== "day" && !newBlock.endDate) {
      setError("End date is required for extended period");
      return false;
    }
    if (!newBlock.reason) {
      setError("Reason is required");
      return false;
    }
    if (!newBlock.location) {
      setError("Location is required");
      return false;
    }
    if (!newBlock.startTime) {
      setError("Start time is required");
      return false;
    }
    if (!newBlock.endTime) {
      setError("End time is required");
      return false;
    }
    if (newBlock.startTime >= newBlock.endTime) {
      setError("End time must be after start time");
      return false;
    }

    const startDate = new Date(newBlock.startDate);
    const today = new Date(getTodayString());
    const maxDate = new Date(getMaxDateString());

    if (startDate < today) {
      setError("Cannot block past dates");
      return false;
    }
    if (startDate > maxDate) {
      setError("Cannot block dates beyond maximum limit");
      return false;
    }
    if (newBlock.type !== "day") {
      const endDate = new Date(newBlock.endDate);
      if (endDate < startDate) {
        setError("End date must be after start date");
        return false;
      }
      if (endDate > maxDate) {
        setError("End date exceeds maximum limit");
        return false;
      }
    }
    return true;
  }, [newBlock, getTodayString, getMaxDateString]);

  const addBlockedPeriod = useCallback(async () => {
    if (!validateBlockedPeriod()) return;
    setLoading(true);
    try {
      const location = schedule.locations.find(loc => loc.name === newBlock.location);
      const newPeriod = {
        id: Date.now().toString(),
        ...newBlock,
        location: location ? location.name : newBlock.location,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, "settings", "blockedPeriods"), {
        periods: [...blockedPeriods, newPeriod],
        updatedAt: new Date().toISOString(),
      });

      const scheduleRef = collection(db, "appointments", "data", "schedule");
      const startDateStr = newBlock.startDate;
      const endDateStr = newBlock.type === "day" ? newBlock.startDate : newBlock.endDate;
      const start = new Date(startDateStr);
      const end = new Date(endDateStr);
      const batch = writeBatch(db);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split("T")[0];
        const q = query(scheduleRef, where("date", "==", dateStr), where("location", "==", newPeriod.location));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(doc => {
          const docData = doc.data();
          const blockStartTime = parseTimeToMinutes(newPeriod.startTime);
          const blockEndTime = parseTimeToMinutes(newPeriod.endTime);
          const filteredTimeSlots = docData.timeSlots.filter(slot => {
            const [time, period] = slot.split(" ");
            let [hour, minute] = time.split(":").map(Number);
            if (period === "PM" && hour !== 12) hour += 12;
            if (period === "AM" && hour === 12) hour = 0;
            const slotMinutes = hour * 60 + minute;
            return slotMinutes < blockStartTime || slotMinutes >= blockEndTime;
          });
          if (filteredTimeSlots.length > 0) {
            batch.update(doc.ref, { timeSlots: filteredTimeSlots });
          } else if (!docData.isBooked) {
            batch.delete(doc.ref);
          }
        });
      }
      await batch.commit();

      setBlockedPeriods(prev => [...prev, newPeriod]);
      setNewBlock({ type: "day", startDate: "", endDate: "", reason: "", location: "", startTime: "09:00", endTime: "17:00" });
      setError("");
      setRefreshTrigger(prev => prev + 1);
      showNotification("Blocked period added successfully");
    } catch (error) {
      console.error("Error adding blocked period:", error);
      showNotification("Failed to add blocked period: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  }, [newBlock, blockedPeriods, validateBlockedPeriod, schedule.locations, showNotification]);

  const confirmRemoveBlockedPeriod = useCallback(async () => {
    const { periodId } = deleteConfirmation;
    try {
      const periodToRemove = blockedPeriods.find(period => period.id === periodId);
      if (!periodToRemove) return;

      const today = new Date(getTodayString());
      const blockEndDate = new Date(periodToRemove.endDate || periodToRemove.startDate);

      if (blockEndDate < today) {
        // Past dates: remove directly without confirmation
        const updatedPeriods = blockedPeriods.filter(period => period.id !== periodId);
        await setDoc(doc(db, "settings", "blockedPeriods"), { periods: updatedPeriods, updatedAt: new Date().toISOString() });
        setBlockedPeriods(updatedPeriods);
        setDeleteConfirmation({ show: false, periodId: null, locationIndex: null, scheduleId: null, bookedSlotsCount: 0 });
        setRefreshTrigger(prev => prev + 1);
        showNotification("Blocked period removed successfully");
        return;
      }

      // Present or future dates: proceed with confirmation
      const updatedPeriods = blockedPeriods.filter(period => period.id !== periodId);
      await setDoc(doc(db, "settings", "blockedPeriods"), { periods: updatedPeriods, updatedAt: new Date().toISOString() });
      setBlockedPeriods(updatedPeriods);
      setDeleteConfirmation({ show: false, periodId: null, locationIndex: null, scheduleId: null, bookedSlotsCount: 0 });
      setRefreshTrigger(prev => prev + 1);
      showNotification("Blocked period removed successfully");

      // Regenerate schedules for affected locations
      const affectedSchedules = schedule.locations.filter(loc => loc.name === periodToRemove.location);
      for (const loc of affectedSchedules) {
        await generateScheduleDocuments(loc);
      }
    } catch (error) {
      console.error("Error removing blocked period:", error);
      showNotification("Failed to remove blocked period: " + error.message, "error");
    }
  }, [deleteConfirmation, blockedPeriods, schedule.locations, generateScheduleDocuments, showNotification, getTodayString]);

  const isBlockActive = useCallback(period => {
    const now = new Date();
    const startDate = new Date(period.startDate);
    if (period.type === "day") return startDate.toDateString() === now.toDateString();
    return now >= startDate && now <= new Date(period.endDate);
  }, []);

  const activeBlocksCount = useMemo(() => blockedPeriods.filter(isBlockActive).length, [blockedPeriods, isBlockActive]);

  const formatBlockType = useCallback(type => type === "day" ? "Single Day" : "Extended Period", []);

  const isLocationBlocked = useCallback((location) => {
    const startDate = new Date(location.startDate);
    const endDate = new Date(location.endDate || location.startDate);
    return blockedPeriods.some(period => {
      if (period.location !== location.name) return false;
      const blockStart = new Date(period.startDate);
      const blockEnd = new Date(period.endDate || period.startDate);
      const locStartTime = parseTimeToMinutes(location.startTime);
      const locEndTime = parseTimeToMinutes(location.endTime);
      const blockStartTime = parseTimeToMinutes(period.startTime);
      const blockEndTime = parseTimeToMinutes(period.endTime);
      const timeOverlap = locStartTime < blockEndTime && locEndTime > blockStartTime;
      return timeOverlap && startDate <= blockEnd && endDate >= blockStart;
    });
  }, [blockedPeriods, parseTimeToMinutes]);

  const fetchScheduleDetails = useCallback(async (location) => {
    try {
      const scheduleRef = collection(db, "appointments", "data", "schedule");
      const q = query(scheduleRef, where("location", "==", location.name), where("scheduleId", "==", location.id));
      const querySnapshot = await getDocs(q);
      const details = {};
      querySnapshot.forEach(doc => {
        details[doc.data().date] = doc.data().timeSlots;
      });
      return details;
    } catch (error) {
      console.error("Error fetching schedule details:", error);
      return {};
    }
  }, []);

  const ConfirmationModal = useCallback(({ schedule, onClose }) => {
    const hasSelectedDays = Object.values(schedule.days).some(day => day);
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-labelledby="confirmation-modal-title">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl" style={{ backgroundColor: currentTheme.surface }}>
          <h2 id="confirmation-modal-title" className="text-2xl font-semibold mb-4" style={{ color: currentTheme.text.primary }}>
            Schedule Saved Successfully
          </h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="font-medium" style={{ color: currentTheme.text.primary }}>Location Name</label>
              <p style={{ color: currentTheme.text.secondary }}>{schedule.name}</p>
            </div>
            <div>
              <label className="font-medium" style={{ color: currentTheme.text.primary }}>Timing</label>
              <p style={{ color: currentTheme.text.secondary }}>{schedule.startTime} - {schedule.endTime}</p>
            </div>
            <div>
              <label className="font-medium" style={{ color: currentTheme.text.primary }}>
                {hasSelectedDays && !schedule.isEndDateUserDefined ? "Starting From" : "Date Range"}
              </label>
              <p style={{ color: currentTheme.text.secondary }}>
                {hasSelectedDays && !schedule.isEndDateUserDefined
                  ? `${formatDate(schedule.startDate)} (Weekly for 1 year)`
                  : `${formatDate(schedule.startDate)} - ${formatDate(schedule.endDate)}`}
                {hasSelectedDays && schedule.isEndDateUserDefined && schedule.isMultipleDays && " (Recurring on selected days)"}
              </p>
            </div>
            <div className="col-span-2">
              <label className="font-medium" style={{ color: currentTheme.text.primary }}>Available Days</label>
              <div className="flex gap-2 mt-1">
                {dayOrder.map(day => (
                  <span key={day} className="px-2 py-1 rounded" style={{
                    backgroundColor: schedule.days[day] ? currentTheme.success.light : currentTheme.error.light,
                    color: schedule.days[day] ? currentTheme.success.dark : currentTheme.error.dark,
                  }}>
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
  }, [currentTheme, formatDate]);

  const TimeUpdateModal = useCallback(() => {
    const location = schedule.locations[editingTimeIndex];
    const hasSelectedDays = location && Object.values(location.days).some(day => day);
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-labelledby="time-update-modal-title">
        <div className="bg-white rounded-lg p-6 w-full max-w-md" style={{ backgroundColor: currentTheme.surface }}>
          <h2 id="time-update-modal-title" className="text-2xl font-semibold mb-4" style={{ color: currentTheme.text.primary }}>
            Update Schedule
          </h2>
          <div className="mb-4">
            <label className="font-medium" style={{ color: currentTheme.text.primary }}>Location Name</label>
            <p className="text-sm mt-1" style={{ color: currentTheme.text.secondary }}>{location?.name}</p>
          </div>
          {timeFormErrors.scheduleConflict && <p className="text-red-500 text-sm mb-4">{timeFormErrors.scheduleConflict}</p>}
          {timeFormErrors.days && <p className="text-red-500 text-sm mb-4">{timeFormErrors.days}</p>}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <CustomInput
                type="date"
                label="Start Date"
                value={timeUpdate.startDate}
                onChange={e => setTimeUpdate(prev => ({ ...prev, startDate: e.target.value }))}
                icon={<Calendar size={20} />}
                min={getTodayString()}
                max={getMaxDateString()}
                required
                disabled={false}
                aria-invalid={!!timeFormErrors.startDate}
                aria-describedby={timeFormErrors.startDate ? "startDate-error" : undefined}
              />
              {timeFormErrors.startDate && <p id="startDate-error" className="text-red-500 text-sm mt-1">{timeFormErrors.startDate}</p>}
            </div>
            <div>
              <CustomInput
                type="date"
                label="End Date (Optional)"
                value={timeUpdate.endDate}
                onChange={e => setTimeUpdate(prev => ({ ...prev, endDate: e.target.value }))}
                icon={<Calendar size={20} />}
                min={timeUpdate.startDate || getTodayString()}
                max={getMaxDateString()}
                disabled={false}
                aria-invalid={!!timeFormErrors.endDate}
                aria-describedby={timeFormErrors.endDate ? "endDate-error" : undefined}
              />
              {timeFormErrors.endDate && <p id="endDate-error" className="text-red-500 text-sm mt-1">{timeFormErrors.endDate}</p>}
            </div>
            <div>
              <CustomInput
                type="time"
                label="Start Time"
                value={timeUpdate.startTime}
                onChange={e => setTimeUpdate(prev => ({ ...prev, startTime: e.target.value }))}
                icon={<Clock size={20} />}
                required
                disabled={false}
                aria-invalid={!!timeFormErrors.startTime}
                aria-describedby={timeFormErrors.startTime ? "startTime-error" : undefined}
              />
              {timeFormErrors.startTime && <p id="startTime-error" className="text-red-500 text-sm mt-1">{timeFormErrors.startTime}</p>}
            </div>
            <div>
              <CustomInput
                type="time"
                label="End Time"
                value={timeUpdate.endTime}
                onChange={e => setTimeUpdate(prev => ({ ...prev, endTime: e.target.value }))}
                icon={<Clock size={20} />}
                required
                disabled={false}
                aria-invalid={!!timeFormErrors.endTime}
                aria-describedby={timeFormErrors.endTime ? "endTime-error" : undefined}
              />
              {timeFormErrors.endTime && <p id="endTime-error" className="text-red-500 text-sm mt-1">{timeFormErrors.endTime}</p>}
            </div>
          </div>
          <div className="mt-4">
            <label className="block mb-2" style={{ color: currentTheme.text.primary }} aria-label="Available Days">
              Available Days (Optional if end date is selected)
            </label>
            <div className="flex flex-wrap gap-3">
              {dayOrder.map(day => (
                <button
                  key={day}
                  onClick={() => setTimeUpdate(prev => ({
                    ...prev,
                    days: { ...prev.days, [day]: !prev.days[day] },
                  }))}
                  className={`px-3 py-1 rounded-full ${timeUpdate.days[day] ? "bg-primary text-white" : "bg-gray-200 text-black"}`}
                  style={timeUpdate.days[day] ? { backgroundColor: currentTheme.primary } : {}}
                  aria-pressed={timeUpdate.days[day]}
                  aria-label={`Toggle ${day} availability`}
                >
                  {day.charAt(0).toUpperCase() + day.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <CustomButton onClick={() => setShowTimeUpdateModal(false)} variant="outlined">
              Cancel
            </CustomButton>
            <CustomButton onClick={handleTimeUpdate} disabled={isSaving}>
              {isSaving ? "Saving..." : "Update Schedule"}
            </CustomButton>
          </div>
        </div>
      </div>
    );
  }, [currentTheme, timeUpdate, timeFormErrors, handleTimeUpdate, isSaving, schedule.locations, editingTimeIndex, formatDate, getTodayString, getMaxDateString]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const scheduleDoc = await getDoc(doc(db, "settings", "schedule"));
        const defaultSchedule = { locations: [], defaultTimes: { startTime: "09:00", endTime: "17:00" } };
        if (scheduleDoc.exists()) {
          const data = scheduleDoc.data();
          setSchedule(data || defaultSchedule);
          if (data.defaultTimes) setNewSchedule(prev => ({ ...prev, startTime: data.defaultTimes.startTime || "09:00", endTime: data.defaultTimes.endTime || "17:00" }));
        } else {
          await setDoc(doc(db, "settings", "schedule"), defaultSchedule, { merge: true });
          setSchedule(defaultSchedule);
        }

        const blockedPeriodsDoc = await getDoc(doc(db, "settings", "blockedPeriods"));
        if (blockedPeriodsDoc.exists()) setBlockedPeriods(blockedPeriodsDoc.data().periods || []);
        else await setDoc(doc(db, "settings", "blockedPeriods"), { periods: [], updatedAt: new Date().toISOString() }, { merge: true });
      } catch (error) {
        console.error("Error loading data:", error);
        setError("Failed to load schedule data");
        showNotification("Failed to load schedule data", "error");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [refreshTrigger, showNotification]);

  useEffect(() => {
    const loadScheduleDetails = async () => {
      const details = {};
      for (const location of schedule.locations) {
        const locDetails = await fetchScheduleDetails(location);
        details[location.id] = locDetails;
      }
      setScheduleDetails(details);
    };
    loadScheduleDetails();
  }, [schedule.locations, fetchScheduleDetails, refreshTrigger]);

  useEffect(() => {
    const regenerateAffectedSchedules = async () => {
      setLoading(true);
      try {
        const affectedLocations = schedule.locations.filter(loc =>
          blockedPeriods.some(period =>
            period.location === loc.name &&
            new Date(loc.startDate) <= new Date(period.endDate || period.startDate) &&
            new Date(loc.endDate || loc.startDate) >= new Date(period.startDate)
          )
        );
        for (const loc of affectedLocations) {
          await generateScheduleDocuments(loc);
        }
      } catch (error) {
        console.error("Error regenerating affected schedules:", error);
        setError("Failed to regenerate schedules for blocked periods");
      } finally {
        setLoading(false);
      }
    };
    if (blockedPeriods.length > 0) regenerateAffectedSchedules();
  }, [blockedPeriods, generateScheduleDocuments, schedule.locations]);

  return (
    <section className="p-0 relative" aria-label="Schedule and Availability Configuration">
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center transition-opacity duration-300 ${notification.type === "error" ? "bg-red-500 text-white" : "bg-green-500 text-white"}`} role="alert">
          {notification.type === "error" ? <AlertTriangle size={20} className="mr-2" /> : <CheckCircle size={20} className="mr-2" />}
          <span>{notification.message}</span>
        </div>
      )}

      <CustomDeleteConfirmation
        isOpen={deleteConfirmation.show}
        onClose={() => setDeleteConfirmation({ show: false, periodId: null, locationIndex: null, scheduleId: null, bookedSlotsCount: 0 })}
        onConfirm={deleteConfirmation.periodId ? confirmRemoveBlockedPeriod : handleDeleteConfirm}
        title={deleteConfirmation.periodId ? "Delete Blocked Period" : "Remove Schedule"}
        message={deleteConfirmation.periodId ? "Are you sure you want to remove this blocked period? This action cannot be undone." : `This schedule has ${deleteConfirmation.bookedSlotsCount} booked slot(s). Are you sure you want to remove it? This action cannot be undone.`}
      />

      {showConfirmationModal && lastSavedSchedule && (
        <ConfirmationModal schedule={lastSavedSchedule} onClose={() => setShowConfirmationModal(false)} />
      )}

      {showTimeUpdateModal && (
        <TimeUpdateModal />
      )}

      <h2 className="text-2xl font-bold mb-6" style={{ color: currentTheme.text.primary }} aria-label="Configure Schedule Title">
        Configure Schedule & Availability
      </h2>

      <nav className="flex border-b mb-6" style={{ borderColor: currentTheme.border }}>
        <button
          className={`px-4 py-2 mr-2 font-medium rounded-t-lg transition-colors ${selectedTab === "schedule" ? "border-b-2" : ""}`}
          style={{ borderColor: selectedTab === "schedule" ? currentTheme.primary : "transparent", color: selectedTab === "schedule" ? currentTheme.primary : currentTheme.text.secondary }}
          onClick={() => setSelectedTab("schedule")}
          aria-current={selectedTab === "schedule" ? "page" : undefined}
        >
          <Calendar size={16} className="inline mr-2" />
          Regular Schedule
        </button>
        <button
          className={`px-4 py-2 mr-2 font-medium rounded-t-lg transition-colors flex items-center ${selectedTab === "blocks" ? "border-b-2" : ""}`}
          style={{ borderColor: selectedTab === "blocks" ? currentTheme.primary : "transparent", color: selectedTab === "blocks" ? currentTheme.primary : currentTheme.text.secondary }}
          onClick={() => setSelectedTab("blocks")}
          aria-current={selectedTab === "blocks" ? "page" : undefined}
        >
          <AlertTriangle size={16} className="mr-2" />
          Unavailable dates
          {activeBlocksCount > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">{activeBlocksCount}</span>
          )}
        </button>
      </nav>

      {selectedTab === "schedule" && (
        <article>
          <header className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold" style={{ color: currentTheme.text.primary }}>
              {showAddScheduleForm ? (editingIndex !== null ? "Edit Schedule" : "Add New Schedule") : "Schedule List"}
            </h3>
            {!showAddScheduleForm && (
              <CustomButton
                onClick={() => {
                  setNewSchedule({ name: "", startTime: "09:00", endTime: "17:00", startDate: "", endDate: "", isActive: true, isEndDateUserDefined: false, days: { monday: false, tuesday: false, wednesday: false, thursday: false, friday: false, saturday: false, sunday: false } });
                  setEditingIndex(null);
                  setShowAddScheduleForm(true);
                }}
                icon={Plus}
              >
                Add New Schedule
              </CustomButton>
            )}
          </header>

          {!showAddScheduleForm && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {schedule.locations.map((location, index) => {
                const hasSelectedDays = Object.values(location.days).some(day => day);
                const dateSlots = scheduleDetails[location.id] || {};
                const today = new Date().toISOString().split("T")[0];
                const sampleDate = "2025-07-09"; // Example date to check
                const slotsForDate = dateSlots[sampleDate] || createTimeSlots(location);

                return (
                  <article key={location.id || index} className="rounded-lg p-6 shadow-md" style={{ backgroundColor: currentTheme.surface }} aria-label={`Schedule for ${location.name}`}>
                    <header className="flex justify-between items-start mb-4">
                      <h4 className="text-xl font-semibold" style={{ color: currentTheme.text.primary }}>{location.name}</h4>
                      <div className="flex gap-2">
                        <button onClick={() => handleEditTime(index)} className="p-2 rounded-full hover:bg-gray-100" aria-label={`Change time and dates for ${location.name}`}>
                          <Clock size={16} />
                        </button>
                        <button onClick={() => handleEditLocation(index)} className="p-2 rounded-full hover:bg-gray-100" aria-label={`Edit schedule for ${location.name}`}>
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => handleDeleteClick(index)} className="p-2 rounded-full hover:bg-gray-100 text-red-500" aria-label={`Delete schedule for ${location.name}`}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </header>
                    <div className="space-y-2">
                      <p style={{ color: currentTheme.text.secondary }}>
                        <Clock size={16} className="inline mr-2" />
                        {location.startTime} - {location.endTime}
                      </p>
                      <p style={{ color: currentTheme.text.secondary }}>
                        <Calendar size={16} className="inline mr-2" />
                        {hasSelectedDays && !location.isEndDateUserDefined
                          ? `${formatDate(location.startDate)} (Weekly for 1 year)`
                          : `${formatDate(location.startDate)} - ${formatDate(location.endDate)}`}
                        {hasSelectedDays && location.isEndDateUserDefined && location.isMultipleDays && " (Recurring on selected days)"}
                      </p>
                    </div>
                    <div className="mt-4">
                      <div className="flex flex-wrap gap-2">
                        {dayOrder.map(day => (
                          <span key={day} className={`px-2 py-1 text-sm rounded ${location.days[day] ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`} aria-label={`${day} ${location.days[day] ? "available" : "unavailable"}`}>
                            {day.charAt(0).toUpperCase() + day.slice(1)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {showAddScheduleForm && (
            <section className="bg-white rounded-lg p-6 mb-6" style={{ backgroundColor: currentTheme.surface }} aria-label="Schedule Form">
              {formErrors.scheduleConflict && <p className="text-red-500 text-sm mb-4">{formErrors.scheduleConflict}</p>}
              {formErrors.days && <p className="text-red-500 text-sm mb-4">{formErrors.days}</p>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <CustomInput
                    label="Location Name"
                    value={newSchedule.name}
                    onChange={e => setNewSchedule(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter location name"
                    required
                    aria-invalid={!!formErrors.name}
                    aria-describedby={formErrors.name ? "name-error" : undefined}
                  />
                  {formErrors.name && <p id="name-error" className="text-red-500 text-sm mt-1">{formErrors.name}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <CustomInput
                      type="date"
                      label="Start Date"
                      value={newSchedule.startDate}
                      onChange={e => setNewSchedule(prev => ({ ...prev, startDate: e.target.value }))}
                      icon={<Calendar size={20} />}
                      min={getTodayString()}
                      max={getMaxDateString()}
                      required
                      aria-invalid={!!formErrors.startDate}
                      aria-describedby={formErrors.startDate ? "startDate-error" : undefined}
                    />
                    {formErrors.startDate && <p id="startDate-error" className="text-red-500 text-sm mt-1">{formErrors.startDate}</p>}
                  </div>
                  <div>
                    <CustomInput
                      type="date"
                      label="End Date (Optional)"
                      value={newSchedule.endDate}
                      onChange={e => setNewSchedule(prev => ({ ...prev, endDate: e.target.value, isEndDateUserDefined: e.target.value !== "" }))}
                      icon={<Calendar size={20} />}
                      min={newSchedule.startDate || getTodayString()}
                      max={getMaxDateString()}
                      aria-invalid={!!formErrors.endDate}
                      aria-describedby={formErrors.endDate ? "endDate-error" : undefined}
                    />
                    {formErrors.endDate && <p id="endDate-error" className="text-red-500 text-sm mt-1">{formErrors.endDate}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <CustomInput
                      type="time"
                      label="Start Time"
                      value={newSchedule.startTime}
                      onChange={e => setNewSchedule(prev => ({ ...prev, startTime: e.target.value }))}
                      icon={<Clock size={20} />}
                      required
                      aria-invalid={!!formErrors.startTime}
                      aria-describedby={formErrors.startTime ? "startTime-error" : undefined}
                    />
                    {formErrors.startTime && <p id="startTime-error" className="text-red-500 text-sm mt-1">{formErrors.startTime}</p>}
                  </div>
                  <div>
                    <CustomInput
                      type="time"
                      label="End Time"
                      value={newSchedule.endTime}
                      onChange={e => setNewSchedule(prev => ({ ...prev, endTime: e.target.value }))}
                      icon={<Clock size={20} />}
                      required
                      aria-invalid={!!formErrors.endTime}
                      aria-describedby={formErrors.endTime ? "endTime-error" : undefined}
                    />
                    {formErrors.endTime && <p id="endTime-error" className="text-red-500 text-sm mt-1">{formErrors.endTime}</p>}
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <label className="block mb-2" style={{ color: currentTheme.text.primary }} aria-label="Available Days">
                  Available Days (Optional if end date is selected)
                </label>
                <div className="flex flex-wrap gap-3">
                  {dayOrder.map(day => (
                    <button
                      key={day}
                      onClick={() => setNewSchedule(prev => ({ ...prev, days: { ...prev.days, [day]: !prev.days[day] } }))}
                      className={`px-3 py-1 rounded-full ${newSchedule.days[day] ? "bg-primary text-white" : "bg-gray-200 text-black"}`}
                      style={newSchedule.days[day] ? { backgroundColor: currentTheme.primary } : {}}
                      aria-pressed={newSchedule.days[day]}
                      aria-label={`Toggle ${day} availability`}
                    >
                      {day.charAt(0).toUpperCase() + day.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <CustomButton onClick={() => { setShowAddScheduleForm(false); setEditingIndex(null); }} variant="outlined">
                  Cancel
                </CustomButton>
                <CustomButton
                  onClick={() => editingIndex !== null ? handleLocationUpdate() : handleSaveSchedule()}
                  disabled={isSaving}
                  aria-label={editingIndex !== null ? "Update Schedule" : "Save Schedule"}
                >
                  {isSaving ? "Saving..." : editingIndex !== null ? "Update Schedule" : "Save Schedule"}
                </CustomButton>
              </div>
            </section>
          )}
        </article>
      )}

      {selectedTab === "blocks" && (
        <article>
          <section className="mb-6 p-4 border rounded-lg" style={{ borderColor: currentTheme.border, backgroundColor: currentTheme.surface }} aria-label="Add Blocked Period">
            <h3 className="text-xl mb-4 flex items-center" style={{ color: currentTheme.text.primary }}>
              <Plus size={20} className="mr-2" />
              Add Blocked Period
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <CustomSelect
                label="Block Type"
                value={newBlock.type}
                onChange={e => handleNewBlockChange("type", e.target.value)}
                options={[{ value: "day", label: "Single Day" }, { value: "period", label: "Extended Period" }]}
                required
              />
              <CustomSelect
                label="Location"
                value={newBlock.location}
                onChange={e => handleNewBlockChange("location", e.target.value)}
                options={[
                  { value: "", label: "Select your location", disabled: true },
                  ...getUniqueLocations()
                ]}
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <CustomInput
                label="Start Date"
                type="date"
                value={newBlock.startDate}
                onChange={e => handleNewBlockChange("startDate", e.target.value)}
                min={getTodayString()}
                max={getMaxDateString()}
                required
              />
              {newBlock.type !== "day" && (
                <CustomInput
                  label="End Date"
                  type="date"
                  value={newBlock.endDate}
                  onChange={e => handleNewBlockChange("endDate", e.target.value)}
                  min={newBlock.startDate || getTodayString()}
                  max={getMaxDateString()}
                  required
                />
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <CustomInput
                type="time"
                label="Start Time"
                value={newBlock.startTime}
                onChange={e => handleNewBlockChange("startTime", e.target.value)}
                icon={<Clock size={20} />}
                required
              />
              <CustomInput
                type="time"
                label="End Time"
                value={newBlock.endTime}
                onChange={e => handleNewBlockChange("endTime", e.target.value)}
                icon={<Clock size={20} />}
                required
              />
            </div>
            <CustomInput
              label="Reason / Message to Display"
              value={newBlock.reason || ""}
              onChange={e => handleNewBlockChange("reason", e.target.value)}
              placeholder="Enter reason for blocking this period"
              required
            />
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            <div className="mt-4">
              <CustomButton onClick={addBlockedPeriod} icon={Calendar} disabled={loading || !newBlock.location}>
                Add Blocked Period
              </CustomButton>
            </div>
          </section>
          <section className="mb-6" aria-label="Current Unavailable Dates">
            <h3 className="text-xl mb-4 flex items-center" style={{ color: currentTheme.text.primary }}>
              <AlertTriangle size={20} className="mr-2" />
              My current unavailable dates
            </h3>
            {blockedPeriods.length === 0 ? (
              <div className="text-center py-8 border rounded-lg" style={{ borderColor: currentTheme.border, color: currentTheme.text.secondary, backgroundColor: currentTheme.surface }}>
                <Calendar size={32} className="mx-auto mb-2 opacity-50" />
                No blocked periods configured
              </div>
            ) : (
              <div className="space-y-4">
                {blockedPeriods.map(period => (
                  <article key={period.id} className="p-4 border rounded-lg flex flex-col md:flex-row md:items-center md:justify-between transition-all duration-200" style={{
                    borderColor: currentTheme.border,
                    backgroundColor: currentTheme.surface,
                  }} aria-label={`Blocked period for ${period.location}`}>
                    <div className="mb-2 md:mb-0">
                      <h4 className="font-semibold" style={{ color: currentTheme.text.primary }}>{period.location}</h4>
                      <p style={{ color: currentTheme.text.secondary }}>
                        {formatBlockType(period.type)}: {formatDate(period.startDate)}
                        {period.type !== "day" && ` - ${formatDate(period.endDate)}`}
                      </p>
                      <p style={{ color: currentTheme.text.secondary }}>
                        Time: {period.startTime} - {period.endTime}
                      </p>
                      <p style={{ color: currentTheme.text.secondary }}>
                        Reason: {period.reason}
                      </p>
                    </div>
                    <div>
                      <button
                        onClick={() => setDeleteConfirmation({ show: true, periodId: period.id, locationIndex: null, scheduleId: null, bookedSlotsCount: 0 })}
                        className="p-2 rounded-full hover:bg-gray-100 text-red-500"
                        aria-label={`Delete blocked period for ${period.location}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </article>
      )}
    </section>
  );
});

export default TimingSchedular;