import React, { useState, useEffect } from "react";
import { useTheme } from "../../../context/ThemeContext";
import { format, isSameDay, parse } from "date-fns"; // Added isSameDay and parse for date comparison
import { db } from "../../../firebase/config";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  setDoc,
  getDoc,
  query,
  where,
} from "firebase/firestore";
import CustomInput from "../../../components/CustomInput";
import CustomButton from "../../../components/CustomButton";
import CustomSelect from "../../../components/CustomSelect";
import "react-datepicker/dist/react-datepicker.css";
import emailjs from "@emailjs/browser";
import { Calendar, Clock, AlertTriangle } from "lucide-react";

function AddApointment() {
  const { currentTheme } = useTheme();
  const [bookedDates, setBookedDates] = useState([]);
  const today = format(new Date(), "yyyy-MM-dd");
  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);
  const maxDate = format(nextYear, "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState("");
  const [allowedDateRange, setAllowedDateRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [selectedDayName, setSelectedDayName] = useState("");
  const MAX_SLOTS_PER_DAY = 5;
  const [selectedSlot, setSelectedSlot] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [bookingMessage, setBookingMessage] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    dob: "",
    reasonForVisit: "",
    appointmentType: "Consultation",
    medicalHistory: "",
  });
  const [errors, setErrors] = useState({});
  const [bookedSlots, setBookedSlots] = useState({});
  const [daySchedule, setDaySchedule] = useState(null);
  const [isSunday, setIsSunday] = useState(false);
  const [isDateBlocked, setIsDateBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [timeSlots, setTimeSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Helper function to get current time in IST
  const getCurrentTimeInIST = () => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const hour = parts.find((part) => part.type === "hour").value;
    const minute = parts.find((part) => part.type === "minute").value;
    return `${hour}:${minute}`; // e.g., "16:52" for 4:52 PM IST
  };

  useEffect(() => {
    const fetchDateRange = async () => {
      try {
        const dateRangeDoc = await getDoc(doc(db, "settings", "dateRange"));
        if (dateRangeDoc.exists()) {
          const data = dateRangeDoc.data();
          setAllowedDateRange({
            startDate: data.startDate || today,
            endDate: data.endDate || maxDate,
          });
        }
      } catch (error) {
        console.error("Failed to fetch date range:", error);
      }
    };
    fetchDateRange();
  }, []);

  const checkIfDateIsBlocked = async (dateStr, dayName) => {
    try {
      const date = new Date(dateStr);
      const blockedPeriodsDoc = await getDoc(
        doc(db, "settings", "blockedPeriods")
      );
      if (blockedPeriodsDoc.exists()) {
        const periods = blockedPeriodsDoc.data().periods || [];
        for (const period of periods) {
          if (period.type === "day" && period.day === dayName.toLowerCase()) {
            const blockDate = new Date(period.startDate);
            if (blockDate.toDateString() === date.toDateString()) {
              return { blocked: true, reason: period.reason };
            }
          } else if (period.type === "week" || period.type === "month") {
            const blockStart = new Date(period.startDate);
            const blockEnd = new Date(period.endDate);
            if (date >= blockStart && date <= blockEnd) {
              return { blocked: true, reason: period.reason };
            }
          }
        }
      }
      return { blocked: false, reason: "" };
    } catch (error) {
      console.error("Error checking blocked date:", error);
      return { blocked: false, reason: "" };
    }
  };

  const isDateUnavailable = (dateStr) => {
    const date = new Date(dateStr);
    const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
    return (
      bookedDates.includes(dateStr) ||
      dayName === "Sunday" ||
      date < new Date(today)
    );
  };

  const formatTimeSlot = (slot) => {
    if (!slot) return "";
    const cleanSlot = slot.replace(/["']/g, "").trim();
    return cleanSlot;
  };

  const fetchTimeSlots = async (date, dayName) => {
    setIsLoading(true);
    try {
      const { blocked, reason } = await checkIfDateIsBlocked(date, dayName);
      if (blocked) {
        setIsDateBlocked(true);
        setBlockReason(reason);
        setTimeSlots([]);
        setDaySchedule(null);
        setIsLoading(false);
        return;
      }

      setIsDateBlocked(false);
      setBlockReason("");

      const scheduleRef = collection(db, "appointments/data/schedule");
      const q = query(scheduleRef, where("date", "==", date));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setTimeSlots([]);
        setDaySchedule({ isOpen: false });
        setIsLoading(false);
        return;
      }

      const docData = querySnapshot.docs[0].data();
      const storedSlots = Array.isArray(docData.timeSlots)
        ? docData.timeSlots.map(formatTimeSlot)
        : [];

      // Get current time in IST
      const currentTime = getCurrentTimeInIST(); // e.g., "16:52"
      const selectedDateObj = new Date(date);
      const now = new Date();
      const isToday = isSameDay(selectedDateObj, now);

      // Filter slots based on current time if today, and ensure slots don't go beyond 5:30 PM
      const availableSlots = storedSlots.filter((slot) => {
        // Skip slots that are already booked
        if (bookedSlots[date]?.includes(slot)) {
          return false;
        }

        // Parse the slot time (e.g., "3:00 PM")
        const [time, period] = slot.split(" ");
        const [slotHour, slotMinute] = time.split(":").map(Number);
        let slotHour24 =
          period === "PM" && slotHour !== 12 ? slotHour + 12 : slotHour;
        if (period === "AM" && slotHour === 12) slotHour24 = 0;
        const slotTimeInMinutes = slotHour24 * 60 + slotMinute;

        // Parse the end time limit (5:30 PM)
        const endHour24 = 17; // 5:00 PM in 24-hour format
        const endMinute = 30;
        const endTimeInMinutes = endHour24 * 60 + endMinute; // 17:30 = 1050 minutes

        // If today, filter out slots before current time
        if (isToday) {
          const [currentHour, currentMinute] = currentTime
            .split(":")
            .map(Number);
          const currentTimeInMinutes = currentHour * 60 + currentMinute;
          return (
            slotTimeInMinutes >= currentTimeInMinutes &&
            slotTimeInMinutes <= endTimeInMinutes
          );
        }

        // For future dates, only ensure slots are not beyond 5:30 PM
        return slotTimeInMinutes <= endTimeInMinutes;
      });

      // Sort slots chronologically
      const sortedSlots = availableSlots.sort((a, b) => {
        const timeA = parse(a, "h:mm a", new Date());
        const timeB = parse(b, "h:mm a", new Date());
        return timeA - timeB;
      });

      setTimeSlots(sortedSlots);
      setDaySchedule({ isOpen: sortedSlots.length > 0 });
    } catch (error) {
      console.error("Error fetching time slots:", error);
      setTimeSlots([]);
      setBookingMessage("Error loading available slots. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchBookedDates = async () => {
      const snapshot = await getDocs(
        collection(db, "appointments/data/bookings")
      );
      const counts = {};
      snapshot.forEach((doc) => {
        const date = doc.data().date;
        counts[date] = (counts[date] || 0) + 1;
      });
      const fullyBooked = Object.entries(counts)
        .filter(([_, count]) => count >= MAX_SLOTS_PER_DAY)
        .map(([date]) => date);
      setBookedDates(fullyBooked);
    };
    fetchBookedDates();
  }, []);

  useEffect(() => {
    const fetchBookedSlots = async () => {
      try {
        const bookingsRef = collection(db, "appointments/data/bookings");
        const querySnapshot = await getDocs(bookingsRef);
        const slots = {};
        querySnapshot.forEach((doc) => {
          const appointment = doc.data();
          if (!slots[appointment.date]) {
            slots[appointment.date] = [];
          }
          slots[appointment.date].push(appointment.time);
        });
        setBookedSlots(slots);
      } catch (error) {
        console.error("Error fetching appointments:", error);
      }
    };

    const createDataDocIfNeeded = async () => {
      const dataDocRef = doc(db, "appointments", "data");
      const dataDoc = await getDoc(dataDocRef);
      if (!dataDoc.exists()) {
        await setDoc(dataDocRef, {
          created: new Date(),
          description: "Container for appointment bookings",
        });
      }
    };
    createDataDocIfNeeded().then(() => fetchBookedSlots());
  }, []);

  const handleDateChange = (e) => {
    const date = e.target.value;
    setSelectedDate(date);
    setSelectedSlot("");
    setShowForm(false);
    setBookingMessage("");
    setIsDateBlocked(false);
    setBlockReason("");
    if (date) {
      const selectedDateObj = new Date(date);
      const dayName = selectedDateObj.toLocaleDateString("en-US", {
        weekday: "long",
      });
      setSelectedDayName(dayName);
      fetchTimeSlots(date, dayName);
    } else {
      setSelectedDayName("");
      setTimeSlots([]);
    }
  };

  const checkSlotAvailability = async (date, slot) => {
    try {
      const bookingsRef = collection(db, "appointments/data/bookings");
      const q = query(
        bookingsRef,
        where("date", "==", date),
        where("time", "==", slot)
      );
      const snapshot = await getDocs(q);
      return snapshot.empty;
    } catch (error) {
      console.error("Error checking slot availability:", error);
      return false;
    }
  };

  const handleSlotSelect = async (slot) => {
    setIsLoading(true);
    const isAvailable = await checkSlotAvailability(selectedDate, slot);
    if (!isAvailable) {
      setBookingMessage(
        "This slot was just booked. Please select another time."
      );
      setShowForm(false);
      setSelectedSlot("");
      setBookedSlots((prev) => ({
        ...prev,
        [selectedDate]: [...(prev[selectedDate] || []), slot],
      }));
    } else {
      setSelectedSlot(slot);
      setShowForm(true);
      setBookingMessage("");
    }
    setIsLoading(false);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone is required";
    } else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ""))) {
      newErrors.phone = "Please enter a valid 10-digit phone number";
    }
    if (!formData.dob.trim()) {
      newErrors.dob = "Date of Birth is required";
    } else {
      const dobDate = new Date(formData.dob);
      const today = new Date();
      if (dobDate >= today) {
        newErrors.dob = "Date of Birth cannot be in the future";
      }
    }
    if (!formData.reasonForVisit.trim()) {
      newErrors.reasonForVisit = "Reason for visit is required";
    } else if (formData.reasonForVisit.trim().length < 10) {
      newErrors.reasonForVisit = "Please provide more details about your visit";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    try {
      setIsLoading(true);
      const isStillAvailable = await checkSlotAvailability(
        selectedDate,
        selectedSlot
      );
      if (!isStillAvailable) {
        setBookingMessage(
          "This slot was just booked. Please select another time."
        );
        setShowForm(false);
        setSelectedSlot("");
        return;
      }
      const { blocked, reason } = await checkIfDateIsBlocked(
        selectedDate,
        selectedDayName
      );
      if (blocked) {
        setBookingMessage(`This date is not available: ${reason}`);
        setShowForm(false);
        return;
      }
      const bookingsRef = collection(db, "appointments/data/bookings");
      await addDoc(bookingsRef, {
        date: selectedDate,
        time: selectedSlot,
        weekday: selectedDayName,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        dob: formData.dob,
        reasonForVisit: formData.reasonForVisit,
        appointmentType: formData.appointmentType,
        medicalHistory: formData.medicalHistory,
        status: "pending",
        createdAt: new Date().toISOString(),
      });
      setShowSuccess(true);
      setShowForm(false);
      setBookingMessage("Appointment booked successfully!");
      setTimeout(() => {
        setShowSuccess(false);
        setSelectedDate("");
        setSelectedDayName("");
        setSelectedSlot("");
        setFormData({
          name: "",
          email: "",
          phone: "",
          dob: "",
          reasonForVisit: "",
          appointmentType: "Consultation",
          medicalHistory: "",
        });
      }, 3000);
    } catch (error) {
      console.error("Error booking appointment:", error);
      setBookingMessage("Error booking appointment. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const getScheduleStatusMessage = () => {
    if (isDateBlocked) {
      return (
        blockReason ||
        "This date is unavailable for bookings. Please select another date."
      );
    }
    if (isSunday) {
      return "The doctor is not available on Sundays. Please select another day.";
    }
    if (!daySchedule || !daySchedule.isOpen) {
      return `The doctor is not available on ${selectedDayName}s. Please select another day.`;
    }
    if (timeSlots.length === 0) {
      return "No available time slots for this day. Please select another date.";
    }
    return null;
  };

  return (
    <div
      className="p-0 sm:p-0 rounded-lg w-full max-w-4xl mx-auto overflow-hidden"
      style={{ backgroundColor: currentTheme.surface }}
    >
      <h2
        className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6"
        style={{ color: currentTheme.text.primary }}
      >
        Book Your Appointment Here
      </h2>

      {showSuccess && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg bg-green-100 text-green-800 text-sm sm:text-base">
          Appointment booked successfully!
        </div>
      )}

      {bookingMessage && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg bg-red-100 text-red-800 text-sm sm:text-base">
          {bookingMessage}
        </div>
      )}

      <div className="space-y-4 sm:space-y-6">
        <CustomInput
          type="date"
          label="Select Date"
          value={selectedDate}
          onChange={(e) => {
            const date = e.target.value;
            if (!isDateUnavailable(date)) {
              handleDateChange(e);
            }
          }}
          min={today}
          max={maxDate}
          required
          className="w-full sm:w-auto"
          style={{
            opacity: isDateUnavailable(selectedDate) ? 0.5 : 1,
            cursor: isDateUnavailable(selectedDate) ? "not-allowed" : "pointer",
          }}
        />

        {isLoading && (
          <div className="flex justify-center py-4">
            <div
              className="animate-spin rounded-full h-8 w-8 border-b-2"
              style={{ borderColor: currentTheme.primary }}
            ></div>
          </div>
        )}

        {selectedDate && selectedDayName && !isLoading && (
          <div
            className="p-2 rounded-md"
            style={{
              backgroundColor: currentTheme.surface,
              borderLeft: `4px solid ${
                isDateBlocked || isSunday
                  ? "rgb(239, 68, 68)"
                  : daySchedule && daySchedule.isOpen
                  ? currentTheme.primary
                  : "rgb(239, 68, 68)"
              }`,
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  Selected Date:{" "}
                  {format(new Date(selectedDate), "MMMM d, yyyy")}
                </p>
                <p
                  className="text-sm"
                  style={{ color: currentTheme.text.secondary }}
                >
                  Day: {selectedDayName}
                </p>
              </div>
              {!isDateBlocked &&
                daySchedule &&
                daySchedule.isOpen &&
                !isSunday && (
                  <div className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                    Available
                  </div>
                )}
              {(isDateBlocked ||
                isSunday ||
                !daySchedule ||
                !daySchedule.isOpen) && (
                <div className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium">
                  Unavailable
                </div>
              )}
            </div>
          </div>
        )}

        {selectedDate && getScheduleStatusMessage() && !isLoading && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md flex items-start">
            <AlertTriangle size={18} className="mr-2 mt-0.5 flex-shrink-0" />
            <div>{getScheduleStatusMessage()}</div>
          </div>
        )}

        {selectedDate && timeSlots.length > 0 && !isLoading && (
          <div className="mt-4 sm:mt-6">
            <label
              className="block text-sm sm:text-base font-medium mb-2 sm:mb-3"
              style={{ color: currentTheme.text.primary }}
            >
              Available Time Slots
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
              {timeSlots.map((slot) => {
                const isBooked = bookedSlots[selectedDate]?.includes(slot);
                return (
                  <CustomButton
                    key={slot}
                    variant={
                      selectedSlot === slot
                        ? "primary"
                        : isBooked
                        ? "danger"
                        : "secondary"
                    }
                    onClick={() => !isBooked && handleSlotSelect(slot)}
                    className={`w-full justify-center text-sm sm:text-base py-2 px-3 ${
                      isBooked ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    icon={Clock}
                  >
                    {slot}
                  </CustomButton>
                );
              })}
            </div>
          </div>
        )}

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="space-y-4 sm:space-y-6 mt-4 sm:mt-6"
          >
            <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
              <CustomInput
                label="Client Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                error={errors.name}
              />
              <CustomInput
                type="email"
                label="Email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                error={errors.email}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
              <CustomInput
                type="tel"
                label="Phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                required
                error={errors.phone}
              />
              <CustomInput
                type="date"
                label="Date of Birth"
                name="dob"
                value={formData.dob}
                onChange={handleInputChange}
                required
                error={errors.dob}
              />
            </div>
            <CustomSelect
              label="Appointment Type"
              name="appointmentType"
              value={formData.appointmentType}
              onChange={handleInputChange}
              options={[
                { value: "Consultation", label: "Consultation" },
                { value: "Follow-up", label: "Follow-up" },
                { value: "Second Opinion", label: "Second Opinion" },
              ]}
              error={errors.appointmentType}
            />
            <CustomInput
              label="Reason for Visit"
              name="reasonForVisit"
              value={formData.reasonForVisit}
              onChange={handleInputChange}
              required
              error={errors.reasonForVisit}
            />
            <CustomInput
              type="textarea"
              label="Medical History"
              name="medicalHistory"
              value={formData.medicalHistory}
              onChange={handleInputChange}
              rows={4}
            />

            <CustomButton
              type="submit"
              variant="primary"
              className="w-min py-1 px-2 " // Adjust size here
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : "Book Appointment"}
            </CustomButton>
          </form>
        )}
      </div>
    </div>
  );
}

export default AddApointment;
