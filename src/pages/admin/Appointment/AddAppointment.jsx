import React, { useState, useEffect } from "react";
import { useTheme } from "../../../context/ThemeContext";
import { db, auth } from "../../../firebase/config";
import { collection, getDocs, addDoc, doc, getDoc, query, where, onSnapshot, setDoc } from "firebase/firestore";
import CustomInput from "../../../components/CustomInput";
import CustomButton from "../../../components/CustomButton";
import CustomSelect from "../../../components/CustomSelect";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Clock } from "lucide-react";
import SelfBookingForm from "../../admin/Appointment/SelfBookingForm";
import { format, isSameDay, parse, isValid } from "date-fns";
import { useNavigate } from "react-router-dom";

// Inline Card Component
const Card = ({ title, children }) => {
  const { currentTheme } = useTheme() || {
    currentTheme: {
      background: '#fff',
      surface: '#fff',
      border: '#ccc',
      primary: '#2563eb',
      inputBackground: '#f9f9f9',
      text: { primary: '#000' },
    },
  };
  return (
    <div className="p-6 rounded-lg shadow-md border w-full" style={{ backgroundColor: currentTheme.surface, borderColor: currentTheme.border }}>
      {title && (
        <h3 className="text-lg sm:text-xl font-semibold mb-4 text-center" style={{ color: currentTheme.text.primary }}>
          {title}
        </h3>
      )}
      {children}
    </div>
  );
};

// Function to generate a random 5-digit number
const generateRandomNumber = () => {
  return Math.floor(10000 + Math.random() * 90000).toString().padStart(5, '0');
};

// Function to generate a PID in the format PID{year}-XXXXX
const generateRandomPid = () => {
  const year = new Date().getFullYear().toString();
  const randomNumber = generateRandomNumber();
  return `PID${year}-${randomNumber}`;
};

// Function to check if a PID already exists in Firestore
const checkPidUniqueness = async (pid) => {
  try {
    const bookingsRef = collection(db, "appointments/data/bookings");
    const usersRef = collection(db, "users");
    const bookingsQuery = query(bookingsRef, where("pid", "==", pid));
    const usersQuery = query(usersRef, where("pid", "==", pid));
    const [bookingsSnapshot, usersSnapshot] = await Promise.all([
      getDocs(bookingsQuery),
      getDocs(usersQuery),
    ]);
    console.log(`PID ${pid} uniqueness: bookings=${bookingsSnapshot.empty}, users=${usersSnapshot.empty}`);
    return bookingsSnapshot.empty && usersSnapshot.empty;
  } catch (error) {
    console.error("Error checking PID uniqueness:", error);
    return false;
  }
};

// Function to generate a unique PID
const generateUniquePid = async () => {
  let pid;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 20;

  while (!isUnique && attempts < maxAttempts) {
    pid = generateRandomPid();
    isUnique = await checkPidUniqueness(pid);
    attempts++;
  }

  if (!isUnique) {
    console.error("Failed to generate unique PID after", maxAttempts, "attempts");
    return null;
  }

  return pid;
};

// Function to check if patient name exists and retrieve PID
const checkPatientNameExists = async (name) => {
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("name", "==", name.trim()));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      return { exists: true, pid: userDoc.data().pid };
    }
    return { exists: false, pid: null };
  } catch (error) {
    console.error("Error checking patient name:", error);
    return { exists: false, pid: null };
  }
};

