import React, { useState, useEffect, useCallback } from "react";
import { useTheme } from "../../../context/ThemeContext";
import { db } from "../../../firebase/config";
import { collection, getDocs, addDoc } from "firebase/firestore";
import CustomInput from "../../../components/CustomInput";
import CustomButton from "../../../components/CustomButton";
import CustomSelect from "../../../components/CustomSelect";
import {
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  Plus,
  CheckCircle,
  AlertTriangle,
  Loader,
} from "lucide-react";

const AddAppointment = () => {
  const { currentTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [availableLocations, setAvailableLocations] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [notification, setNotification] = useState(null);

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

  // Load available locations from the schedules
  const loadAvailableLocations = useCallback(async () => {
    try {
      const periodsRef = collection(
        db,
        "schedules",
        "available-periods",
        "periods"
      );
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
        // Get available periods for the location
        const periodsRef = collection(
          db,
          "schedules",
          "available-periods",
          "periods"
        );
        const periodsSnapshot = await getDocs(periodsRef);
        if (periodsSnapshot.empty) {
          setAvailableSlots([]);
          showNotification(
            "No schedule found. Please set up available periods first.",
            "error"
          );
          return;
        }

        const selectedDateObj = new Date(date);
        const dayName = selectedDateObj
          .toLocaleDateString("en-US", { weekday: "long" })
          .toLowerCase();
        // Find ALL applicable periods for the location and date
        const applicablePeriods = [];

        periodsSnapshot.forEach((doc) => {
          const period = doc.data();
          // Check if location matches
          if (period.name !== location) {
            return;
          }

          const periodStartDate = new Date(period.startDate);

          if (period.isRecurring) {
            // Check if the day is available in recurring schedule
            if (
              period.days &&
              period.days[dayName] &&
              selectedDateObj >= periodStartDate
            ) {
              applicablePeriods.push(period);
            }
          } else {
            // Check if date falls within non-recurring period
            const periodEndDate = new Date(period.endDate);
            if (
              selectedDateObj >= periodStartDate &&
              selectedDateObj <= periodEndDate
            ) {
              applicablePeriods.push(period);
            }
          }
        });

        if (applicablePeriods.length === 0) {
          setAvailableSlots([]);
          showNotification(
            `No schedule available for ${location} on ${dayName}s`,
            "error"
          );
          return;
        }
        // Check for blocked periods FIRST
        const blockedPeriodsRef = collection(
          db,
          "schedules",
          "blocked-periods",
          "periods"
        );
        const blockedSnapshot = await getDocs(blockedPeriodsRef);

        let isDateBlocked = false;
        let blockReason = "";
        const blockedTimeRanges = [];

        blockedSnapshot.forEach((doc) => {
          const blockedPeriod = doc.data();
          const blockStartDate = new Date(blockedPeriod.startDate);
          const blockEndDate = new Date(
            blockedPeriod.endDate || blockedPeriod.startDate
          );

          // Check if the selected date falls within blocked period
          if (
            selectedDateObj >= blockStartDate &&
            selectedDateObj <= blockEndDate
          ) {
            // Check if location matches
            if (blockedPeriod.location === location) {
              if (
                blockedPeriod.type === "time-slot" &&
                blockedPeriod.startTime &&
                blockedPeriod.endTime
              ) {
                // Specific time slot blocked
                blockedTimeRanges.push({
                  startTime: blockedPeriod.startTime,
                  endTime: blockedPeriod.endTime,
                  reason: blockedPeriod.reason,
                });
              } else {
                // Entire day blocked
                isDateBlocked = true;
                blockReason = blockedPeriod.reason || "This date is blocked";
              }
            }
          }
        });

        if (isDateBlocked) {
          setAvailableSlots([]);
          showNotification(blockReason, "error");
          return;
        }

        // Generate time slots from ALL applicable periods
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

            // Check if this time slot is not already in allSlots (avoid duplicates)
            if (!allSlots.includes(timeString)) {
              allSlots.push(timeString);
            }

            currentTime.setMinutes(
              currentTime.getMinutes() + appointmentDuration + bufferTime
            );
          }
        });

        // Sort slots chronologically
        allSlots.sort((a, b) => {
          const timeA = new Date(`2000-01-01T${a}`);
          const timeB = new Date(`2000-01-01T${b}`);
          return timeA - timeB;
        });
        // Filter out blocked time slots
        const slotsAfterBlockFilter = allSlots.filter((slot) => {
          const [slotHour, slotMin] = slot.split(":").map(Number);
          const slotMinutes = slotHour * 60 + slotMin;

          // Check if slot falls within any blocked time range
          return !blockedTimeRanges.some((blockedRange) => {
            const [blockStartHour, blockStartMin] = blockedRange.startTime
              .split(":")
              .map(Number);
            const [blockEndHour, blockEndMin] = blockedRange.endTime
              .split(":")
              .map(Number);
            const blockStartMinutes = blockStartHour * 60 + blockStartMin;
            const blockEndMinutes = blockEndHour * 60 + blockEndMin;

            return (
              slotMinutes >= blockStartMinutes && slotMinutes < blockEndMinutes
            );
          });
        });

        // Check for existing appointments
        const appointmentsRef = collection(
          db,
          "appointments",
          "bookings",
          "appointments"
        );
        const appointmentsSnapshot = await getDocs(appointmentsRef);

        const bookedSlots = [];
        appointmentsSnapshot.forEach((doc) => {
          const apt = doc.data();
          if (
            apt.appointmentDate === date &&
            apt.location === location &&
            apt.status !== "Cancelled"
          ) {
            bookedSlots.push(apt.appointmentTime);
          }
        });
        // Filter out booked slots and past times for today
        const now = new Date();
        const isToday = selectedDateObj.toDateString() === now.toDateString();

        const availableSlots = slotsAfterBlockFilter.filter((slot) => {
          // Check if slot is booked
          if (bookedSlots.includes(slot)) {
            return false;
          }

          // If it's today, check if slot is in the future
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
            showNotification(
              "Some time slots are blocked. No available slots remaining.",
              "error"
            );
          } else {
            showNotification(
              "No available time slots for selected date and location",
              "error"
            );
          }
        } else {
          showNotification(
            `Found ${availableSlots.length} available slots`,
            "success"
          );
        }
      } catch (error) {
        console.error("Error generating time slots:", error);
        showNotification(
          `Failed to load available time slots: ${error.message}`,
          "error"
        );
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
    } else if (
      !/^\+?[0-9]{10,15}$/.test(formData.patientPhone.replace(/\s/g, ""))
    ) {
      newErrors.patientPhone = "Please enter a valid phone number";
    }

    if (
      formData.patientEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.patientEmail)
    ) {
      newErrors.patientEmail = "Please enter a valid email address";
    }

    if (
      !formData.patientAge ||
      isNaN(formData.patientAge) ||
      formData.patientAge < 1 ||
      formData.patientAge > 120
    ) {
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

    setSubmitting(true);
    try {
      // Double-check slot availability
      const appointmentsRef = collection(
        db,
        "appointments",
        "bookings",
        "appointments"
      );
      const appointmentsSnapshot = await getDocs(appointmentsRef);

      const isSlotTaken = appointmentsSnapshot.docs.some((doc) => {
        const apt = doc.data();
        return (
          apt.appointmentDate === formData.appointmentDate &&
          apt.appointmentTime === formData.appointmentTime &&
          apt.location === formData.location &&
          apt.status !== "Cancelled"
        );
      });

      if (isSlotTaken) {
        showNotification(
          "This time slot is no longer available. Please select another time.",
          "error"
        );
        generateTimeSlots(formData.appointmentDate, formData.location);
        return;
      }

      // Create appointment
      const docRef = await addDoc(appointmentsRef, {
        ...formData,
        status: "Pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      showNotification("Appointment created successfully!");

      // Reset form
      setFormData({
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
      setErrors({});
      setAvailableSlots([]);
    } catch (error) {
      console.error("Error creating appointment:", error);
      showNotification(
        `Failed to create appointment: ${error.message}`,
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
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

    // Clear selected time when date or location changes
    setFormData((prev) => ({ ...prev, appointmentTime: "" }));
  };

  useEffect(() => {
    loadAvailableLocations();
  }, [loadAvailableLocations]);

  useEffect(() => {
    handleDateLocationChange();
  }, [formData.appointmentDate, formData.location]);

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
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

      {/* Form */}
      <>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Information */}
          <div>
            <h3
              className="text-lg font-medium mb-4"
              style={{ color: currentTheme.text.primary }}
            >
              <User size={18} className="inline mr-2" />
              Patient Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CustomInput
                label="Patient Name *"
                name="patientName"
                value={formData.patientName}
                onChange={handleInputChange}
                placeholder="Enter patient's full name"
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
                placeholder="Enter email address (optional)"
                error={errors.patientEmail}
              />
            </div>
          </div>

          {/* Appointment Details */}
          <div>
            <h3
              className="text-lg font-medium mb-4"
              style={{ color: currentTheme.text.primary }}
            >
              <Calendar size={18} className="inline mr-2" />
              Appointment Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <CustomSelect
                label="Appointment Time *"
                name="appointmentTime"
                value={formData.appointmentTime}
                onChange={handleInputChange}
                options={[
                  {
                    value: "",
                    label: loading ? "Loading slots..." : "Select time slot",
                  },
                  ...availableSlots.map((slot) => ({
                    value: slot,
                    label: new Date(`2000-01-01T${slot}`).toLocaleTimeString(
                      "en-US",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      }
                    ),
                  })),
                ]}
                error={errors.appointmentTime}
                disabled={
                  !formData.appointmentDate || !formData.location || loading
                }
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
          </div>

          {/* Additional Information */}
          <div>
            <h3
              className="text-lg font-medium mb-4"
              style={{ color: currentTheme.text.primary }}
            >
              <FileText size={18} className="inline mr-2" />
              Additional Information
            </h3>
            <div className="space-y-4">
              <CustomInput
                label="Reason for Visit"
                name="reasonForVisit"
                value={formData.reasonForVisit}
                onChange={handleInputChange}
                placeholder="Brief description of the reason for visit"
                type="textarea"
                rows="3"
              />

              <CustomInput
                label="Medical History"
                name="medicalHistory"
                value={formData.medicalHistory}
                onChange={handleInputChange}
                placeholder="Any relevant medical history or current medications"
                type="textarea"
                rows="3"
              />
            </div>
          </div>

          {/* Loading indicator for time slots */}
          {loading && (
            <div className="flex items-center justify-center py-4">
              <Loader className="animate-spin mr-2" size={20} />
              <span style={{ color: currentTheme.text.secondary }}>
                Loading available time slots...
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div
            className="flex justify-end gap-4 pt-4 border-t"
            style={{ borderColor: currentTheme.border }}
          >
            <CustomButton
              type="button"
              variant="outlined"
              onClick={() => {
                setFormData({
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
                setErrors({});
                setAvailableSlots([]);
              }}
              disabled={submitting}
            >
              Reset Form
            </CustomButton>

            <CustomButton
              type="submit"
              disabled={submitting || loading}
              icon={submitting ? Loader : Plus}
              className={submitting ? "animate-pulse" : ""}
            >
              {submitting ? "Creating..." : "Create Appointment"}
            </CustomButton>
          </div>
        </form>
      </>
    </div>
  );
};

export default AddAppointment;
