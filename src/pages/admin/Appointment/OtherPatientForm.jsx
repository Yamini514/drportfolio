import React, { useState, useEffect } from "react";
import CustomInput from "../../../components/CustomInput";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useTheme } from "../../../context/ThemeContext";
import { v4 as uuidv4 } from "uuid";
import { db } from "../../../firebase/config";
import { doc, setDoc } from "firebase/firestore";

const OtherPatientForm = ({ otherPatientData, setOtherPatientData, otherPatientErrors, setOtherPatientErrors, setFormData, handleOtherPatientSubmit, handleCancel, isLoading }) => {
  const { currentTheme } = useTheme();

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
    if (value.length <= 11) {
      setOtherPatientData((prev) => ({ ...prev, phone: value }));
      if (!value) {
        setOtherPatientErrors((prev) => ({ ...prev, phone: "Phone is required" }));
      } else if (!/^\+?[0-9]{10,11}$/.test(value)) {
        setOtherPatientErrors((prev) => ({ ...prev, phone: "Please enter a valid phone number" }));
      } else {
        setOtherPatientErrors((prev) => ({ ...prev, phone: "" }));
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!otherPatientData.name || !otherPatientData.phone || !otherPatientData.dob || Object.values(otherPatientErrors).some(error => error !== "")) {
      return;
    }
    try {
      setIsLoading(true);
      const newPid = uuidv4();
      const userDocRef = doc(db, "users", newPid);
      await setDoc(userDocRef, {
        pid: newPid,
        name: otherPatientData.name,
        email: otherPatientData.email || "",
        phone: otherPatientData.phone,
        dob: otherPatientData.dob,
        createdAt: new Date().toISOString(),
      });
      setFormData((prev) => ({
        ...prev,
        pid: newPid,
        name: otherPatientData.name,
        email: otherPatientData.email,
        phone: otherPatientData.phone,
        dob: otherPatientData.dob,
      }));
      handleOtherPatientSubmit();
    } catch (error) {
      console.error("Error creating patient data:", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 mt-8">
      <div className="p-6 rounded-lg shadow-md border" style={{ backgroundColor: currentTheme.surface, borderColor: currentTheme.border }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: currentTheme.text.primary }}>Patient Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                style={{ borderColor: otherPatientErrors.name ? "rgb(239, 68, 68)" : currentTheme.border, backgroundColor: currentTheme.inputBackground, color: currentTheme.text.primary }}
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
                style={{ borderColor: otherPatientErrors.email ? "rgb(239, 68, 68)" : currentTheme.border, backgroundColor: currentTheme.inputBackground, color: currentTheme.text.primary }}
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
                style={{ borderColor: otherPatientErrors.phone ? "rgb(239, 68, 68)" : currentTheme.border, backgroundColor: currentTheme.inputBackground, color: currentTheme.text.primary }}
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
                style={{ borderColor: otherPatientErrors.dob ? "rgb(239, 68, 68)" : currentTheme.border, backgroundColor: currentTheme.inputBackground, color: currentTheme.text.primary }}
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