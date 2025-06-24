import React, { useState, useEffect } from "react";
import CustomInput from "../../../components/CustomInput";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useTheme } from "../../../context/ThemeContext";
import { db } from "../../../firebase/config";
import { doc, setDoc, collection, query, where, getDocs } from "firebase/firestore";

const generatePid = async () => {
  const year = new Date().getFullYear(); // Get current year (e.g., 2025)
  let randomNum;
  let pid;
  let isUnique = false;

  // Keep generating until a unique PID is found
  while (!isUnique) {
    randomNum = Math.floor(10000 + Math.random() * 90000); // 5-digit random number
    pid = `PID${year}-${randomNum}`; // e.g., PID2025-12345
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("pid", "==", pid));
      const querySnapshot = await getDocs(q);
      isUnique = querySnapshot.empty;
    } catch (error) {
      console.error("Error checking PID uniqueness:", error.message);
      return null; // Return null if Firebase query fails
    }
  }
  return pid;
};

const OtherPatientForm = ({ otherPatientData, setOtherPatientData, otherPatientErrors, setOtherPatientErrors, handleOtherPatientSubmit, handleCancel, isLoading }) => {
  const { currentTheme } = useTheme();
  const [phoneCheckTimeout, setPhoneCheckTimeout] = useState(null);

  // Initialize PID on mount
  useEffect(() => {
    if (!otherPatientData.pid) {
      generatePid().then((newPid) => {
        if (newPid) {
          setOtherPatientData((prev) => ({ ...prev, pid: newPid }));
        } else {
          setOtherPatientErrors((prev) => ({ ...prev, pid: "Failed to generate Patient ID" }));
        }
      });
    }
    // Cleanup timeout on unmount
    return () => {
      if (phoneCheckTimeout) clearTimeout(phoneCheckTimeout);
    };
  }, [otherPatientData.pid, setOtherPatientData, setOtherPatientErrors]);

  const checkPhoneExists = async (phone) => {
    if (!phone || !/^\+?[0-9]{10,12}$/.test(phone)) return false;
    try {
      console.log(`Checking if phone ${phone} exists...`);
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("phone", "==", phone));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error("Error checking phone number:", error.message);
      return false;
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "name" && value.length > 25) return;
    setOtherPatientData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (name === "name") {
      if (!value) {
        setOtherPatientErrors((prev) => ({ ...prev, name: "Name is required" }));
      } else if (value.length < 3 || value.length > 25) {
        setOtherPatientErrors((prev) => ({ ...prev, name: "Name must be between 3 and 25 characters" }));
      } else if (!/^[A-Za-z\s'.\-]+$/.test(value)) {
        setOtherPatientErrors((prev) => ({ ...prev, name: "Only letters, spaces, and basic punctuation are allowed" }));
      } else {
        setOtherPatientErrors((prev) => ({ ...prev, name: "" }));
      }
    }
    if (name === "email") {
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
        setOtherPatientErrors((prev) => ({ ...prev, email: "Please enter a valid email address" }));
      } else {
        setOtherPatientErrors((prev) => ({ ...prev, email: "" }));
      }
    }
  };

  const handlePhoneInput = (e) => {
    const value = e.target.value.replace(/[^0-9+]/g, '');
    if (value.length <= 12) {
      setOtherPatientData((prev) => ({ ...prev, phone: value }));
      if (!value) {
        setOtherPatientErrors((prev) => ({ ...prev, phone: "Phone is required" }));
      } else if (!/^\+?[0-9]{10,12}$/.test(value)) {
        setOtherPatientErrors((prev) => ({ ...prev, phone: "Please enter a valid phone number (10-12 digits)" }));
      } else {
        if (phoneCheckTimeout) clearTimeout(phoneCheckTimeout);
        const timeout = setTimeout(async () => {
          const exists = await checkPhoneExists(value);
          if (exists) {
            setOtherPatientErrors((prev) => ({ ...prev, phone: "Phone number already exists. Please use a different number." }));
          } else {
            setOtherPatientErrors((prev) => ({ ...prev, phone: "" }));
          }
        }, 500);
        setPhoneCheckTimeout(timeout);
      }
    }
  };

  const handleDobChange = (date) => {
    const formattedDate = date ? date.toISOString().split('T')[0] : "";
    setOtherPatientData((prev) => ({ ...prev, dob: formattedDate }));
    if (!formattedDate) {
      setOtherPatientErrors((prev) => ({ ...prev, dob: "Date of Birth is required" }));
    } else {
      const dobDate = new Date(formattedDate);
      const today = new Date();
      if (isNaN(dobDate.getTime())) {
        setOtherPatientErrors((prev) => ({ ...prev, dob: "Please enter a valid date" }));
      } else if (dobDate >= today) {
        setOtherPatientErrors((prev) => ({ ...prev, dob: "Date of Birth cannot be in the future" }));
      } else {
        setOtherPatientErrors((prev) => ({ ...prev, dob: "" }));
      }
    }
  };

  const sendWhatsAppNotification = async (phone, templateName, params) => {
    try {
      console.log(`Sending WhatsApp to ${phone} with template ${templateName}`);
      const response = await fetch('http://localhost:3000/send-whatsapp', { // Replace with your backend URL in production
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone,
          templateName,
          params,
        }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to send WhatsApp message: ${response.status} - ${errorText}`);
      }
      console.log(`WhatsApp sent successfully to ${phone}`);
    } catch (error) {
      console.error('Error sending WhatsApp notification:', error);
      // Fallback: Open WhatsApp Click-to-Chat
      const message = templateName === 'patient_registration_confirmation'
        ? `Dear ${params[0].value}, your registration (PID: ${params[1].value}) is complete. We will contact you soon.`
        : `New patient registered: ${params[0].value}, PID: ${params[1].value}, Email: ${params[2].value}, Phone: ${params[3].value}, DOB: ${params[4].value}.`;
      window.open(`https://wa.me/${phone.replace('+', '')}?text=${encodeURIComponent(message)}`, '_blank');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form submitted:', otherPatientData);

    // Validate all fields
    const newErrors = {
      pid: !otherPatientData.pid ? "Patient ID is required" : "",
      name: !otherPatientData.name
        ? "Name is required"
        : otherPatientData.name.length < 3 || otherPatientData.name.length > 25
        ? "Name must be between 3 and 25 characters"
        : !/^[A-Za-z\s'.\-]+$/.test(otherPatientData.name)
        ? "Only letters, spaces, and basic punctuation are allowed"
        : "",
      email: otherPatientData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(otherPatientData.email.trim())
        ? "Please enter a valid email address"
        : "",
      phone: !otherPatientData.phone
        ? "Phone is required"
        : !/^\+?[0-9]{10,12}$/.test(otherPatientData.phone)
        ? "Please enter a valid phone number (10-12 digits)"
        : "",
      dob: !otherPatientData.dob
        ? "Date of Birth is required"
        : new Date(otherPatientData.dob) >= new Date()
        ? "Date of Birth cannot be in the future"
        : isNaN(new Date(otherPatientData.dob).getTime())
        ? "Please enter a valid date"
        : "",
      submit: "",
    };

    setOtherPatientErrors(newErrors);

    if (Object.values(newErrors).some(error => error)) {
      console.log('Validation errors:', newErrors);
      setOtherPatientErrors((prev) => ({ ...prev, submit: "Please correct the errors in the form before submitting." }));
      return;
    }

    try {
      console.log('Checking phone number...');
      const phoneExists = await checkPhoneExists(otherPatientData.phone);
      if (phoneExists) {
        setOtherPatientErrors((prev) => ({ ...prev, phone: "Phone number already exists. Please use a different number.", submit: "Phone number already exists." }));
        console.log('Phone number exists');
        return;
      }

      console.log('Saving to Firestore...');
      const userDocRef = doc(db, "users", otherPatientData.pid);
      await setDoc(userDocRef, {
        pid: otherPatientData.pid,
        name: otherPatientData.name,
        email: otherPatientData.email || "",
        phone: otherPatientData.phone,
        dob: otherPatientData.dob,
        createdAt: new Date().toISOString(),
      });
      console.log('Firestore save successful');

      // Send WhatsApp notifications
      console.log('Sending WhatsApp to patient...');
      await sendWhatsAppNotification(
        otherPatientData.phone,
        'patient_registration_confirmation',
        [
          { name: 'name', value: otherPatientData.name },
          { name: 'pid', value: otherPatientData.pid },
        ]
      );
      console.log('WhatsApp to patient sent');

      console.log('Sending WhatsApp to doctor...');
      await sendWhatsAppNotification(
        '+918688423659',
        'new_patient_notification',
        [
          { name: 'name', value: otherPatientData.name },
          { name: 'pid', value: otherPatientData.pid },
          { name: 'email', value: otherPatientData.email || 'N/A' },
          { name: 'phone', value: otherPatientData.phone },
          { name: 'dob', value: otherPatientData.dob },
        ]
      );
      console.log('WhatsApp to doctor sent');

      handleOtherPatientSubmit();
    } catch (error) {
      console.error("Error creating patient data:", error.message);
      setOtherPatientErrors((prev) => ({ ...prev, submit: `Failed to save patient data: ${error.message}` }));
    }
  };

  return (
    <div className="space-y-6 mt-8">
      {otherPatientErrors.submit && (
        <div className="p-3 rounded-lg bg-red-100 text-red-800 text-sm">
          {otherPatientErrors.submit}
        </div>
      )}
      <div className="p-6 rounded-lg shadow-md border" style={{ backgroundColor: currentTheme.surface, borderColor: currentTheme.border }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: currentTheme.text.primary }}>Patient Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="flex flex-row items-center gap-2">
            <label className="text-sm font-medium whitespace-nowrap" style={{ color: currentTheme.text.primary }}>
              Patient ID<span className="text-red-500 ml-1">*</span>
            </label>
            <div className="flex-1">
              <CustomInput
                name="pid"
                value={otherPatientData.pid || ""}
                readOnly
                className="w-full p-2 rounded-md border"
                style={{
                  borderColor: otherPatientErrors.pid ? "rgb(239, 68, 68)" : currentTheme.border,
                  backgroundColor: currentTheme.inputBackground,
                  color: currentTheme.text.primary
                }}
              />
              {otherPatientErrors.pid && <p className="text-red-500 text-xs mt-1">{otherPatientErrors.pid}</p>}
            </div>
          </div>
          <div className="flex flex-row items-center gap-2">
            <label className="text-sm font-medium whitespace-nowrap" style={{ color: currentTheme.text.primary }}>
              Name<span className="text-red-500 ml-1">*</span>
            </label>
            <div className="flex-1">
              <CustomInput
                name="name"
                value={otherPatientData.name}
                onChange={handleInputChange}
                required
                maxLength={25}
                className="w-full p-2 rounded-md border"
                style={{
                  borderColor: otherPatientErrors.name ? "rgb(239, 68, 68)" : currentTheme.border,
                  backgroundColor: currentTheme.inputBackground,
                  color: currentTheme.text.primary
                }}
                placeholder="Enter patient name"
              />
              {otherPatientErrors.name && <p className="text-red-500 text-xs mt-1">{otherPatientErrors.name}</p>}
            </div>
          </div>
          <div className="flex flex-row items-center gap-2">
            <label className="text-sm font-medium whitespace-nowrap" style={{ color: currentTheme.text.primary }}>
              Email
            </label>
            <div className="flex-1">
              <CustomInput
                type="email"
                name="email"
                value={otherPatientData.email}
                onChange={handleInputChange}
                className="w-full p-2 rounded-md border"
                style={{
                  borderColor: otherPatientErrors.email ? "rgb(239, 68, 68)" : currentTheme.border,
                  backgroundColor: currentTheme.inputBackground,
                  color: currentTheme.text.primary
                }}
                placeholder="Enter email (optional)"
              />
              {otherPatientErrors.email && <p className="text-red-500 text-xs mt-1">{otherPatientErrors.email}</p>}
            </div>
          </div>
          <div className="flex flex-row items-center gap-2">
            <label className="text-sm font-medium whitespace-nowrap" style={{ color: currentTheme.text.primary }}>
              Phone<span className="text-red-500 ml-1">*</span>
            </label>
            <div className="flex-1">
              <CustomInput
                type="tel"
                name="phone"
                value={otherPatientData.phone}
                onChange={handlePhoneInput}
                required
                className="w-full p-2 rounded-md border"
                style={{
                  borderColor: otherPatientErrors.phone ? "rgb(239, 68, 68)" : currentTheme.border,
                  backgroundColor: currentTheme.inputBackground,
                  color: currentTheme.text.primary
                }}
                placeholder="Enter phone number"
              />
              {otherPatientErrors.phone && <p className="text-red-500 text-xs mt-1">{otherPatientErrors.phone}</p>}
            </div>
          </div>
          <div className="flex flex-row items-center gap-2">
            <label className="text-sm font-medium whitespace-nowrap" style={{ color: currentTheme.text.primary }}>
              Date of Birth<span className="text-red-500 ml-1">*</span>
            </label>
            <div className="flex-1">
              <DatePicker
                selected={otherPatientData.dob ? new Date(otherPatientData.dob) : null}
                onChange={handleDobChange}
                maxDate={new Date()}
                showYearDropdown
                showMonthDropdown
                dropdownMode="select"
                placeholderText="Select Date of Birth"
                className="w-full p-2 rounded-md border"
                style={{
                  borderColor: otherPatientErrors.dob ? "rgb(239, 68, 68)" : currentTheme.border,
                  backgroundColor: currentTheme.inputBackground,
                  color: currentTheme.text.primary
                }}
                required
                dateFormat="dd-MM-yyyy"
                onKeyDown={(e) => e.preventDefault()}
              />
              {otherPatientErrors.dob && <p className="text-red-500 text-xs mt-1">{otherPatientErrors.dob}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-4">
        <button
          type="submit"
          className="w-max py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
          disabled={isLoading}
          onClick={handleSubmit}
        >
          {isLoading ? "Processing..." : "Submit Patient Details"}
        </button>
        <button
          type="button"
          className="w-max py-2 px-4 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
          onClick={handleCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default OtherPatientForm;