import React, { useEffect } from 'react';
import CustomInput from '../../../components/CustomInput';
import CustomSelect from '../../../components/CustomSelect';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useTheme } from '../../../context/ThemeContext';

const SelfBookingForm = ({
  formData = {
    name: '',
    email: '',
    pid: '',
    phone: '',
    dob: '',
    age: '',
    reasonForVisit: '',
    appointmentType: 'Consultation',
    medicalHistory: null,
    medicalHistoryMessage: '',
  },
  setFormData,
  errors = {},
  setErrors,
  handleSubmit,
  handleCancel,
  isLoading = false,
}) => {
  const { currentTheme } = useTheme() || {
    currentTheme: {
      surface: '#fff',
      border: '#ccc',
      inputBackground: '#f9f9f9',
      text: { primary: '#000' },
    },
  };

  // Event Handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'reasonForVisit' ? value.trimStart() : value,
    }));

    if (name === 'name') {
      if (!value) {
        setErrors((prev) => ({ ...prev, name: 'Name is required' }));
      } else if (value.length < 3 || value.length > 25) {
        setErrors((prev) => ({ ...prev, name: 'Name must be between 3 and 25 characters' }));
      } else {
        setErrors((prev) => ({ ...prev, name: '' }));
      }
    }

    if (name === 'email') {
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
        setErrors((prev) => ({ ...prev, email: 'Please enter a valid email address' }));
      } else {
        setErrors((prev) => ({ ...prev, email: '' }));
      }
    }

    if (name === 'medicalHistoryMessage') {
      if (value.length > 200) {
        setErrors((prev) => ({
          ...prev,
          medicalHistoryMessage: 'Summary must be 200 characters or less',
        }));
      } else {
        setErrors((prev) => ({ ...prev, medicalHistoryMessage: '' }));
      }
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      if (!validTypes.includes(file.type)) {
        setErrors((prev) => ({
          ...prev,
          medicalHistory: 'Please upload a PDF or DOC/DOCX file',
        }));
        setFormData((prev) => ({ ...prev, medicalHistory: null }));
      } else if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, medicalHistory: 'File size must be less than 5MB' }));
        setFormData((prev) => ({ ...prev, medicalHistory: null }));
      } else {
        setFormData((prev) => ({ ...prev, medicalHistory: file }));
        setErrors((prev) => ({ ...prev, medicalHistory: '' }));
      }
    } else {
      setErrors((prev) => ({ ...prev, medicalHistory: '' }));
      setFormData((prev) => ({ ...prev, medicalHistory: null }));
    }
  };

  const handleDobChange = (date) => {
    const formattedDate = date ? date.toISOString().split('T')[0] : '';
    setFormData((prev) => ({ ...prev, dob: formattedDate }));
    if (!formattedDate) {
      setErrors((prev) => ({ ...prev, dob: 'Date of Birth is required' }));
    } else {
      const dobDate = new Date(formattedDate);
      const today = new Date();
      if (isNaN(dobDate.getTime())) {
        setErrors((prev) => ({ ...prev, dob: 'Please enter a valid date' }));
      } else if (dobDate >= today) {
        setErrors((prev) => ({ ...prev, dob: 'Date of Birth cannot be in the future' }));
      } else {
        setErrors((prev) => ({ ...prev, dob: '' }));
      }
    }
  };

  // Effects
  useEffect(() => {
    if (formData.dob) {
      const birthDate = new Date(formData.dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      setFormData((prev) => ({ ...prev, age: age >= 0 ? age : '' }));
    } else {
      setFormData((prev) => ({ ...prev, age: '' }));
    }
  }, [formData.dob, setFormData]);

  // Render
  return (
    <div className="space-y-6 mt-8">
      <div
        className="p-6 rounded-lg shadow-md border"
        style={{ backgroundColor: currentTheme.surface, borderColor: currentTheme.border }}
      >
        <h3 className="text-lg font-semibold mb-4" style={{ color: currentTheme.text.primary }}>
          Personal Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="flex flex-row items-center gap-2">
            <label
              className="text-sm font-medium whitespace-nowrap"
              style={{ color: currentTheme.text.primary }}
            >
              Name<span className="text-red-500 ml-1">*</span>
            </label>
            <div className="flex-1">
              <CustomInput
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                maxLength={25}
                className="w-full p-2 rounded-md border"
                style={{
                  borderColor: errors.name ? 'rgb(239, 68, 68)' : currentTheme.border,
                  backgroundColor: currentTheme.inputBackground,
                  color: currentTheme.text.primary,
                }}
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
          </div>
          <div className="flex flex-row items-center gap-2">
            <label
              className="text-sm font-medium whitespace-nowrap"
              style={{ color: currentTheme.text.primary }}
            >
              Email
            </label>
            <div className="flex-1">
              <CustomInput
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full p-2 rounded-md border"
                style={{
                  borderColor: errors.email ? 'rgb(239, 68, 68)' : currentTheme.border,
                  backgroundColor: currentTheme.inputBackground,
                  color: currentTheme.text.primary,
                }}
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
          </div>
          <div className="flex flex-row items-center gap-2">
            <label
              className="text-sm font-medium whitespace-nowrap"
              style={{ color: currentTheme.text.primary }}
            >
              PID<span className="text-red-500 ml-1">*</span>
            </label>
            <div className="flex-1">
              <CustomInput
                name="pid"
                value={formData.pid} // Use value instead of defaultValue for controlled input
                readOnly
                className="w-full p-2 rounded-md border"
                style={{
                  borderColor: errors.pid ? 'rgb(239, 68, 68)' : currentTheme.border,
                  backgroundColor: currentTheme.inputBackground,
                  color: currentTheme.text.primary,
                }}
              />
              {errors.pid && <p className="text-red-500 text-xs mt-1">{errors.pid}</p>}
            </div>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-6 mt-6">
          <div className="flex flex-row items-center gap-2">
            <label
              className="text-sm font-medium whitespace-nowrap"
              style={{ color: currentTheme.text.primary }}
            >
              Phone<span className="text-red-500 ml-1">*</span>
            </label>
            <div className="flex-1">
              <CustomInput
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9+]/g, '');
                  if (value.length <= 12) {
                    setFormData((prev) => ({ ...prev, phone: value }));
                  }
                  if (!value) {
                    setErrors((prev) => ({ ...prev, phone: 'Phone is required' }));
                  } else if (!/^\+?[0-9]{10,12}$/.test(value)) {
                    setErrors((prev) => ({
                      ...prev,
                      phone: 'Please enter a valid phone number (10-12 digits)',
                    }));
                  } else {
                    setErrors((prev) => ({ ...prev, phone: '' }));
                  }
                }}
                required
                className="w-full p-2 rounded-md border"
                style={{
                  borderColor: errors.phone ? 'rgb(239, 68, 68)' : currentTheme.border,
                  backgroundColor: currentTheme.inputBackground,
                  color: currentTheme.text.primary,
                }}
              />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>
          </div>
          <div className="flex flex-row items-center gap-2">
            <label
              className="text-sm font-medium whitespace-nowrap"
              style={{ color: currentTheme.text.primary }}
            >
              Date of Birth<span className="text-red-500 ml-1">*</span>
            </label>
            <div className="flex-1">
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
                  borderColor: errors.dob ? 'rgb(239, 68, 68)' : currentTheme.border,
                  backgroundColor: currentTheme.inputBackground,
                  color: currentTheme.text.primary,
                }}
                required
                dateFormat="dd-MM-yyyy"
                onKeyDown={(e) => e.preventDefault()}
              />
              {errors.dob && <p className="text-red-500 text-xs mt-1">{errors.dob}</p>}
            </div>
          </div>
          <div className="flex flex-row items-center gap-2">
            <label
              className="text-sm font-medium whitespace-nowrap"
              style={{ color: currentTheme.text.primary }}
            >
              Age
            </label>
            <div className="flex-1">
              <CustomInput
                name="age"
                value={formData.age}
                readOnly
                className="w-full p-2 rounded-md border"
                style={{
                  borderColor: currentTheme.border,
                  backgroundColor: currentTheme.inputBackground,
                  color: currentTheme.text.primary,
                }}
              />
            </div>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-6 mt-6">
          <div className="flex flex-row items-center gap-2">
            <label
              className="text-sm font-medium whitespace-nowrap"
              style={{ color: currentTheme.text.primary }}
            >
              Appointment Type
            </label>
            <div className="flex-1">
              <CustomSelect
                name="appointmentType"
                value={formData.appointmentType}
                onChange={handleInputChange}
                options={[
                  { value: 'Consultation', label: 'Consultation' },
                  { value: 'Follow-up', label: 'Follow-up' },
                  { value: 'Second Opinion', label: 'Second Opinion' },
                ]}
                className="w-full p-2 rounded-md border"
                style={{
                  borderColor: currentTheme.border,
                  backgroundColor: currentTheme.inputBackground,
                  color: currentTheme.text.primary,
                }}
              />
            </div>
          </div>
          <div className="flex flex-row items-center gap-2">
            <label
              className="text-sm font-medium whitespace-nowrap"
              style={{ color: currentTheme.text.primary }}
            >
              Purpose of Visit
            </label>
            <div className="flex-1">
              <CustomInput
                name="reasonForVisit"
                value={formData.reasonForVisit}
                onChange={handleInputChange}
                maxLength={100}
                className="w-full p-2 rounded-md border"
                style={{
                  borderColor: currentTheme.border,
                  backgroundColor: currentTheme.inputBackground,
                  color: currentTheme.text.primary,
                }}
              />
              <p className="text-sm text-gray-500 mt-1">
                Characters: {formData.reasonForVisit?.trim().length || 0}/100
              </p>
            </div>
          </div>
        </div>
      </div>

      <div
        className="p-6 rounded-lg shadow-md border"
        style={{ backgroundColor: currentTheme.surface, borderColor: currentTheme.border }}
      >
        <h3 className="text-lg font-semibold mb-4" style={{ color: currentTheme.text.primary }}>
          Medical History
        </h3>
        <div className="grid sm:grid-cols-1 gap-6">
          <div className="flex flex-row items-center gap-2">
            <label
              className="text-sm font-medium whitespace-nowrap"
              style={{ color: currentTheme.text.primary }}
            >
              Medical History Summary
            </label>
            <div className="flex-1">
              <textarea
                name="medicalHistoryMessage"
                value={formData.medicalHistoryMessage}
                onChange={handleInputChange}
                className="w-full p-2 rounded-md border"
                style={{
                  borderColor: errors.medicalHistoryMessage ? 'rgb(239, 68, 68)' : currentTheme.border,
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
                Characters: {formData.medicalHistoryMessage?.length || 0}/200
              </p>
            </div>
          </div>
          <div className="flex flex-row items-center gap-2">
            <label
              className="text-sm font-medium whitespace-nowrap"
              style={{ color: currentTheme.text.primary }}
            >
              Medical History (Optional)
            </label>
            <div className="flex-1">
              <input
                type="file"
                name="medicalHistory"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx"
                className="w-full p-2 rounded-md border"
                style={{
                  borderColor: errors.medicalHistory ? 'rgb(239, 68, 68)' : currentTheme.border,
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
          {isLoading ? 'Processing...' : 'Book Appointment'}
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

export default SelfBookingForm;