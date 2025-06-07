import React, { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { format, isSameDay, parse, isValid } from "date-fns";
import { db } from "../firebase/config";
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
import CustomInput from "../components/CustomInput";
import CustomButton from "../components/CustomButton";
import CustomSelect from "../components/CustomSelect";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Clock } from "lucide-react";
import emailjs from "@emailjs/browser";

function BookAppointment() {
  const { currentTheme } = useTheme();
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [availableDates, setAvailableDates] = useState([]);
  const [bookedDates, setBookedDates] = useState([]);
  const today = format(new Date(), "yyyy-MM-dd");
  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);
  const maxDate = format(nextYear, "yyyy-MM-dd");
  const [allowedDateRange, setAllowedDateRange] = useState({
    startDate: today,
    endDate: maxDate,
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

  // Initialize EmailJS with public key
  useEffect(() => {
    emailjs.init("2pSuAO6tF3T-sejH-");
  }, []);

  // Log errors state changes for debugging
  useEffect(() => {
    console.log("Current errors state:", errors);
  }, [errors]);

  const handleLocation = async () => {
    try {
      setIsLoading(true);
      const locationsRef = collection(db, "appointments/data/schedule");
      const querySnapshot = await getDocs(locationsRef);
      const locationList = querySnapshot.docs.map((doc) => ({
        name: doc.data().location,
        docId: doc.id,
      }));

      const seenNames = new Set();
      const uniqueLocations = locationList.filter((location) => {
        const nameLower = location.name.toLowerCase();
        if (seenNames.has(nameLower)) {
          return false;
        }
        seenNames.add(nameLower);
        return true;
      });

      console.log("Unique locations:", uniqueLocations);

      if (uniqueLocations.length > 0) {
        setLocations(uniqueLocations);
        setSelectedLocation(uniqueLocations[0].name);
      } else {
        setLocations([{ name: "Prime", docId: null }]);
        setSelectedLocation("Prime");
        setBookingMessage("No locations found. Defaulting to Prime.");
      }
    } catch (error) {
      console.error("Error fetching locations:", error.code, error.message);
      setLocations([{ name: "Prime", docId: null }]);
      setSelectedLocation("Prime");
      setBookingMessage(`Error loading locations: ${error.message}. Using default location: Prime.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationChange = (e) => {
    const location = e.target.value;
    setSelectedLocation(location);
    setSelectedDate("");
    setSelectedSlot("");
    setShowForm(false);
    setBookingMessage("");
    setTimeSlots([]);
    setDaySchedule(null);
    setIsDateBlocked(false);
    setBlockReason("");
    setLocationMismatch(false);
  };

  useEffect(() => {
    handleLocation();
  }, []);

  const handlePhoneInput = (e) => {
    const value = e.target.value;
    const sanitizedValue = value
      .split("")
      .filter((char, index) => {
        if (index === 0 && char === "+") return true;
        return /[0-9]/.test(char);
      })
      .join("");
    if (sanitizedValue.length <= 11) {
      setFormData((prev) => ({
        ...prev,
        phone: sanitizedValue,
      }));
      validatePhone(sanitizedValue);
    }
  };

  const validatePhone = (value) => {
    console.log(`Validating phone: ${value}`);
    if (!value) {
      setErrors((prev) => ({
        ...prev,
        phone: "Phone is required",
      }));
    } else if (!/^\+?[0-9]{0,10}$/.test(value)) {
      setErrors((prev) => ({
        ...prev,
        phone: "Phone number must contain only digits (up to 10)",
      }));
    } else if (value.startsWith("+") && value.length !== 11) {
      setErrors((prev) => ({
        ...prev,
        phone: "Phone number must be exactly 10 digits (with +)",
      }));
    } else if (!value.startsWith("+") && value.length !== 10) {
      setErrors((prev) => ({
        ...prev,
        phone: "Phone number must be exactly 10 digits",
      }));
    } else {
      setErrors((prev) => ({ ...prev, phone: "" }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "name" && value.length > 25) {
      return;
    }
    if (name === "reasonForVisit" && value.length > 25) {
      return;
    }

    if (name !== "phone") {
      setFormData((prev) => ({
        ...prev,
        [name]: name === "reasonForVisit" ? value.trim() : value,
      }));
    }

    if (name === "name") {
      console.log(`Validating name: ${value}`);
      if (!value) {
        setErrors((prev) => ({
          ...prev,
          name: "Name is required",
        }));
      } else if (value.length < 3 || value.length > 25) {
        setErrors((prev) => ({
          ...prev,
          name: "Name must be between 3 and 25 characters",
        }));
      } else {
        setErrors((prev) => ({ ...prev, name: "" }));
      }
    }

    if (name === "email") {
      console.log(`Validating email: ${value}`);
      if (!value.trim()) {
        setErrors((prev) => ({
          ...prev,
          email: "Email is required",
        }));
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
        setErrors((prev) => ({
          ...prev,
          email: "Please enter a valid email address",
        }));
      } else {
        setErrors((prev) => ({ ...prev, email: "" }));
      }
    }

    if (name === "reasonForVisit") {
      console.log(`Validating reasonForVisit: ${value}`);
      if (!value.trim()) {
        setErrors((prev) => ({
          ...prev,
          reasonForVisit: "Reason for visit is required",
        }));
      } else if (value.trim().length < 3 || value.trim().length > 25) {
        setErrors((prev) => ({
          ...prev,
          reasonForVisit: "Reason must be between 5 and 25 characters",
        }));
      } else {
        setErrors((prev) => ({ ...prev, reasonForVisit: "" }));
      }
    }

    if (name === "medicalHistoryMessage") {
      console.log(`Validating medicalHistoryMessage: ${value}`);
      if (value.length > 200) {
        setErrors((prev) => ({
          ...prev,
          medicalHistoryMessage: "Summary must be 200 characters or less",
        }));
      } else {
        setErrors((prev) => ({ ...prev, medicalHistoryMessage: "" }));
      }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (!validTypes.includes(file.type)) {
        setErrors((prev) => ({
          ...prev,
          medicalHistory: "Please upload a PDF or DOC/DOCX file",
        }));
        setFormData((prev) => ({ ...prev, medicalHistory: null }));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({
          ...prev,
          medicalHistory: "File size must be less than 5MB",
        }));
        setFormData((prev) => ({ ...prev, medicalHistory: null }));
        return;
      }
      setFormData((prev) => ({ ...prev, medicalHistory: file }));
      setErrors((prev) => ({ ...prev, medicalHistory: "" }));
      console.log("Selected file:", file.name);
    } else {
      setErrors((prev) => ({ ...prev, medicalHistory: "" }));
      setFormData((prev) => ({ ...prev, medicalHistory: null }));
    }
  };

  const handleDobChange = (date) => {
    const formattedDate = date ? format(date, "yyyy-MM-dd") : "";
    setFormData((prev) => ({
      ...prev,
      dob: formattedDate,
    }));
    console.log(`Validating DOB: ${formattedDate}`);
    if (!formattedDate) {
      setErrors((prev) => ({
        ...prev,
        dob: "Date of Birth is required",
      }));
    } else {
      const dobDate = new Date(formattedDate);
      const today = new Date();
      if (isNaN(dobDate.getTime())) {
        setErrors((prev) => ({
          ...prev,
          dob: "Please enter a valid date",
        }));
      } else if (dobDate >= today) {
        setErrors((prev) => ({
          ...prev,
          dob: "Date of Birth cannot be in the future",
        }));
      } else {
        setErrors((prev) => ({ ...prev, dob: "" }));
      }
    }
  };

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
    return `${hour}:${minute}`;
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
        } else {
          console.log("No date range settings found, using default range.");
        }
      } catch (error) {
        console.error("Failed to fetch date range:", error.code, error.message);
        setBookingMessage("Failed to load date range. Please try again.");
      }
    };
    fetchDateRange();
  }, []);

  useEffect(() => {
    const fetchAvailableDates = async () => {
      try {
        const scheduleRef = collection(db, "appointments/data/schedule");
        const querySnapshot = await getDocs(scheduleRef);
        const dates = querySnapshot.docs.map((doc) => ({
          date: doc.data().date,
          location: doc.data().location,
        }));
        setAvailableDates(dates);
        console.log("Available dates:", dates);
      } catch (error) {
        console.error("Error fetching available dates:", error.code, error.message);
        setBookingMessage("Error loading available dates. Please try again.");
      }
    };
    fetchAvailableDates();
  }, []);

  const checkIfDateIsBlocked = async (dateStr, dayName) => {
    try {
      const date = new Date(dateStr);
      const blockedPeriodsDoc = await getDoc(doc(db, "settings", "blockedPeriods"));
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
      console.error("Error checking blocked date:", error.code, error.message);
      setBookingMessage("Error checking date availability. Please try again.");
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

  const isDateAvailable = (date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return (
      availableDates.some(
        (d) => d.date === dateStr && d.location.toLowerCase() === selectedLocation.toLowerCase()
      ) &&
      !isDateUnavailable(dateStr)
    );
  };

  const filterUnavailableDates = (date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return !isDateUnavailable(dateStr) && isDateAvailable(date);
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
        setBookingMessage(
          reason || "This date is unavailable for bookings. Please select another date."
        );
        setIsLoading(false);
        return;
      }

      setIsDateBlocked(false);
      setBlockReason("");

      const scheduleRef = collection(db, "appointments/data/schedule");
      const q = query(
        scheduleRef,
        where("date", "==", date),
        where("location", "==", selectedLocation)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setTimeSlots([]);
        setDaySchedule({ isOpen: false });
        setLocationMismatch(true);
        setBookingMessage(
          `No schedule available for ${date} at ${selectedLocation}. Please select another date or location.`
        );
        setIsLoading(false);
        return;
      }

      const docData = querySnapshot.docs[0].data();
      setLocationMismatch(false);
      const storedSlots = Array.isArray(docData.timeSlots)
        ? docData.timeSlots.map(formatTimeSlot)
        : [];

      const currentTime = getCurrentTimeInIST();
      const selectedDateObj = new Date(date);
      const now = new Date();
      const isToday = isSameDay(selectedDateObj, now);

      const availableSlots = storedSlots.filter((slot) => {
        if (bookedSlots[date]?.includes(slot)) {
          return false;
        }

        const [time, period] = slot.split(" ");
        const [slotHour, slotMinute] = time.split(":").map(Number);
        let slotHour24 =
          period === "PM" && slotHour !== 12 ? slotHour + 12 : slotHour;
        if (period === "AM" && slotHour === 12) slotHour24 = 0;
        const slotTimeInMinutes = slotHour24 * 60 + slotMinute;

        const endHour24 = 17;
        const endMinute = 30;
        const endTimeInMinutes = endHour24 * 60 + endMinute;

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

        return slotTimeInMinutes <= endTimeInMinutes;
      });

      const sortedSlots = availableSlots.sort((a, b) => {
        const timeA = parse(a, "h:mm a", new Date());
        const timeB = parse(b, "h:mm a", new Date());
        return timeA - timeB;
      });

      setTimeSlots(sortedSlots);
      setDaySchedule({ isOpen: sortedSlots.length > 0 });
      if (sortedSlots.length === 0 && !isDateBlocked && !isSunday && !locationMismatch) {
        setBookingMessage("All slots are booked. Please select another day.");
      }
    } catch (error) {
      console.error("Error fetching time slots:", error.code, error.message);
      setTimeSlots([]);
      setBookingMessage(`Error loading available slots: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

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
        const fullyBooked = Object.entries(counts)
          .filter(([key, count]) => count >= MAX_SLOTS_PER_DAY)
          .map(([key]) => key.split("|")[0]);
        setBookedDates(fullyBooked);
        console.log("Fully booked dates:", fullyBooked);
      } catch (error) {
        console.error("Error fetching booked dates:", error.code, error.message);
        setBookingMessage("Error loading booked dates. Please try again.");
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
          const key = `${appointment.date}|${appointment.location}`;
          if (!slots[key]) {
            slots[key] = [];
          }
          slots[key].push(appointment.time);
        });
        setBookedSlots(slots);
        console.log("Booked slots:", slots);
      } catch (error) {
        console.error("Error fetching booked slots:", error.code, error.message);
        setBookingMessage("Error loading booked slots. Please try again.");
      }
    };

    const createDataDocIfNeeded = async () => {
      const dataDocRef = doc(db, "appointments", "data");
      const dataDoc = await getDoc(dataDocRef);
      if (!dataDoc.exists()) {
        try {
          await setDoc(dataDocRef, {
            created: new Date(),
            description: "Container for appointment bookings",
          });
          console.log("Created appointments/data document");
        } catch (error) {
          console.error("Error creating appointments/data document:", error.code, error.message);
          setBookingMessage("Error initializing appointment data. Please try again.");
        }
      }
    };
    createDataDocIfNeeded().then(() => fetchBookedSlots());
  }, []);

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
      const dayName = selectedDateObj.toLocaleDateString("en-US", {
        weekday: "long",
      });
      setSelectedDayName(dayName);
      setIsSunday(dayName === "Sunday");
      if (isDateUnavailable(dateStr)) {
        setBookingMessage(
          dayName === "Sunday"
            ? "The doctor is not available on Sundays. Please select another day."
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
  };

  const checkSlotAvailability = async (date, slot) => {
    try {
      const bookingsRef = collection(db, "appointments/data/bookings");
      const q = query(
        bookingsRef,
        where("date", "==", date),
        where("time", "==", slot),
        where("location", "==", selectedLocation)
      );
      const snapshot = await getDocs(q);
      console.log("Slot availability for", date, slot, selectedLocation, ":", snapshot.empty);
      return snapshot.empty;
    } catch (error) {
      console.error("Error checking slot availability:", error.code, error.message);
      setBookingMessage("Error checking slot availability. Please try again.");
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
        [`${selectedDate}|${selectedLocation}`]: [
          ...(prev[`${selectedDate}|${selectedLocation}`] || []),
          slot,
        ],
      }));
      fetchTimeSlots(selectedDate, selectedDayName);
    } else {
      setSelectedSlot(slot);
      setShowForm(true);
      setBookingMessage("");
    }
    setIsLoading(false);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name) {
      newErrors.name = "Name is required";
    } else if (formData.name.length < 5 || formData.name.length > 25) {
      newErrors.name = "Name must be between 5 and 25 characters";
    }

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.phone) {
      newErrors.phone = "Phone is required";
    } else if (!/^\+?[0-9]{0,10}$/.test(formData.phone)) {
      newErrors.phone = "Phone number must contain only digits (up to 10)";
    } else if (formData.phone.startsWith("+") && formData.phone.length !== 11) {
      newErrors.phone = "Phone number must be exactly 10 digits (with +)";
    } else if (!formData.phone.startsWith("+") && formData.phone.length !== 10) {
      newErrors.phone = "Phone number must be exactly 10 digits";
    }

    if (!formData.dob) {
      newErrors.dob = "Date of Birth is required";
    } else {
      const dobDate = new Date(formData.dob);
      const today = new Date();
      if (isNaN(dobDate.getTime())) {
        newErrors.dob = "Please enter a valid date";
      } else if (dobDate >= today) {
        newErrors.dob = "Date of Birth cannot be in the future";
      }
    }

    if (!formData.reasonForVisit) {
      newErrors.reasonForVisit = "Reason for visit is required";
    } else {
      const length = formData.reasonForVisit.trim().length;
      if (length < 5 || length > 25) {
        newErrors.reasonForVisit = "Reason for visit must be between 5 and 25 characters";
      }
    }

    if (formData.medicalHistoryMessage.length > 200) {
      newErrors.medicalHistoryMessage = "Summary must be 200 characters or less";
    }

    if (formData.medicalHistory) {
      const validTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (!validTypes.includes(formData.medicalHistory.type)) {
        newErrors.medicalHistory = "Please upload a PDF or DOC/DOCX file";
      } else if (formData.medicalHistory.size > 5 * 1024 * 1024) {
        newErrors.medicalHistory = "File size must be less than 5MB";
      }
    }

    setErrors(newErrors);
    console.log("Validation errors on form submission:", newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      setBookingMessage("Please correct the errors in the form.");
      return;
    }
    try {
      setIsLoading(true);
      const isStillAvailable = await checkSlotAvailability(selectedDate, selectedSlot);
      if (!isStillAvailable) {
        setBookingMessage("This slot was just booked. Please select another time.");
        setShowForm(false);
        setSelectedSlot("");
        fetchTimeSlots(selectedDate, selectedDayName);
        return;
      }
      const { blocked, reason } = await checkIfDateIsBlocked(selectedDate, selectedDayName);
      if (blocked) {
        setBookingMessage(`This date is not available: ${reason}`);
        setShowForm(false);
        return;
      }
      const bookingsRef = collection(db, "appointments/data/bookings");
      const docRef = await addDoc(bookingsRef, {
        location: selectedLocation,
        date: selectedDate,
        time: selectedSlot,
        weekday: selectedDayName,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        dob: formData.dob,
        reasonForVisit: formData.reasonForVisit,
        appointmentType: formData.appointmentType,
        medicalHistory: formData.medicalHistory ? formData.medicalHistory.name : "",
        medicalHistoryMessage: formData.medicalHistoryMessage,
        status: "pending",
        createdAt: new Date().toISOString(),
      });
      console.log("Appointment booked with ID:", docRef.id);

      // Send confirmation email using EmailJS
      const emailParams = {
        name: formData.name,
        email: formData.email,
        date: format(new Date(selectedDate), "MMMM d, yyyy"),
        time: selectedSlot,
        location: selectedLocation,
        appointment_type: formData.appointmentType,
      };

      await emailjs
        .send("service_dkv3rib", "template_iremp8a", emailParams)
        .then((response) => {
          console.log("Email sent successfully:", response.status, response.text);
        })
        .catch((error) => {
          console.error("Failed to send email:", error);
          setBookingMessage("Appointment booked, but failed to send confirmation email.");
        });

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
          phone: "",
          dob: "",
          reasonForVisit: "",
          appointmentType: "Consultation",
          medicalHistory: null,
          medicalHistoryMessage: "",
        });
        setTimeSlots([]);
        setDaySchedule(null);
      }, 3000);
    } catch (error) {
      console.error("Error booking appointment:", error.code, error.message);
      setBookingMessage(`Error booking appointment: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
    setIsLoading(false);
  };

  return (
    <div
      className="p-4 sm:p-6 rounded-lg w-full max-w-4xl mx-auto overflow-hidden min-h-[calc(100vh-200px)]"
      style={{ backgroundColor: currentTheme.surface }}
    >
      <div className="flex justify-center items-center mb-4 sm:mb-6">
        <h2
          className="text-xl sm:text-2xl font-semibold text-center whitespace-nowrap"
          style={{ color: currentTheme.text.primary }}
        >
          Book Your Appointment
        </h2>
      </div>

      {showSuccess && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg bg-green-100 text-green-800 text-sm sm:text-base">
          Appointment booked successfully! A confirmation email has been sent.
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
                htmlFor="location-select"
                className="text-sm sm:text-base font-medium whitespace-nowrap"
                style={{ color: currentTheme.text.primary }}
              >
                Select Location
                <span className="text-red-500 ml-1">*</span>
              </label>
              <CustomSelect
                id="location-select"
                value={selectedLocation}
                onChange={handleLocationChange}
                options={locations.map((loc) => ({ value: loc.name, label:	loc.name }))}
                required
                className="w-32 sm:w-40 p-2 rounded-md border text-sm sm:text-base"
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
                Select Date
                <span className="text-red-500 ml-1">*</span>
              </label>
              <DatePicker
                selected={selectedDate ? new Date(selectedDate) : null}
                onChange={handleDateChange}
                minDate={new Date(allowedDateRange.startDate)}
                maxDate={new Date(allowedDateRange.endDate)}
                dayClassName={(date) =>
                  isDateAvailable(date) && isValid(date)
                    ? "bg-green-100 text-green-800 font-semibold"
                    : isDateUnavailable(format(date, "yyyy-MM-dd"))
                    ? "cursor-not-allowed text-gray-400"
                    : ""
                }
                filterDate={filterUnavailableDates}
                required
                className="w-32 sm:w-40 p-2 rounded-md border text-sm sm:text-base"
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
              Available Time Slots
            </label>
            <div className="flex justify-center">
              <div className="flex flex-wrap justify-center gap-2 sm:gap-3 max-w-3xl">
                {timeSlots.map((slot) => {
                  const isBooked = bookedSlots[`${selectedDate}|${selectedLocation}`]?.includes(slot);
                  const Icon = Clock;
                  const [time, period] = slot.split(" ");
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
                      className={`w-28 sm:w-32 h-10 text-xs sm:text-sm py-2 px-3 flex items-center justify-center ${
                        isBooked ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1 whitespace-nowrap">
                        <Icon className="w-4 h-4" />
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

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="space-y-6 sm:space-y-8 mt-6 sm:mt-8 bg-white p-6 rounded-lg shadow-sm"
            style={{ backgroundColor: currentTheme.surface }}
          >
            <div className="grid sm:grid-cols-2 gap-6">
              <CustomInput
                label="Client Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                maxLength={25}
                error={errors.name}
                className="w-full p-2 rounded-md border"
                style={{
                  borderColor: errors.name ? "rgb(239, 68, 68)" : currentTheme.border,
                  backgroundColor: currentTheme.inputBackground,
                  color: currentTheme.text.primary,
                }}
              />
              <CustomInput
                type="email"
                label="Email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                error={errors.email}
                className="w-full p-2 rounded-md border"
                style={{
                  borderColor: errors.email ? "rgb(239, 68, 68)" : currentTheme.border,
                  backgroundColor: currentTheme.inputBackground,
                  color: currentTheme.text.primary,
                }}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <CustomInput
                type="tel"
                label="Phone"
                name="phone"
                value={formData.phone}
                onChange={handlePhoneInput}
                required
                error={errors.phone}
                className="w-full p-2 rounded-md border"
                style={{
                  borderColor: errors.phone ? "rgb(239, 68, 68)" : currentTheme.border,
                  backgroundColor: currentTheme.inputBackground,
                  color: currentTheme.text.primary,
                }}
              />
              <div>
                <label
                  className="block text-sm sm:text-base font-medium mb-2"
                  style={{ color: currentTheme.text.primary }}
                >
                  Date of Birth
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <DatePicker
                  selected={formData.dob ? new Date(formData.dob) : null}
                  onChange={handleDobChange}
                  maxDate={new Date()}
                  showYearDropdown
                  showMonthDropdown
                  dropdownMode="select"
                  placeholderText="Select Date of Birth"
                  className="w-full p-2 rounded-md border"
                  style={{
                    borderColor: errors.dob ? "rgb(239, 68, 68)" : currentTheme.border,
                    backgroundColor: currentTheme.inputBackground,
                    color: currentTheme.text.primary,
                  }}
                  required
                  dateFormat="dd-MM-yyyy"
                  onKeyDown={(e) => e.preventDefault()}
                />
                {errors.dob && (
                  <p className="text-red-500 text-xs mt-1">{errors.dob}</p>
                )}
              </div>
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
              className="w-full p-2 rounded-md border"
              style={{
                borderColor: errors.appointmentType ? "rgb(239, 68, 68)" : currentTheme.border,
                backgroundColor: currentTheme.inputBackground,
                color: currentTheme.text.primary,
              }}
            />

            <div>
              <CustomInput
                label="Reason for Visit"
                name="reasonForVisit"
                value={formData.reasonForVisit}
                onChange={handleInputChange}
                required
                maxLength={25}
                error={errors.reasonForVisit}
                className="w-full p-2 rounded-md border"
                style={{
                  borderColor: errors.reasonForVisit ? "rgb(239, 68, 68)" : currentTheme.border,
                  backgroundColor: currentTheme.inputBackground,
                  color: currentTheme.text.primary,
                }}
              />
              <p className="text-sm text-gray-500 mt-1">
                Characters: {formData.reasonForVisit.length}/25
              </p>
            </div>

            <div>
              <label
                className="block text-sm sm:text-base font-medium mb-2"
                style={{ color: currentTheme.text.primary }}
              >
                Medical History (Optional)
              </label>
              <input
                type="file"
                name="medicalHistory"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx"
                className="w-full p-2 rounded-md border"
                style={{
                  borderColor: errors.medicalHistory ? "rgb(239, 68, 68)" : currentTheme.border,
                  backgroundColor: currentTheme.inputBackground,
                  color: currentTheme.text.primary,
                }}
              />
              {errors.medicalHistory && (
                <p className="text-red-500 text-xs mt-1">{errors.medicalHistory}</p>
              )}
              {formData.medicalHistory && (
                <p className="text-sm text-gray-500 mt-1">
                  Selected file: {formData.medicalHistory.name}
                </p>
              )}
            </div>

            <div>
              <label
                className="block text-sm sm:text-base font-medium mb-2"
                style={{ color: currentTheme.text.primary }}
              >
                Medical History Summary
              </label>
              <textarea
                name="medicalHistoryMessage"
                value={formData.medicalHistoryMessage}
                onChange={handleInputChange}
                className="w-full p-2 rounded-md border"
                style={{
                  borderColor: errors.medicalHistoryMessage ? "rgb(239, 68, 68)" : currentTheme.border,
                  backgroundColor: currentTheme.inputBackground,
                  color: currentTheme.text.primary,
                }}
                rows="3"
                maxLength="200"
              />
              {errors.medicalHistoryMessage && (
                <p className="text-red-500 text-xs mt-1">{errors.medicalHistoryMessage}</p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                Characters: {formData.medicalHistoryMessage.length}/200
              </p>
            </div>

            <div className="flex justify-center">
              <CustomButton
                type="submit"
                variant="primary"
                className="w-max py-2 px-4"
                disabled={isLoading}
              >
                {isLoading ? "Processing..." : "Book Appointment"}
              </CustomButton>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default BookAppointment;