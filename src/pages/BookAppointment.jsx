import React, { useState, useEffect, useCallback } from "react";
import { useTheme } from "../context/ThemeContext";
import { db, auth } from "../firebase/config";
import { collection, getDocs, addDoc, doc, getDoc, query, where } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import CustomInput from "../components/CustomInput";
import CustomButton from "../components/CustomButton";
import CustomSelect from "../components/CustomSelect";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Clock } from "lucide-react";
import emailjs from "@emailjs/browser";
import SelfBookingForm from "../pages/admin/Appointment/SelfBookingForm";
import OtherPatientForm from "../pages/admin/Appointment/OtherPatientForm";
import { format, isSameDay, parse, isValid } from "date-fns";

function BookAppointment() {
  const { currentTheme } = useTheme();
  const navigate = useNavigate();
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedDayName, setSelectedDayName] = useState("");
  const [availableDates, setAvailableDates] = useState([]);
  const [bookedDates, setBookedDates] = useState([]);
  const today = format(new Date("2025-06-23"), "yyyy-MM-dd"); // System date: June 23, 2025
  const [selectedSlots, setSelectedSlots] = useState([]); // Changed to array for multiple slots
  const [showForm, setShowForm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [bookingMessage, setBookingMessage] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    pid: "",
    phone: "",
    dob: "",
    age: "",
    reasonForVisit: "",
    appointmentType: "Consultation",
    medicalHistory: null,
    medicalHistoryMessage: "",
  });
  const [errors, setErrors] = useState({});
  const [bookedSlots, setBookedSlots] = useState({});
  const [daySchedule, setDaySchedule] = useState(null);
  const [isSunday, setIsSunday] = useState(false);
  const [isDateBlocked, setIsDateBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [timeSlots, setTimeSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [locationMismatch, setLocationMismatch] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [bookingFor, setBookingFor] = useState("self");
  const [otherPatientData, setOtherPatientData] = useState({
    name: "",
    email: "",
    phone: "",
    dob: "",
  });
  const [otherPatientErrors, setOtherPatientErrors] = useState({});

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!auth.currentUser) {
      navigate("/login");
    }
  }, [navigate]);

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        setIsLoading(true);
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setFormData((prev) => ({
            ...prev,
            pid: userData.pid || "",
            name: userData.name || "",
            email: userData.email || user.email || "",
            phone: userData.phone || "",
          }));
          if (!userData.pid) {
            setBookingMessage("User PID not found. Please update your profile or contact support.");
          }
        } else {
          setBookingMessage("User profile not found. Please complete your profile setup.");
        }
      } catch (error) {
        console.error("Error fetching user data:", error.message);
        setBookingMessage(`Failed to load user data: ${error.message}. Please try again later.`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserData();
  }, []);

  // Initialize EmailJS
  useEffect(() => {
    emailjs.init("2pSuAO6tF3T-sejH-");
  }, []);

  // Fetch locations
  const fetchLocations = useCallback(async () => {
    try {
      setIsLoading(true);
      const locationsRef = collection(db, "appointments/data/schedule");
      const querySnapshot = await getDocs(locationsRef);
      const locationList = querySnapshot.docs.map((doc) => ({
        name: doc.data().location,
        docId: doc.id,
      }));
      const uniqueLocations = [...new Set(locationList.map((loc) => loc.name))].map((name) => ({
        name,
        docId: locationList.find((loc) => loc.name === name).docId,
      }));
      if (uniqueLocations.length === 0) {
        setBookingMessage("No locations available. Please try again later or contact support.");
      }
      setLocations(uniqueLocations);
    } catch (error) {
      console.error("Error fetching locations:", error.message);
      setLocations([]);
      setBookingMessage(`Failed to load locations: ${error.message}. Please try again later.`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  // Handle location change
  const handleLocationChange = useCallback((e) => {
    const location = e.target.value;
    if (!location) {
      setBookingMessage("Please select a valid location.");
      return;
    }
    setSelectedLocation(location);
    setSelectedDate("");
    setSelectedDayName("");
    setSelectedSlots([]);
    setShowForm(false);
    setShowConfirmation(false);
    setBookingMessage("");
    setTimeSlots([]);
    setDaySchedule(null);
    setIsDateBlocked(false);
    setBlockReason("");
    setLocationMismatch(false);
  }, []);

  // Handle phone input
  const handlePhoneInput = useCallback((e, isOther = false) => {
    const value = e.target.value.replace(/[^0-9+]/g, "");
    if (value.length > 11) {
      if (isOther) {
        setOtherPatientErrors((prev) => ({ ...prev, phone: "Phone number cannot exceed 11 digits." }));
      } else {
        setErrors((prev) => ({ ...prev, phone: "Phone number cannot exceed 11 digits." }));
      }
      return;
    }
    if (isOther) {
      setOtherPatientData((prev) => ({ ...prev, phone: value }));
      setOtherPatientErrors((prev) => ({
        ...prev,
        phone: !value
          ? "Phone number is required."
          : !/^\+?[0-9]{10,11}$/.test(value)
          ? "Please enter a valid phone number (10-11 digits)."
          : "",
      }));
    } else {
      setFormData((prev) => ({ ...prev, phone: value }));
      setErrors((prev) => ({
        ...prev,
        phone: !value
          ? "Phone number is required."
          : !/^\+?[0-9]{10,11}$/.test(value)
          ? "Please enter a valid phone number (10-11 digits)."
          : "",
      }));
    }
  }, []);

  // Handle date change
  const handleDateChange = useCallback(
    (date) => {
      const dateStr = date ? format(date, "yyyy-MM-dd") : "";
      setSelectedDate(dateStr);
      setSelectedSlots([]);
      setShowForm(false);
      setShowConfirmation(false);
      setBookingMessage("");
      setIsDateBlocked(false);
      setBlockReason("");
      setLocationMismatch(false);

      if (dateStr) {
        const selectedDateObj = new Date(dateStr);
        const dayName = selectedDateObj.toLocaleDateString("en-US", { weekday: "long" });
        setSelectedDayName(dayName);
        setIsSunday(dayName === "Sunday");
        if (isDateUnavailable(dateStr)) {
          setBookingMessage(
            dayName === "Sunday"
              ? "Appointments are not available on Sundays. Please select another day."
              : bookedDates.includes(dateStr)
              ? "This date is fully booked. Please select another date."
              : "This date is in the past. Please select a future date."
          );
          setTimeSlots([]);
          setDaySchedule(null);
        } else {
          fetchTimeSlots(dateStr, dayName);
        }
      } else {
        setSelectedDayName("");
        setIsSunday(false);
        setTimeSlots([]);
        setDaySchedule(null);
      }
    },
    [bookedDates, selectedLocation]
  );

  // Fetch time slots
  const fetchTimeSlots = useCallback(
    async (date, dayName) => {
      setIsLoading(true);
      try {
        const { blocked, reason } = await checkIfDateIsBlocked(date, dayName);
        if (blocked) {
          setIsDateBlocked(true);
          setBlockReason(reason);
          setTimeSlots([]);
          setDaySchedule(null);
          setBookingMessage(reason || "This date is unavailable for bookings. Please select another date.");
          return;
        }
        setIsDateBlocked(false);
        setBlockReason("");
        const scheduleRef = collection(db, "appointments/data/schedule");
        const q = query(scheduleRef, where("date", "==", date), where("location", "==", selectedLocation));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
          setTimeSlots([]);
          setDaySchedule({ isOpen: false });
          setLocationMismatch(true);
          setBookingMessage(`No schedule available for ${date} at ${selectedLocation}. Please select another date or location.`);
          return;
        }
        const docData = querySnapshot.docs[0].data();
        const storedSlots = Array.isArray(docData.timeSlots)
          ? docData.timeSlots.map((slot) => slot.replace(/["']/g, "").trim())
          : [];
        const currentTime = getCurrentTimeInIST();
        const selectedDateObj = new Date(date);
        const now = new Date("2025-06-23T13:15:00+05:30"); // System time: 01:15 PM IST
        const isToday = isSameDay(selectedDateObj, now);
        const availableSlots = storedSlots.filter((slot) => {
          const [time, period] = slot.split(" ");
          const [slotHour, slotMinute] = time.split(":").map(Number);
          let slotHour24 = period === "PM" && slotHour !== 12 ? slotHour + 12 : slotHour;
          if (period === "AM" && slotHour === 12) slotHour24 = 0;
          const slotTimeInMinutes = slotHour24 * 60 + slotMinute;
          const [currentHour, currentMinute, currentPeriod] = currentTime
            .split(/[:\s]/)
            .map((part, index) => (index < 2 ? Number(part) : part));
          const currentTimeInMinutes =
            (currentPeriod === "PM" && currentHour !== 12
              ? currentHour + 12
              : currentHour === 12 && currentPeriod === "AM"
              ? 0
              : currentHour) * 60 + currentMinute;
          const endHour24 = 17;
          const endTimeInMinutes = endHour24 * 60;
          const isBooked = bookedSlots[`${date}|${selectedLocation}`]?.includes(slot);
          return (
            !isBooked &&
            (isToday ? slotTimeInMinutes > currentTimeInMinutes : true) &&
            slotTimeInMinutes <= endTimeInMinutes
          );
        });
        const sortedSlots = availableSlots.sort((a, b) => {
          const timeA = parse(a, "h:mm a", new Date());
          const timeB = parse(b, "h:mm a", new Date());
          return timeA - timeB;
        });
        setTimeSlots(sortedSlots);
        setDaySchedule({ isOpen: sortedSlots.length > 0 });
        if (sortedSlots.length === 0 && !isDateBlocked && !isSunday && !locationMismatch) {
          setBookingMessage("All slots are booked for this day. Please select another day.");
        }
      } catch (error) {
        console.error("Error fetching time slots:", error.message);
        setBookingMessage(`Failed to load time slots: ${error.message}. Please try again later.`);
        setTimeSlots([]);
        setDaySchedule(null);
      } finally {
        setIsLoading(false);
      }
    },
    [selectedLocation, bookedSlots, isSunday, isDateBlocked, locationMismatch]
  );

  // Check slot availability
  const checkSlotAvailability = useCallback(
    async (date, slot) => {
      try {
        const bookingsRef = collection(db, "appointments/data/bookings");
        const q = query(
          bookingsRef,
          where("date", "==", date),
          where("time", "==", slot),
          where("location", "==", selectedLocation)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setBookingMessage(`The time slot ${slot} is already booked. Please choose another slot.`);
          return false;
        }
        return true;
      } catch (error) {
        console.error("Error checking slot availability:", error.message);
        setBookingMessage(`Failed to check slot availability: ${error.message}. Please try again.`);
        return false;
      }
    },
    [selectedLocation]
  );

  // Handle slot selection
  const handleSlotSelect = useCallback(
    async (slot) => {
      setIsLoading(true);
      const isAvailable = await checkSlotAvailability(selectedDate, slot);
      if (isAvailable) {
        setSelectedSlots((prev) =>
          prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
        );
        setBookingMessage("");
      } else {
        await fetchTimeSlots(selectedDate, selectedDayName);
      }
      setIsLoading(false);
    },
    [selectedDate, selectedDayName, checkSlotAvailability, fetchTimeSlots]
  );

  // Handle booking confirmation
  const handleConfirmation = useCallback(
    (e, value) => {
      e.preventDefault();
      if (selectedSlots.length === 0) {
        setBookingMessage("Please select at least one time slot before proceeding.");
        return;
      }
      setBookingFor(value);
      setShowForm(true);
      setShowConfirmation(false);
      if (value === "self") {
        setOtherPatientData({ name: "", email: "", phone: "", dob: "" });
        setOtherPatientErrors({});
      }
    },
    [selectedSlots]
  );

  // Handle other patient form submission
  const handleOtherPatientSubmit = useCallback(() => {
    const hasErrors = Object.values(otherPatientErrors).some((error) => error !== "");
    if (hasErrors || !otherPatientData.name || !otherPatientData.phone || !otherPatientData.dob) {
      setBookingMessage("Please correct the errors in the form before submitting.");
      return;
    }
    setShowForm(false);
    setShowConfirmation(false);
  }, [otherPatientData, otherPatientErrors]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    setSelectedLocation("");
    setSelectedDate("");
    setSelectedDayName("");
    setSelectedSlots([]);
    setShowForm(false);
    setShowConfirmation(false);
    setBookingMessage("");
    setTimeSlots([]);
    setDaySchedule(null);
    setIsDateBlocked(false);
    setBlockReason("");
    setLocationMismatch(false);
    setBookingFor("self");
    setOtherPatientData({ name: "", email: "", phone: "", dob: "" });
    setOtherPatientErrors({});
    setFormData({
      name: formData.name,
      email: formData.email,
      pid: formData.pid,
      phone: "",
      dob: "",
      age: "",
      reasonForVisit: "",
      appointmentType: "Consultation",
      medicalHistory: null,
      medicalHistoryMessage: "",
    });
    setErrors({});
  }, [formData]);

  // Validate form
  const validateForm = useCallback(() => {
    const newErrors = {};
    if (!formData.name) newErrors.name = "Name is required.";
    if (!formData.phone) newErrors.phone = "Phone number is required.";
    else if (!/^\+?[0-9]{10,11}$/.test(formData.phone))
      newErrors.phone = "Please enter a valid phone number (10-11 digits).";
    if (!formData.dob) newErrors.dob = "Date of birth is required.";
    if (!formData.pid) newErrors.pid = "Patient ID is required.";
    if (!formData.reasonForVisit) newErrors.reasonForVisit = "Reason for visit is required.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!validateForm()) {
        setBookingMessage("Please correct the errors in the form before submitting.");
        return;
      }
      if (selectedSlots.length === 0) {
        setBookingMessage("Please select at least one time slot.");
        return;
      }
      try {
        setIsLoading(true);
        // Check availability for all selected slots
        for (const slot of selectedSlots) {
          const isAvailable = await checkSlotAvailability(selectedDate, slot);
          if (!isAvailable) {
            setShowForm(false);
            setShowConfirmation(false);
            setSelectedSlots([]);
            await fetchTimeSlots(selectedDate, selectedDayName);
            return;
          }
        }
        const bookingsRef = collection(db, "appointments/data/bookings");
        // Book each slot individually
        for (const slot of selectedSlots) {
          await addDoc(bookingsRef, {
            location: selectedLocation,
            date: selectedDate,
            time: slot,
            weekday: selectedDayName,
            name: formData.name,
            email: formData.email,
            pid: formData.pid,
            phone: formData.phone,
            dob: formData.dob,
            reasonForVisit: formData.reasonForVisit,
            appointmentType: formData.appointmentType,
            medicalHistory: formData.medicalHistory ? formData.medicalHistory.name : "",
            medicalHistoryMessage: formData.medicalHistoryMessage,
            bookedBy: auth.currentUser.uid,
            bookedFor: bookingFor,
            status: "pending",
            createdAt: new Date().toISOString(),
          });
        }
        // Send WhatsApp confirmation
        if (formData.phone) {
          const phoneNumber = formData.phone.startsWith("+") ? formData.phone : `+91${formData.phone}`;
          const slotsList = selectedSlots.join(", ");
          const message = `Dear ${formData.name}, your appointments are confirmed for ${format(
            new Date(selectedDate),
            "MMMM d, yyyy"
          )} at ${slotsList} at ${selectedLocation}. Appointment Type: ${formData.appointmentType}. PID: ${formData.pid}.`;
          window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, "_blank");
        }
        // Send email confirmation
        if (formData.email) {
          const slotsList = selectedSlots.join(", ");
          const emailParams = {
            name: formData.name,
            email: formData.email,
            date: format(new Date(selectedDate), "MMMM d, yyyy"),
            time: slotsList,
            location: selectedLocation,
            appointment_type: formData.appointmentType,
            pid: formData.pid,
          };
          await emailjs.send("service_dkv3rib", "template_iremp8a", emailParams);
        }
        // Update booked slots
        setBookedSlots((prev) => {
          const key = `${selectedDate}|${selectedLocation}`;
          return {
            ...prev,
            [key]: [...(prev[key] || []), ...selectedSlots],
          };
        });
        setShowSuccess(true);
        setShowForm(false);
        setShowConfirmation(false);
        await fetchTimeSlots(selectedDate, selectedDayName);
        setTimeout(() => {
          setShowSuccess(false);
          setSelectedDate("");
          setSelectedDayName("");
          setSelectedSlots([]);
          setBookingFor("self");
          setOtherPatientData({ name: "", email: "", phone: "", dob: "" });
          setOtherPatientErrors({});
          setFormData({
            name: formData.name,
            email: formData.email,
            pid: formData.pid,
            phone: "",
            dob: "",
            age: "",
            reasonForVisit: "",
            appointmentType: "Consultation",
            medicalHistory: null,
            medicalHistoryMessage: "",
          });
          setErrors({});
          setTimeSlots([]);
          setDaySchedule(null);
        }, 3000);
      } catch (error) {
        console.error("Error booking appointments:", error.message);
        setBookingMessage(`Failed to book appointments: ${error.message}. Please try again later.`);
      } finally {
        setIsLoading(false);
      }
    },
    [
      validateForm,
      selectedDate,
      selectedSlots,
      selectedLocation,
      selectedDayName,
      formData,
      bookingFor,
      checkSlotAvailability,
      fetchTimeSlots,
    ]
  );

  // Get current time in IST
  const getCurrentTimeInIST = useCallback(() => {
    return "1:15 PM"; // System time: 01:15 PM IST, June 23, 2025
  }, []);

  // Check if date is blocked
  const checkIfDateIsBlocked = useCallback(async (dateStr, dayName) => {
    try {
      const blockedPeriodsDoc = await getDoc(doc(db, "settings", "blockedPeriods"));
      if (blockedPeriodsDoc.exists()) {
        const periods = blockedPeriodsDoc.data().periods || [];
        for (const period of periods) {
          if (period.type === "day" && period.day === dayName.toLowerCase()) {
            const blockDate = new Date(period.startDate);
            if (blockDate.toDateString() === new Date(dateStr).toDateString()) {
              return { blocked: true, reason: period.reason || "This date is blocked." };
            }
          } else if (period.type === "week" || period.type === "month") {
            const blockStart = new Date(period.startDate);
            const blockEnd = new Date(period.endDate);
            if (new Date(dateStr) >= blockStart && new Date(dateStr) <= blockEnd) {
              return { blocked: true, reason: period.reason || "This period is blocked." };
            }
          }
        }
      }
      return { blocked: false, reason: "" };
    } catch (error) {
      console.error("Error checking blocked date:", error.message);
      setBookingMessage(`Failed to check date availability: ${error.message}. Please try again.`);
      return { blocked: false, reason: "" };
    }
  }, []);

  // Check if date is unavailable
  const isDateUnavailable = useCallback(
    (dateStr) => {
      const date = new Date(dateStr);
      const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
      return bookedDates.includes(dateStr) || dayName === "Sunday" || date < new Date(today);
    },
    [bookedDates, today]
  );

  // Check if date is available
  const isDateAvailable = useCallback(
    (date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      return (
        availableDates.some(
          (d) => d.date === dateStr && d.location.toLowerCase() === selectedLocation.toLowerCase()
        ) && !isDateUnavailable(dateStr)
      );
    },
    [availableDates, selectedLocation, isDateUnavailable]
  );

  // Filter unavailable dates
  const filterUnavailableDates = useCallback(
    (date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      return !isDateUnavailable(dateStr) && isDateAvailable(date);
    },
    [isDateUnavailable, isDateAvailable]
  );

  // Fetch available dates
  useEffect(() => {
    const fetchAvailableDates = async () => {
      try {
        const scheduleRef = collection(db, "appointments/data/schedule");
        const querySnapshot = await getDocs(scheduleRef);
        const dates = querySnapshot.docs.map((doc) => ({
          date: doc.data().date,
          location: doc.data().location,
        }));
        if (dates.length === 0) {
          setBookingMessage("No available dates found. Please try again later.");
        }
        setAvailableDates(dates);
      } catch (error) {
        console.error("Error fetching available dates:", error.message);
        setBookingMessage(`Failed to load available dates: ${error.message}. Please try again later.`);
      }
    };
    fetchAvailableDates();
  }, []);

  // Fetch booked dates
  useEffect(() => {
    const fetchBookedDates = async () => {
      try {
        const snapshot = await getDocs(collection(db, "appointments/data/bookings"));
        const counts = {};
        snapshot.forEach((doc) => {
          const { date, location } = doc.data();
          const key = `${date}|${location}`;
          counts[key] = (counts[key] || 0) + 1;
        });
        const fullyBooked = Object.entries(counts).map(([key]) => key.split("|")[0]);
        setBookedDates(fullyBooked);
      } catch (error) {
        console.error("Error fetching booked dates:", error.message);
        setBookingMessage(`Failed to load booked dates: ${error.message}. Please try again.`);
      }
    };
    fetchBookedDates();
  }, []);

  // Fetch booked slots
  useEffect(() => {
    const fetchBookedSlots = async () => {
      try {
        const bookingsRef = collection(db, "appointments/data/bookings");
        const querySnapshot = await getDocs(bookingsRef);
        const slots = {};
        querySnapshot.forEach((doc) => {
          const appointment = doc.data();
          const key = `${appointment.date}|${appointment.location}`;
          if (!slots[key]) slots[key] = [];
          slots[key].push(appointment.time);
        });
        setBookedSlots(slots);
      } catch (error) {
        console.error("Error fetching booked slots:", error.message);
        setBookingMessage(`Failed to load booked slots: ${error.message}. Please try again.`);
      }
    };
    fetchBookedSlots();
  }, []);

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center p-4 sm:p-6">
      <div
        className="p-6 sm:p-8 rounded-lg shadow-lg w-full max-w-5xl"
        style={{ backgroundColor: currentTheme.background, borderColor: currentTheme.border, borderWidth: "1px" }}
      >
        <div className="flex justify-center items-center mb-4 sm:mb-6">
          <h2
            className="text-xl sm:text-2xl font-semibold text-center"
            style={{ color: currentTheme.text.primary }}
          >
            Book Your Appointment
          </h2>
        </div>

        {showSuccess && (
          <div className="mb-4 p-3 sm:p-4 rounded-lg bg-green-100 text-green-800 sm:mb-6 text-sm sm:text-base">
            <p>Appointments booked successfully! A confirmation has been sent.</p>
          </div>
        )}

        {bookingMessage && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg bg-red-100 text-red-800 text-sm sm:text-base">
            {bookingMessage}
          </div>
        )}

        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col items-center gap-4 sm:gap-6">
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6">
              <div className="flex flex-row items-center gap-2 w-auto">
                <label
                  htmlFor="location"
                  className="text-sm sm:text-base font-medium whitespace-nowrap"
                  style={{ color: currentTheme.text.primary }}
                >
                  Select Location<span className="text-red-500 ml-1">*</span>
                </label>
                <CustomSelect
                  id="location-select"
                  value={selectedLocation}
                  onChange={handleLocationChange}
                  options={[
                    { value: "", label: "Select your location", disabled: true },
                    ...locations.map((loc) => ({ value: loc.name, label: loc.name })),
                  ]}
                  required
                  className="w-60 sm:w-60 p-2 rounded-md border text-sm sm:text-base"
                  style={{
                    borderColor: currentTheme.border,
                    backgroundColor: currentTheme.inputBackground,
                    color: currentTheme.text.primary,
                  }}
                />
              </div>
              <div className="flex flex-row items-center gap-2 w-auto">
                <label
                  htmlFor="date-input"
                  className="text-sm sm:text-base font-medium whitespace-nowrap"
                  style={{ color: currentTheme.text.primary }}
                >
                  Select Date<span className="text-red-500 ml-1">*</span>
                </label>
                <DatePicker
                  selected={selectedDate ? new Date(selectedDate) : null}
                  onChange={handleDateChange}
                  minDate={new Date(today)}
                  maxDate={new Date(new Date().setFullYear(new Date().getFullYear() + 1))}
                  dayClassName={(date) =>
                    isDateAvailable(date) && isValid(date)
                      ? "bg-green-100 text-green-800 font-semibold"
                      : isDateUnavailable(format(date, "yyyy-MM-dd"))
                      ? "cursor-not-allowed text-gray-400"
                      : ""
                  }
                  filterDate={filterUnavailableDates}
                  required
                  className="w-45 sm:w-45 p-2 rounded-md border text-sm sm:text-base"
                  style={{
                    borderColor: currentTheme.border,
                    backgroundColor: currentTheme.inputBackground,
                    color: currentTheme.text.primary,
                  }}
                  disabled={!selectedLocation}
                  placeholderText="Select Date"
                  showPopperArrow={false}
                  dateFormat="dd-MM-yyyy"
                  onKeyDown={(e) => e.preventDefault()}
                />
              </div>
            </div>
            {selectedDate && selectedDayName && !isLoading && (
              <div className="text-center">
                <p
                  className="text-sm sm:text-base font-medium"
                  style={{ color: currentTheme.text.primary }}
                >
                  Selected Date: {format(new Date(selectedDate), "MMMM d, yyyy")} at {selectedLocation} | Day: {selectedDayName}
                </p>
                {selectedSlots.length > 0 && (
                  <p
                    className="text-sm sm:text-base mt-2"
                    style={{ color: currentTheme.text.primary }}
                  >
                    Selected Time Slots: {selectedSlots.join(", ")}
                  </p>
                )}
              </div>
            )}
          </div>

          {isLoading && (
            <div className="flex justify-center py-4">
              <div
                className="animate-spin rounded-full h-8 w-8 border-b-2"
                style={{ borderColor: currentTheme.primary }}
              ></div>
            </div>
          )}

          {selectedDate && timeSlots.length > 0 && !isLoading && !locationMismatch && (
            <div className="mt-4 sm:mt-6">
              <label
                className="block text-sm sm:text-base font-medium mb-2 sm:mb-3 text-center"
                style={{ color: currentTheme.text.primary }}
              >
                Available Time Slots (Select one or more)
              </label>
              <div className="flex justify-center">
                <div className="flex flex-wrap justify-center gap-2 sm:gap-3 max-w-3xl">
                  {timeSlots.map((slot) => {
                    const [time, period] = slot.split(" ");
                    const isBooked = bookedSlots[`${selectedDate}|${selectedLocation}`]?.includes(slot);
                    const isSelected = selectedSlots.includes(slot);
                    return (
                      <CustomButton
                        key={slot}
                        variant={
                          isSelected
                            ? "primary"
                            : isBooked
                            ? "disabled"
                            : "secondary"
                        }
                        onClick={() => !isBooked && handleSlotSelect(slot)}
                        className={`w-28 sm:w-32 h-10 text-xs sm:text-sm py-2 px-3 flex items-center justify-center ${
                          isBooked
                            ? "cursor-not-allowed bg-red-600 text-white opacity-80 hover:bg-red-700"
                            : isSelected
                            ? "bg-blue-600 text-white hover:bg-blue-700"
                            : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                        }`}
                        disabled={isBooked}
                      >
                        <div className="flex items-center justify-center gap-1 whitespace-nowrap">
                          <Clock className="w-4 h-4" />
                          <span>{time}</span>
                          <span>{period}</span>
                        </div>
                      </CustomButton>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {selectedSlots.length > 0 && !showForm && !showConfirmation && (
            <div className="flex justify-center mt-4">
              <CustomButton
                variant="primary"
                onClick={() => setShowConfirmation(true)}
                className="w-max py-2 px-4"
              >
                Proceed to Booking
              </CustomButton>
            </div>
          )}

          {showConfirmation && (
            <div
              className="p-6 rounded-lg shadow-md border w-full mt-6 sm:mt-8"
              style={{ backgroundColor: currentTheme.surface, borderColor: currentTheme.border }}
            >
              <h3
                className="text-lg sm:text-xl font-semibold mb-4 text-center"
                style={{ color: currentTheme.text.primary }}
              >
                Booking Confirmation
              </h3>
              <p
                className="text-sm sm:text-base mb-4 text-center"
                style={{ color: currentTheme.text.primary }}
              >
                Are you booking these appointments for yourself or someone else?
              </p>
              <div className="flex justify-center gap-4 mb-6">
                <CustomButton
                  variant={bookingFor === "self" ? "primary" : "secondary"}
                  onClick={(e) => handleConfirmation(e, "self")}
                  className="w-max py-2 px-4"
                >
                  For Myself
                </CustomButton>
                <CustomButton
                  variant={bookingFor === "other" ? "primary" : "secondary"}
                  onClick={(e) => handleConfirmation(e, "other")}
                  className="w-max py-2 px-4"
                >
                  For Someone Else
                </CustomButton>
              </div>
            </div>
          )}

          {showForm && bookingFor === "self" && (
            <SelfBookingForm
              formData={formData}
              setFormData={setFormData}
              errors={errors}
              setErrors={setErrors}
              handleSubmit={handleSubmit}
              handleCancel={handleCancel}
              isLoading={isLoading}
            />
          )}

          {showForm && bookingFor === "other" && (
            <OtherPatientForm
              otherPatientData={otherPatientData}
              setOtherPatientData={setOtherPatientData}
              otherPatientErrors={otherPatientErrors}
              setOtherPatientErrors={setOtherPatientErrors}
              setFormData={setFormData}
              handleOtherPatientSubmit={handleOtherPatientSubmit}
              handleCancel={handleCancel}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default BookAppointment;