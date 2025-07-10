import React, { useState, useEffect, useCallback } from "react";
import { useTheme } from "../../context/ThemeContext";
import { db, auth } from "../../firebase/config";
import { collection, getDocs, addDoc, doc, getDoc } from "firebase/firestore";
import CustomInput from "../../components/CustomInput";
import CustomButton from "../../components/CustomButton";
import CustomSelect from "../../components/CustomSelect";
import { Clock, User, MapPin, CheckCircle, AlertTriangle, Loader } from "lucide-react";
import { useNavigate } from "react-router-dom";

function BookingForm({ onBookingSuccess, theme }) {
  const { currentTheme } = useTheme();
  const actualTheme = theme || currentTheme;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [availableLocations, setAvailableLocations] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [notification, setNotification] = useState(null);
  const [user, setUser] = useState(null);

  const [formData, setFormData] = useState({
    patientName: "",
    patientEmail: "",
    patientPhone: "",
    patientAge: "",
    appointmentDate: "",
    appointmentTime: "",
    location: "",
    reasonForVisit: "",
    medicalHistory: "",
    appointmentType: "Consultation",
  });

  const [errors, setErrors] = useState({});

  const showNotification = useCallback((message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  const getTodayString = () => new Date().toISOString().split("T")[0];

  const getMaxDateString = () => {
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 1);
    return maxDate.toISOString().split("T")[0];
  };

  // Authentication check and user data loading
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        setNotification({
          message: "Authentication required. Please log in to book an appointment.",
          type: "error",
        });
        localStorage.setItem("redirectAfterLogin", "/bookappointment");
        navigate("/login", { state: { redirectTo: "/bookappointment" } });
        return;
      }

      try {
        setLoading(true);
        setUser({
          uid: currentUser.uid,
          email: currentUser.email,
          name: currentUser.displayName || "",
        });

        const userRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUser((prev) => ({ ...prev, ...userData }));
          setFormData((prev) => ({
            ...prev,
            patientName: userData.name || currentUser.displayName || "",
            patientEmail: userData.email || currentUser.email || "",
            patientPhone: userData.phone || "",
            patientAge: userData.age || "",
          }));
        } else {
          setFormData((prev) => ({
            ...prev,
            patientEmail: currentUser.email || "",
            patientName: currentUser.displayName || "",
          }));
        }
      } catch (error) {
        console.error("Error loading user data:", error);
        showNotification("Failed to load user data", "error");
        setUser({
          uid: currentUser.uid,
          email: currentUser.email,
          name: currentUser.displayName || "",
        });
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate, showNotification]);

  // Load available locations
  const loadAvailableLocations = useCallback(async () => {
    try {
      const periodsRef = collection(db, "schedules", "available-periods", "periods");
      const snapshot = await getDocs(periodsRef);

      const locations = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (!locations.find((loc) => loc.value === data.name)) {
          locations.push({
            value: data.name,
            label: data.name,
          });
        }
      });

      setAvailableLocations(locations);
    } catch (error) {
      console.error("Error loading locations:", error);
      showNotification("Failed to load locations", "error");
    }
  }, [showNotification]);

  // Generate time slots based on available periods
  const generateTimeSlots = useCallback(
    async (date, location) => {
      if (!date || !location) {
        setAvailableSlots([]);
        return;
      }

      setLoading(true);
      try {
        const periodsRef = collection(db, "schedules", "available-periods", "periods");
        const periodsSnapshot = await getDocs(periodsRef);
        if (periodsSnapshot.empty) {
          setAvailableSlots([]);
          showNotification("No schedule found. Please set up available periods first.", "error");
          return;
        }

        const selectedDateObj = new Date(date);
        const dayName = selectedDateObj.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
        const applicablePeriods = [];

        periodsSnapshot.forEach((doc) => {
          const period = doc.data();
          if (period.name !== location) return;

          const periodStartDate = new Date(period.startDate);
          if (period.isRecurring) {
            if (period.days && period.days[dayName] && selectedDateObj >= periodStartDate) {
              applicablePeriods.push(period);
            }
          } else {
            const periodEndDate = new Date(period.endDate);
            if (selectedDateObj >= periodStartDate && selectedDateObj <= periodEndDate) {
              applicablePeriods.push(period);
            }
          }
        });

        if (applicablePeriods.length === 0) {
          setAvailableSlots([]);
          showNotification(`No schedule available for ${location} on ${dayName}s`, "error");
          return;
        }

        const blockedPeriodsRef = collection(db, "schedules", "blocked-periods", "periods");
        const blockedSnapshot = await getDocs(blockedPeriodsRef);

        let isDateBlocked = false;
        let blockReason = "";
        const blockedTimeRanges = [];

        blockedSnapshot.forEach((doc) => {
          const blockedPeriod = doc.data();
          const blockStartDate = new Date(blockedPeriod.startDate);
          const blockEndDate = new Date(blockedPeriod.endDate || blockedPeriod.startDate);

          if (selectedDateObj >= blockStartDate && selectedDateObj <= blockEndDate && blockedPeriod.location === location) {
            if (blockedPeriod.type === "time-slot" && blockedPeriod.startTime && blockedPeriod.endTime) {
              blockedTimeRanges.push({
                startTime: blockedPeriod.startTime,
                endTime: blockedPeriod.endTime,
                reason: blockedPeriod.reason,
              });
            } else {
              isDateBlocked = true;
              blockReason = blockedPeriod.reason || "This date is blocked";
            }
          }
        });

        if (isDateBlocked) {
          setAvailableSlots([]);
          showNotification(blockReason, "error");
          return;
        }

        const allSlots = [];
        applicablePeriods.forEach((period) => {
          const startTime = period.startTime;
          const endTime = period.endTime;
          const appointmentDuration = period.appointmentDuration || 30;
          const bufferTime = period.bufferTime || 5;
          const [startHour, startMin] = startTime.split(":").map(Number);
          const [endHour, endMin] = endTime.split(":").map(Number);

          let currentTime = new Date();
          currentTime.setHours(startHour, startMin, 0, 0);
          const endTimeObj = new Date();
          endTimeObj.setHours(endHour, endMin, 0, 0);

          while (currentTime < endTimeObj) {
            const timeString = currentTime.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            });

            if (!allSlots.includes(timeString)) {
              allSlots.push(timeString);
            }

            currentTime.setMinutes(currentTime.getMinutes() + appointmentDuration + bufferTime);
          }
        });

        allSlots.sort((a, b) => {
          const timeA = new Date(`2000-01-01T${a}`);
          const timeB = new Date(`2000-01-01T${b}`);
          return timeA - timeB;
        });

        const slotsAfterBlockFilter = allSlots.filter((slot) => {
          const [slotHour, slotMin] = slot.split(":").map(Number);
          const slotMinutes = slotHour * 60 + slotMin;

          return !blockedTimeRanges.some((blockedRange) => {
            const [blockStartHour, blockStartMin] = blockedRange.startTime.split(":").map(Number);
            const [blockEndHour, blockEndMin] = blockedRange.endTime.split(":").map(Number);
            const blockStartMinutes = blockStartHour * 60 + blockStartMin;
            const blockEndMinutes = blockEndHour * 60 + blockEndMin;

            return slotMinutes >= blockStartMinutes && slotMinutes < blockEndMinutes;
          });
        });

        const appointmentsRef = collection(db, "appointments", "bookings", "appointments");
        const appointmentsSnapshot = await getDocs(appointmentsRef);

        const bookedSlots = [];
        appointmentsSnapshot.forEach((doc) => {
          const apt = doc.data();
          if (apt.appointmentDate === date && apt.location === location && apt.status !== "cancelled") {
            bookedSlots.push(apt.appointmentTime);
          }
        });

        const now = new Date();
        const isToday = selectedDateObj.toDateString() === now.toDateString();

        const availableSlots = slotsAfterBlockFilter.filter((slot) => {
          if (bookedSlots.includes(slot)) return false;

          if (isToday) {
            const [slotHour, slotMin] = slot.split(":").map(Number);
            const slotTime = new Date();
            slotTime.setHours(slotHour, slotMin, 0, 0);
            return slotTime > now;
          }

          return true;
        });

        setAvailableSlots(availableSlots);

        if (availableSlots.length === 0) {
          if (blockedTimeRanges.length > 0) {
            showNotification("Some time slots are blocked. No available slots remaining.", "error");
          } else {
            showNotification("No available time slots for selected date and location", "error");
          }
        } else {
          showNotification(`Found ${availableSlots.length} available slots`, "success");
        }
      } catch (error) {
        console.error("Error generating time slots:", error);
        showNotification(`Failed to load available time slots: ${error.message}`, "error");
        setAvailableSlots([]);
      } finally {
        setLoading(false);
      }
    },
    [showNotification]
  );

  const validateForm = () => {
    const newErrors = {};

    if (!formData.patientName.trim()) {
      newErrors.patientName = "Patient name is required";
    }

    if (!formData.patientPhone.trim()) {
      newErrors.patientPhone = "Phone number is required";
    } else if (!/^\+?[0-9]{10,15}$/.test(formData.patientPhone.replace(/\s/g, ""))) {
      newErrors.patientPhone = "Please enter a valid phone number";
    }

    if (formData.patientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.patientEmail)) {
      newErrors.patientEmail = "Please enter a valid email address";
    }

    if (!formData.patientAge || isNaN(formData.patientAge) || formData.patientAge < 1 || formData.patientAge > 120) {
      newErrors.patientAge = "Please enter a valid age (1-120)";
    }

    if (!formData.appointmentDate) {
      newErrors.appointmentDate = "Appointment date is required";
    }

    if (!formData.appointmentTime) {
      newErrors.appointmentTime = "Appointment time is required";
    }

    if (!formData.location) {
      newErrors.location = "Location is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showNotification("Please correct the errors in the form", "error");
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      showNotification("Please log in to book an appointment", "error");
      navigate("/login", { state: { redirectTo: "/bookappointment" } });
      return;
    }

    setSubmitting(true);
    try {
      const appointmentsRef = collection(db, "appointments", "bookings", "appointments");
      const appointmentsSnapshot = await getDocs(appointmentsRef);

      const isSlotTaken = appointmentsSnapshot.docs.some((doc) => {
        const apt = doc.data();
        return (
          apt.appointmentDate === formData.appointmentDate &&
          apt.appointmentTime === formData.appointmentTime &&
          apt.location === formData.location &&
          apt.status !== "cancelled"
        );
      });

      if (isSlotTaken) {
        showNotification("This time slot is no longer available. Please select another time.", "error");
        generateTimeSlots(formData.appointmentDate, formData.location);
        return;
      }

      const appointmentData = {
        patientName: formData.patientName || "",
        patientEmail: formData.patientEmail || "",
        patientPhone: formData.patientPhone || "",
        patientAge: parseInt(formData.patientAge) || 0,
        appointmentDate: formData.appointmentDate,
        appointmentTime: formData.appointmentTime,
        location: formData.location,
        reasonForVisit: formData.reasonForVisit || "",
        medicalHistory: formData.medicalHistory || "",
        appointmentType: formData.appointmentType || "Consultation",
        status: "pending",
        bookedBy: currentUser.uid,
        bookedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await addDoc(appointmentsRef, appointmentData);
      showNotification("Appointment booked successfully!");
      setFormData((prev) => ({
        patientName: prev.patientName,
        patientEmail: prev.patientEmail,
        patientPhone: "",
        patientAge: prev.patientAge,
        appointmentDate: "",
        appointmentTime: "",
        location: "",
        reasonForVisit: "",
        medicalHistory: "",
        appointmentType: "Consultation",
      }));
      setErrors({});
      setAvailableSlots([]);

      if (onBookingSuccess) {
        setTimeout(() => {
          onBookingSuccess();
        }, 2000);
      }
    } catch (error) {
      console.error("Error creating appointment:", error);
      showNotification(`Failed to book appointment: ${error.message}`, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleDateLocationChange = () => {
    if (formData.appointmentDate && formData.location) {
      generateTimeSlots(formData.appointmentDate, formData.location);
    } else {
      setAvailableSlots([]);
    }
    setFormData((prev) => ({ ...prev, appointmentTime: "" }));
  };

  useEffect(() => {
    loadAvailableLocations();
  }, [loadAvailableLocations]);

  useEffect(() => {
    handleDateLocationChange();
  }, [formData.appointmentDate, formData.location]);

  if (!user) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4" size={32} />
          <p style={{ color: actualTheme.text.secondary }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {notification && (
        <div
          className={`p-4 rounded-lg flex items-center transition-opacity duration-300 ${
            notification.type === "error" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-4" style={{ color: actualTheme.text.primary }}>
            <MapPin size={18} className="inline mr-2" />
            Select Location & Date
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CustomSelect
              label="Location *"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              options={[{ value: "", label: "Select location" }, ...availableLocations]}
              error={errors.location}
            />
            <CustomInput
              label="Appointment Date *"
              name="appointmentDate"
              type="date"
              value={formData.appointmentDate}
              onChange={handleInputChange}
              min={getTodayString()}
              max={getMaxDateString()}
              error={errors.appointmentDate}
            />
          </div>
        </div>

        {formData.location && formData.appointmentDate && (
          <div>
            <h3 className="text-lg font-medium mb-4" style={{ color: actualTheme.text.primary }}>
              <Clock size={18} className="inline mr-2" />
              Select Time Slot
            </h3>
            {loading ? (
              <div className="flex justify-center py-4">
                <Loader className="animate-spin" size={24} />
                <span className="ml-2" style={{ color: actualTheme.text.secondary }}>
                  Loading available slots...
                </span>
              </div>
            ) : availableSlots.length > 0 ? (
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3">
                {availableSlots.map((slot) => {
                  const displayTime = new Date(`2000-01-01T${slot}`).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  });
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, appointmentTime: slot }))}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        formData.appointmentTime === slot
                          ? "border-blue-500 bg-blue-50 text-blue-700 font-medium"
                          : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                      }`}
                      style={{
                        backgroundColor: formData.appointmentTime === slot ? undefined : actualTheme.surface,
                        color: formData.appointmentTime === slot ? undefined : actualTheme.text.primary,
                        borderColor: formData.appointmentTime === slot ? "#3b82f6" : actualTheme.border,
                      }}
                    >
                      {displayTime}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: actualTheme.text.secondary }} className="text-center py-4">
                No available slots for selected date and location.
              </p>
            )}
            {errors.appointmentTime && (
              <p className="text-red-500 text-sm mt-2">{errors.appointmentTime}</p>
            )}
          </div>
        )}

        {formData.appointmentTime && (
          <div>
            <h3 className="text-lg font-medium mb-4" style={{ color: actualTheme.text.primary }}>
              <User size={18} className="inline mr-2" />
              Patient Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <CustomInput
                label="Full Name *"
                name="patientName"
                value={formData.patientName}
                onChange={handleInputChange}
                placeholder="Enter full name"
                error={errors.patientName}
              />
              <CustomInput
                label="Age *"
                name="patientAge"
                type="number"
                value={formData.patientAge}
                onChange={handleInputChange}
                placeholder="Enter age"
                min="1"
                max="120"
                error={errors.patientAge}
              />
              <CustomInput
                label="Phone Number *"
                name="patientPhone"
                value={formData.patientPhone}
                onChange={handleInputChange}
                placeholder="Enter phone number"
                error={errors.patientPhone}
              />
              <CustomInput
                label="Email Address"
                name="patientEmail"
                type="email"
                value={formData.patientEmail}
                onChange={handleInputChange}
                placeholder="Enter email address"
                error={errors.patientEmail}
              />
              <CustomSelect
                label="Appointment Type"
                name="appointmentType"
                value={formData.appointmentType}
                onChange={handleInputChange}
                options={[
                  { value: "Consultation", label: "Consultation" },
                  { value: "Follow-up", label: "Follow-up" },
                  { value: "Emergency", label: "Emergency" },
                  { value: "Routine Check-up", label: "Routine Check-up" },
                ]}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CustomInput
                label="Reason for Visit"
                name="reasonForVisit"
                value={formData.reasonForVisit}
                onChange={handleInputChange}
                placeholder="Brief description of your visit"
                type="textarea"
                rows="3"
              />
              <CustomInput
                label="Medical History"
                name="medicalHistory"
                value={formData.medicalHistory}
                onChange={handleInputChange}
                placeholder="Any relevant medical history"
                type="textarea"
                rows="3"
              />
            </div>
          </div>
        )}

        {formData.appointmentTime && (
          <div className="flex justify-center">
            <CustomButton type="submit" disabled={submitting || loading}>
              {submitting ? (
                <>
                  <Loader className="animate-spin mr-2" size={18} />
                  Booking...
                </>
              ) : (
                "Book Appointment"
              )}
            </CustomButton>
          </div>
        )}
      </form>
    </div>
  );
}

export default BookingForm;