function AddAppointment() {
  const { currentTheme = {
    background: '#fff',
    surface: '#fff',
    border: '#ccc',
    primary: '#2563eb',
    inputBackground: '#f9f9f9',
    text: { primary: '#000' },
  } } = useTheme();
  const navigate = useNavigate();
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedDayName, setSelectedDayName] = useState("");
  const [availableDates, setAvailableDates] = useState([]);
  const [bookedDates, setBookedDates] = useState([]);
  const today = format(new Date(), "yyyy-MM-dd");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [bookingMessage, setBookingMessage] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    pid: "",
    phone: "",
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
  const [hasAvailableDates, setHasAvailableDates] = useState(true);

  useEffect(() => {
    if (showForm && formData.name) {
      const fetchPid = async () => {
        const { exists, pid } = await checkPatientNameExists(formData.name);
        if (exists && pid) {
          setFormData((prev) => ({ ...prev, pid }));
          console.log(`Existing patient found: ${formData.name}, using PID: ${pid}`);
        } else {
          const newPid = await generateUniquePid();
          if (newPid) {
            setFormData((prev) => ({ ...prev, pid: newPid }));
            console.log(`New patient: ${formData.name}, generated PID: ${newPid}`);
          } else {
            setShowForm(false);
            setSelectedSlot("");
            setBookingMessage("Unable to generate a unique Patient ID. Please try again.");
          }
        }
      };
      fetchPid();
    }
  }, [showForm, formData.name]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      console.log("Current user:", user);
      if (!user) {
        setBookingMessage("Authentication required. Please log in to book an appointment.");
        localStorage.setItem("redirectAfterLogin", "/addappointment");
        navigate("/login", { state: { redirectTo: "/addappointment" } });
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleLocation = async () => {
    try {
      setIsLoading(true);
      const locationsRef = collection(db, "appointments/data/schedule");
      const querySnapshot = await getDocs(locationsRef);
      const locationList = querySnapshot.docs.map((doc) => ({
        name: doc.data().location,
        docId: doc.id,
      }));
      console.log("Fetched locations:", locationList);
      const uniqueLocations = [...new Set(locationList.map((loc) => loc.name))].map((name) => ({
        name,
        docId: locationList.find((loc) => loc.name === name).docId,
      }));
      if (uniqueLocations.length === 0) {
        setBookingMessage("No locations available. Please try again later or contact support.");
      }
      setLocations(uniqueLocations);
    } catch (error) {
      console.error("Error fetching locations:", error);
      setLocations([]);
      setBookingMessage("Failed to load locations. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationChange = async (e) => {
    const location = e.target.value;
    if (!location) {
      setBookingMessage("Please select a valid location.");
      setHasAvailableDates(true);
      setSelectedLocation("");
      setSelectedDate("");
      setSelectedDayName("");
      setSelectedSlot("");
      setShowForm(false);
      setTimeSlots([]);
      setDaySchedule(null);
      setIsDateBlocked(false);
      setBlockReason("");
      setLocationMismatch(false);
      return;
    }

    setSelectedLocation(location);
    setSelectedDate("");
    setSelectedDayName("");
    setSelectedSlot("");
    setShowForm(false);
    setBookingMessage("");
    setTimeSlots([]);
    setDaySchedule(null);
    setIsDateBlocked(false);
    setBlockReason("");
    setLocationMismatch(false);

    try {
      setIsLoading(true);
      const scheduleRef = collection(db, "appointments/data/schedule");
      const q = query(scheduleRef, where("location", "==", location));
      const querySnapshot = await getDocs(q);
      const locationDates = querySnapshot.docs.map((doc) => doc.data().date);
      console.log(`Available dates for ${location}:`, locationDates);

      const validDates = [];
      for (const dateStr of locationDates) {
        const isUnavailable = isDateUnavailable(dateStr);
        const { blocked } = await checkIfDateIsBlocked(dateStr, new Date(dateStr).toLocaleDateString("en-US", { weekday: "long" }));
        console.log(`Date ${dateStr}: isUnavailable=${isUnavailable}, blocked=${blocked}`);
        if (!isUnavailable && !blocked) {
          validDates.push(dateStr);
        }
      }

      if (validDates.length === 0) {
        setBookingMessage(`No dates are available for ${location}. Please select another location.`);
        setHasAvailableDates(false);
      } else {
        setHasAvailableDates(true);
        setBookingMessage("");
      }
    } catch (error) {
      console.error("Error checking date availability for location:", error);
      setBookingMessage("Failed to check date availability. Please try again.");
      setHasAvailableDates(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleLocation();
  }, []);

  const handlePhoneInput = (e) => {
    const value = e.target.value.replace(/[^0-9+]/g, "");
    if (value.length > 12) {
      setErrors((prev) => ({ ...prev, phone: "Phone number cannot exceed 12 digits." }));
      return;
    }
    setFormData((prev) => ({ ...prev, phone: value }));
    if (!value) {
      setErrors((prev) => ({ ...prev, phone: "Phone number is required." }));
    } else if (!/^\+?[0-9]{10,12}$/.test(value)) {
      setErrors((prev) => ({ ...prev, phone: "Please enter a valid phone number (10-12 digits)." }));
    } else {
      setErrors((prev) => ({ ...prev, phone: "" }));
    }
  };

  const handleDateChange = (date) => {
    const dateStr = date ? format(date, "yyyy-MM-dd") : "";
    setSelectedDate(dateStr);
    setSelectedSlot("");
    setShowForm(false);
    setBookingMessage("");
    setIsDateBlocked(false);
    setBlockReason("");
    setLocationMismatch(false);

    if (dateStr) {
      const selectedDateObj = new Date(dateStr);
      if (!isValid(selectedDateObj)) {
        setBookingMessage("Invalid date selected. Please choose a valid date.");
        setTimeSlots([]);
        setDaySchedule(null);
        return;
      }
      const dayName = selectedDateObj.toLocaleDateString("en-US", { weekday: "long" });
      setSelectedDayName(dayName);
      setIsSunday(dayName === "Sunday");
      if (isDateUnavailable(dateStr)) {
        setBookingMessage(
          dayName === "Sunday"
            ? "Appointments are not available on Sundays. Please select another day."
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
  };

  const fetchTimeSlots = async (date, dayName) => {
    if (!date || !dayName) return;
    setIsLoading(true);
    const timeout = setTimeout(() => {
      setIsLoading(false);
      setBookingMessage("Request timed out. Please try again.");
    }, 10000);
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
      if (querySnapshot.empty || !querySnapshot.docs[0].data().timeSlots || querySnapshot.docs[0].data().timeSlots.length === 0) {
        setTimeSlots([]);
        setDaySchedule({ isOpen: false });
        setLocationMismatch(true);
        setBookingMessage(`No time slots available for ${selectedLocation} on ${format(new Date(date), "MMMM d, yyyy")}. Please select another date or location.`);
        return;
      }
      const docData = querySnapshot.docs[0].data();
      const storedSlots = Array.isArray(docData.timeSlots)
        ? docData.timeSlots.map((slot) => slot.replace(/["']/g, "").trim())
        : [];
      console.log(`Stored slots for ${date} at ${selectedLocation}:`, storedSlots);
      const bookingsRef = collection(db, "appointments/data/bookings");
      const bookingsQuery = query(
        bookingsRef,
        where("date", "==", date),
        where("location", "==", selectedLocation),
        where("status", "!=", "deleted")
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);
      const bookedSlots = bookingsSnapshot.docs.map((doc) => doc.data().time);
      console.log(`Booked slots for ${date} at ${selectedLocation}:`, bookedSlots);
      const currentTime = getCurrentTimeInIST();
      const selectedDateObj = new Date(date);
      const now = new Date();
      const isToday = isSameDay(selectedDateObj, now);
      const availableSlots = storedSlots.filter((slot) => {
        if (!bookedSlots.includes(slot)) {
          if (!isToday) return true;
          const [time, period] = slot.split(" ");
          const [slotHour, slotMinute] = time.split(":").map(Number);
          let slotHour24 = period === "PM" && slotHour !== 12 ? slotHour + 12 : slotHour;
          if (period === "AM" && slotHour === 12) slotHour24 = 0;
          const slotTimeInMinutes = slotHour24 * 60 + slotMinute;
          const [currentHour, currentMinute, currentPeriod] = currentTime.split(/[:\s]/).map((part, index) => (index < 2 ? Number(part) : part));
          const currentTimeInMinutes =
            (currentPeriod === "PM" && currentHour !== 12 ? currentHour + 12 : currentHour === 12 && currentPeriod === "AM" ? 0 : currentHour) * 60 +
            currentMinute;
          return slotTimeInMinutes > currentTimeInMinutes;
        }
        return false;
      });
      const sortedSlots = availableSlots.sort((a, b) => {
        const timeA = parse(a, "h:mm a", new Date());
        const timeB = parse(b, "h:mm a", new Date());
        return timeA - timeB;
      });
      setTimeSlots(sortedSlots);
      setDaySchedule({ isOpen: sortedSlots.length > 0 });
      if (sortedSlots.length === 0 && !isDateBlocked && !isSunday && !locationMismatch) {
        setBookingMessage(`No available time slots for ${format(new Date(date), "MMMM d, yyyy")} at ${selectedLocation}. Please try another date or location.`);
      } else if (sortedSlots.length > 0) {
        setBookingMessage("");
      }
    } catch (error) {
      console.error("Error fetching time slots:", error);
      if (error.code === "failed-precondition" && error.message?.includes("index")) {
        setBookingMessage("Database index is being created. Please try again in a few minutes.");
      } else if (error.code === "permission-denied") {
        setBookingMessage("You do not have permission to access this data. Please contact support.");
      } else {
        setBookingMessage("Failed to load time slots. Please try again later.");
      }
      setTimeSlots([]);
      setDaySchedule(null);
    } finally {
      clearTimeout(timeout);
      setIsLoading(false);
    }
  };

  const checkSlotAvailability = async (date, slot) => {
    if (!date || !slot) return false;
    try {
      const bookingsRef = collection(db, "appointments/data/bookings");
      const q = query(
        bookingsRef,
        where("date", "==", date),
        where("time", "==", slot),
        where("location", "==", selectedLocation),
        where("status", "!=", "deleted")
      );
      const snapshot = await getDocs(q);
      console.log(`Slot ${slot} on ${date} at ${selectedLocation}:`, snapshot.empty ? "Available" : "Booked");
      if (!snapshot.empty) {
        setBookingMessage("This time slot is already booked. Please choose another slot.");
        return false;
      }
      return true;
    } catch (error) {
      console.error("Error checking slot availability:", error);
      if (error.code === "failed-precondition" && error.message?.includes("index")) {
        setBookingMessage("Database index is being created. Please try again in a few minutes.");
      } else if (error.code === "permission-denied") {
        setBookingMessage("You do not have permission to access this data. Please contact support.");
      } else {
        setBookingMessage("Failed to check slot availability. Please try again.");
      }
      return false;
    }
  };

  const handleSlotSelect = async (slot) => {
    if (!slot) return;
    setIsLoading(true);
    const isAvailable = await checkSlotAvailability(selectedDate, slot);
    console.log("Selected slot:", slot, "Available:", isAvailable);
    if (!isAvailable) {
      setShowForm(false);
      setSelectedSlot("");
      fetchTimeSlots(selectedDate, selectedDayName);
    } else {
      setSelectedSlot(slot);
      setShowForm(true);
      setBookingMessage("");
    }
    setIsLoading(false);
  };

  const handleCancel = () => {
    setSelectedLocation("");
    setSelectedDate("");
    setSelectedDayName("");
    setSelectedSlot("");
    setShowForm(false);
    setBookingMessage("");
    setTimeSlots([]);
    setDaySchedule(null);
    setIsDateBlocked(false);
    setBlockReason("");
    setLocationMismatch(false);
    setFormData({
      name: "",
      email: "",
      pid: "",
      phone: "",
      age: "",
      reasonForVisit: "",
      appointmentType: "Consultation",
      medicalHistory: null,
      medicalHistoryMessage: "",
    });
    setErrors({});
    setHasAvailableDates(true);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = "Name is required.";
    if (!formData.phone) newErrors.phone = "Phone number is required.";
    else if (!/^\+?[0-9]{10,12}$/.test(formData.phone)) newErrors.phone = "Please enter a valid phone number (10-12 digits).";
    if (!formData.pid) newErrors.pid = "Patient ID is required.";
    else if (!/^PID\d{4}-\d{5}$/.test(formData.pid)) newErrors.pid = "Invalid Patient ID format. It should be PIDYYYY-NNNNN (e.g., PID2025-12345).";
    if (!formData.age) newErrors.age = "Age is required.";
    else if (!/^\d+$/.test(formData.age) || formData.age < 0 || formData.age > 120) newErrors.age = "Please enter a valid age (0-120).";
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = "Please enter a valid email address.";
    }
    if (formData.reasonForVisit && formData.reasonForVisit.length > 100) {
      newErrors.reasonForVisit = "Purpose of visit must be 100 characters or less.";
    }
    if (formData.medicalHistoryMessage && formData.medicalHistoryMessage.length > 200) {
      newErrors.medicalHistoryMessage = "Medical history summary must be 200 characters or less.";
    }
    console.log("Form validation errors:", newErrors);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      setBookingMessage("Please correct the errors in the form before submitting.");
      return;
    }
    try {
      setIsLoading(true);
      const isStillAvailable = await checkSlotAvailability(selectedDate, selectedSlot);
      if (!isStillAvailable) {
        setShowForm(false);
        setSelectedSlot("");
        fetchTimeSlots(selectedDate, selectedDayName);
        return;
      }
      if (!window.confirm(`Confirm booking for ${selectedSlot} on ${format(new Date(selectedDate), "MMMM d, yyyy")} at ${selectedLocation}?`)) {
        setIsLoading(false);
        return;
      }
      // Check and create user document if necessary
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          role: "user",
          pid: formData.pid,
          email: auth.currentUser.email,
          name: formData.name,
          createdAt: new Date().toISOString(),
        });
        console.log("Created user document for UID:", auth.currentUser.uid);
      }
      const bookingsRef = collection(db, "appointments/data/bookings");
      const docRef = await addDoc(bookingsRef, {
        location: selectedLocation,
        date: selectedDate,
        time: selectedSlot,
        weekday: selectedDayName,
        name: formData.name,
        email: formData.email,
        pid: formData.pid,
        phone: formData.phone,
        age: formData.age,
        reasonForVisit: formData.reasonForVisit,
        appointmentType: formData.appointmentType,
        medicalHistory: formData.medicalHistory ? formData.medicalHistory.name : "",
        medicalHistoryMessage: formData.medicalHistoryMessage,
        bookedBy: auth.currentUser?.uid || "anonymous",
        status: "pending",
        createdAt: new Date().toISOString(),
      });
      console.log("Appointment booked, Doc ID:", docRef.id);

      if (formData.phone && /^\+?[0-9]{10,12}$/.test(formData.phone)) {
        const phoneNumber = formData.phone.startsWith("+") ? formData.phone : `+91${formData.phone}`;
        const message = `Dear ${formData.name}, your appointment is confirmed for ${format(
          new Date(selectedDate),
          "MMMM d, yyyy"
        )} at ${selectedSlot} at ${selectedLocation}. Appointment Type: ${formData.appointmentType}. PID: ${formData.pid}.`;
        window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, "_blank");
      }

      setShowSuccess(true);
      setShowForm(false);
      setTimeout(() => {
        setShowSuccess(false);
        setSelectedDate("");
        setSelectedDayName("");
        setSelectedSlot("");
        setFormData({
          name: "",
          email: "",
          pid: "",
          phone: "",
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
      console.error("Error booking appointment:", error);
      if (error.code === "permission-denied") {
        setBookingMessage("You do not have permission to book an appointment. Please contact support.");
      } else {
        setBookingMessage(`Failed to book appointment: ${error.message || "Unknown error"}. Please try again later.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentTimeInIST = () => {
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      const parts = formatter.formatToParts(now);
      const hour = parts.find((part) => part.type === "hour").value;
      const minute = parts.find((part) => part.type === "minute").value;
      const period = parts.find((part) => part.type === "dayPeriod")?.value || "AM";
      return `${hour}:${minute} ${period}`;
    } catch (error) {
      console.error("Error getting current time in IST:", error);
      return "12:00 AM";
    }
  };

  const checkIfDateIsBlocked = async (dateStr, dayName) => {
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
      console.error("Error checking blocked date:", error);
      setBookingMessage("Failed to check date availability. Please try again.");
      return { blocked: false, reason: "" };
    }
  };

  const isDateUnavailable = (dateStr) => {
    try {
      const date = new Date(dateStr);
      if (!isValid(date)) return true;
      const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
      return dayName === "Sunday" || date < new Date(today);
    } catch (error) {
      console.error("Error checking date availability:", error);
      return true;
    }
  };

  const isDateAvailable = (date) => {
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      return availableDates.some((d) => d.date === dateStr && d.location.toLowerCase() === selectedLocation.toLowerCase()) && !isDateUnavailable(dateStr);
    } catch (error) {
      console.error("Error checking date availability:", error);
      return false;
    }
  };

  const filterUnavailableDates = (date) => {
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      return !isDateUnavailable(dateStr) && isDateAvailable(date);
    } catch (error) {
      console.error("Error filtering unavailable dates:", error);
      return false;
    }
  };

  useEffect(() => {
    const fetchAvailableDates = async () => {
      try {
        const scheduleRef = collection(db, "appointments/data/schedule");
        const querySnapshot = await getDocs(scheduleRef);
        const dates = querySnapshot.docs.map((doc) => ({
          date: doc.data().date,
          location: doc.data().location,
        }));
        console.log("Available dates:", dates);
        if (dates.length === 0) {
          setBookingMessage("No available dates found. Please try again later.");
        }
        setAvailableDates(dates);
      } catch (error) {
        console.error("Error fetching available dates:", error);
        if (error.code === "permission-denied") {
          setBookingMessage("You do not have permission to access this data. Please contact support.");
        } else {
          setBookingMessage("Failed to load available dates. Please try again later.");
        }
      }
    };
    fetchAvailableDates();
  }, []);

  useEffect(() => {
    const fetchBookedDates = async () => {
      try {
        const snapshot = await getDocs(collection(db, "appointments/data/bookings"));
        const counts = {};
        snapshot.forEach((doc) => {
          const { date, location, status } = doc.data();
          if (status !== "deleted") {
            const key = `${date}|${location}`;
            counts[key] = (counts[key] || 0) + 1;
          }
        });
        const fullyBooked = Object.entries(counts)
          .filter(([key, count]) => count >= 10)
          .map(([key]) => key.split("|")[0]);
        console.log("Fully booked dates:", fullyBooked);
        setBookedDates(fullyBooked);
      } catch (error) {
        console.error("Error fetching booked dates:", error);
        if (error.code === "permission-denied") {
          setBookingMessage("You do not have permission to access this data. Please contact support.");
        } else {
          setBookingMessage("Failed to load booked dates. Please try again.");
        }
      }
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
          if (appointment.status !== "deleted") {
            const key = `${appointment.date}|${appointment.location}`;
            if (!slots[key]) slots[key] = [];
            slots[key].push(appointment.time);
          }
        });
        console.log("Booked slots:", slots);
        setBookedSlots(slots);
      } catch (error) {
        console.error("Error fetching booked slots:", error);
        if (error.code === "permission-denied") {
          setBookingMessage("You do not have permission to access this data. Please contact support.");
        } else {
          setBookingMessage("Failed to load booked slots. Please try again.");
        }
      }
    };
    fetchBookedSlots();
  }, []);

  useEffect(() => {
    if (!selectedDate || !selectedLocation) return;
    const bookingsRef = collection(db, "appointments/data/bookings");
    const q = query(
      bookingsRef,
      where("date", "==", selectedDate),
      where("location", "==", selectedLocation),
      where("status", "!=", "deleted")
    );
    const unsubscribe = onSnapshot(
      q,
      () => {
        fetchTimeSlots(selectedDate, selectedDayName);
      },
      (error) => {
        console.error("Error in real-time bookings listener:", error);
        if (error.code === "permission-denied") {
          setBookingMessage("You do not have permission to access this data. Please contact support.");
        } else {
          setBookingMessage("Failed to update available slots. Please try again.");
        }
      }
    );
    return () => unsubscribe();
  }, [selectedDate, selectedLocation, selectedDayName]);

  return (
    <section
      className="min-h-[calc(100vh-200px)] flex items-center justify-center p-4 sm:p-6"
      style={{ backgroundColor: currentTheme.background, borderColor: currentTheme.border, borderWidth: "1px" }}
    >
      <div className="w-full max-w-2xl">
        <Card title="Book Your Appointment">
          {showSuccess && (
            <p className="mb-4 p-3 rounded-lg bg-green-100 text-green-800 text-sm sm:text-base text-center">
              Appointment booked successfully! A confirmation has been sent via WhatsApp.
            </p>
          )}

          {bookingMessage && (
            <p className="mb-4 p-3 rounded-lg bg-red-100 text-red-800 text-sm sm:text-base text-center">
              {bookingMessage}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-4 mb-6 items-center">
            <div className="w-full sm:w-1/2 flex items-center">
              <label htmlFor="location-select" className="text-sm sm:text-base font-medium mr-2 whitespace-nowrap" style={{ color: currentTheme.text.primary }}>
                Select Location<span className="text-red-500 ml-1">*</span>
              </label>
              <CustomSelect
                id="location-select"
                value={selectedLocation}
                onChange={handleLocationChange}
                options={[{ value: "", label: "Select your location", disabled: true }, ...locations.map((loc) => ({ value: loc.name, label: loc.name }))]}
                required
                className="w-full p-2 rounded-md border text-sm sm:text-base"
                style={{ borderColor: currentTheme.border, backgroundColor: currentTheme.inputBackground, color: currentTheme.text.primary }}
              />
            </div>
            <div className="w-full sm:w-1/2 flex items-center">
              <label htmlFor="date-input" className="text-sm sm:text-base font-medium mr-2 whitespace-nowrap" style={{ color: currentTheme.text.primary }}>
                Select Date<span className="text-red-500 ml-1">*</span>
              </label>
              <DatePicker
                id="date-input"
                selected={selectedDate ? new Date(selectedDate) : null}
                onChange={handleDateChange}
                minDate={new Date(today)}
                maxDate={new Date(new Date().setFullYear(new Date().getFullYear() + 1))}
                dayClassName={(date) =>
                  isDateAvailable(date) && isValid(date) ? "bg-green-100 text-green-800 font-semibold" : isDateUnavailable(format(date, "yyyy-MM-dd")) ? "cursor-not-allowed text-gray-400" : ""
                }
                filterDate={filterUnavailableDates}
                required
                className="w-full p-2 rounded-md border text-sm sm:text-base"
                style={{ borderColor: currentTheme.border, backgroundColor: currentTheme.inputBackground, color: currentTheme.text.primary }}
                disabled={!selectedLocation || !hasAvailableDates}
                placeholderText="Select Date"
                showPopperArrow={false}
                dateFormat="dd-MM-yyyy"
                onKeyDown={(e) => e.preventDefault()}
              />
            </div>
          </div>

          {selectedDate && selectedDayName && !isLoading && (
            <p className="text-sm sm:text-base font-medium text-center mb-6" style={{ color: currentTheme.text.primary }}>
              Selected Date: {format(new Date(selectedDate), "MMMM d, yyyy")} at {selectedLocation} | Day: {selectedDayName}
            </p>
          )}

          {isLoading && (
            <span className="animate-spin rounded-full h-8 w-8 border-b-2 block mx-auto py-4" style={{ borderColor: currentTheme.primary }}></span>
          )}

          {selectedDate && timeSlots.length > 0 && !isLoading && !locationMismatch && (
            <>
              <label className="block text-sm sm:text-base font-medium mb-2 text-center" style={{ color: currentTheme.text.primary }}>
                Available Time Slots
              </label>
              <div className="flex flex-wrap justify-center gap-4">
                {timeSlots.map((slot) => {
                  const [time, period] = slot.split(" ");
                  const isBooked = bookedSlots[`${selectedDate}|${selectedLocation}`]?.includes(slot);
                  return (
                    <CustomButton
                      key={slot}
                      variant={selectedSlot === slot ? "primary" : isBooked ? "disabled" : "secondary"}
                      onClick={() => !isBooked && handleSlotSelect(slot)}
                      className={`w-28 sm:w-32 h-10 text-xs sm:text-sm py-2 px-3 flex items-center justify-center ${isBooked ? "cursor-not-allowed bg-red-500 text-white opacity-75 hover:bg-red-600" : ""}`}
                      disabled={isBooked}
                    >
                      <Clock className="w-4 h-4 mr-1" />
                      <span>{time}</span>
                      <span>{period}</span>
                    </CustomButton>
                  );
                })}
              </div>
            </>
          )}

          {showForm && (
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
        </Card>
      </div>
    </section>
  );
}

export default AddAppointment;