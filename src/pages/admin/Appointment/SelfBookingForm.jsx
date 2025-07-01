import React, { useEffect } from 'react';
import CustomInput from '../../../components/CustomInput';
import CustomSelect from '../../../components/CustomSelect';
import CustomButton from '../../../components/CustomButton';
import { useTheme } from '../../../context/ThemeContext';

const SelfBookingForm = ({
  formData = {
    name: '',
    email: '',
    pid: '',
    phone: '',
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

  useEffect(() => {
    const savedFormData = localStorage.getItem('selfBookingFormData');
    if (savedFormData) {
      try {
        const parsedData = JSON.parse(savedFormData);
        setFormData((prev) => ({
          ...prev,
          ...parsedData,
          medicalHistory: null, // Files cannot be persisted in localStorage
        }));
      } catch (error) {
        console.error('Error parsing saved form data:', error);
      }
    }
  }, [setFormData]);

  useEffect(() => {
    const { medicalHistory, ...dataToSave } = formData;
    localStorage.setItem('selfBookingFormData', JSON.stringify(dataToSave));
  }, [formData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'reasonForVisit' || name === 'medicalHistoryMessage' ? value.trimStart() : value,
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

    if (name === 'pid') {
      if (!value) {
        setErrors((prev) => ({ ...prev, pid: 'Patient ID is required' }));
      } else {
        setErrors((prev) => ({ ...prev, pid: '' }));
      }
    }

    if (name === 'phone') {
      const phoneValue = value.replace(/[^0-9+]/g, '');
      if (phoneValue.length > 12) {
        setErrors((prev) => ({ ...prev, phone: 'Phone number cannot exceed 12 digits' }));
      } else if (!phoneValue) {
        setErrors((prev) => ({ ...prev, phone: 'Phone is required' }));
      } else if (!/^\+?[0-9]{10,12}$/.test(phoneValue)) {
        setErrors((prev) => ({ ...prev, phone: 'Please enter a valid phone number (10-12 digits)' }));
      } else {
        setErrors((prev) => ({ ...prev, phone: '' }));
      }
    }

    if (name === 'age') {
      if (!value) {
        setErrors((prev) => ({ ...prev, age: 'Age is required' }));
      } else if (!/^\d+$/.test(value) || value < 0 || value > 120) {
        setErrors((prev) => ({ ...prev, age: 'Please enter a valid age (0-120)' }));
      } else {
        setErrors((prev) => ({ ...prev, age: '' }));
      }
    }

    if (name === 'reasonForVisit') {
      if (value.length > 100) {
        setErrors((prev) => ({ ...prev, reasonForVisit: 'Purpose of visit must be 100 characters or less' }));
      } else {
        setErrors((prev) => ({ ...prev, reasonForVisit: '' }));
      }
    }

    if (name === 'medicalHistoryMessage') {
      if (value.length > 200) {
        setErrors((prev) => ({ ...prev, medicalHistoryMessage: 'Summary must be 200 characters or less' }));
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
        setErrors((prev) => ({ ...prev, medicalHistory: 'Please upload a PDF or DOC/DOCX file' }));
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

  // Optional: Clear localStorage when form is submitted successfully
  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleSubmit(e);
    localStorage.removeItem('selfBookingFormData'); // Clear saved data on successful submission
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6 mt-8">
      <div
        className="p-6 rounded-lg shadow-md border"
        style={{ backgroundColor: currentTheme.surface, borderColor: currentTheme.border }}
      >
        <h3 className="text-lg font-semibold mb-4" style={{ color: currentTheme.text.primary }}>
          Personal Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="name"
              className="text-sm font-medium"
              style={{ color: currentTheme.text.primary }}
            >
              Name<span className="text-red-500 ml-1">*</span>
            </label>
            <CustomInput
              id="name"
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
          <div className="flex flex-col gap-2">
            <label
              htmlFor="email"
              className="text-sm font-medium"
              style={{ color: currentTheme.text.primary }}
            >
              Email
            </label>
            <CustomInput
              id="email"
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
          <div className="flex flex-col gap-2">
            <label
              htmlFor="pid"
              className="text-sm font-medium"
              style={{ color: currentTheme.text.primary }}
            >
              PID<span className="text-red-500 ml-1">*</span>
            </label>
            <CustomInput
              id="pid"
              name="pid"
              value={formData.pid}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="phone"
              className="text-sm font-medium"
              style={{ color: currentTheme.text.primary }}
            >
              Phone<span className="text-red-500 ml-1">*</span>
            </label>
            <CustomInput
              id="phone"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
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
          <div className="flex flex-col gap-2">
            <label
              htmlFor="age"
              className="text-sm font-medium"
              style={{ color: currentTheme.text.primary }}
            >
              Age<span className="text-red-500 ml-1">*</span>
            </label>
            <CustomInput
              id="age"
              type="number"
              name="age"
              value={formData.age}
              onChange={handleInputChange}
              required
              min="0"
              max="120"
              className="w-full p-2 rounded-md border"
              style={{
                borderColor: errors.age ? 'rgb(239, 68, 68)' : currentTheme.border,
                backgroundColor: currentTheme.inputBackground,
                color: currentTheme.text.primary,
              }}
            />
            {errors.age && <p className="text-red-500 text-xs mt-1">{errors.age}</p>}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="appointmentType"
              className="text-sm font-medium"
              style={{ color: currentTheme.text.primary }}
            >
              Appointment Type
            </label>
            <CustomSelect
              id="appointmentType"
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
          <div className="flex flex-col gap-2">
            <label
              htmlFor="reasonForVisit"
              className="text-sm font-medium"
              style={{ color: currentTheme.text.primary }}
            >
              Purpose of Visit
            </label>
            <CustomInput
              id="reasonForVisit"
              name="reasonForVisit"
              value={formData.reasonForVisit}
              onChange={handleInputChange}
              maxLength={100}
              className="w-full p-2 rounded-md border"
              style={{
                borderColor: errors.reasonForVisit ? 'rgb(239, 68, 68)' : currentTheme.border,
                backgroundColor: currentTheme.inputBackground,
                color: currentTheme.text.primary,
              }}
            />
            {errors.reasonForVisit && <p className="text-red-500 text-xs mt-1">{errors.reasonForVisit}</p>}
            <p className="text-sm text-gray-500 mt-1">
              Characters: {formData.reasonForVisit?.trim().length || 0}/100
            </p>
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
        <div className="grid grid-cols-1 gap-6">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="medicalHistoryMessage"
              className="text-sm font-medium"
              style={{ color: currentTheme.text.primary }}
            >
              Medical History Summary
            </label>
            <textarea
              id="medicalHistoryMessage"
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
          <div className="flex flex-col gap-2">
            <label
              htmlFor="medicalHistory"
              className="text-sm font-medium"
              style={{ color: currentTheme.text.primary }}
            >
              Medical History (Optional)
            </label>
            <input
              id="medicalHistory"
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

      <div className="flex justify-center gap-4">
        <CustomButton
          type="submit"
          variant="primary"
          disabled={isLoading}
          className="w-max py-2 px-4"
        >
          {isLoading ? 'Processing...' : 'Book Appointment'}
        </CustomButton>
        <CustomButton
          type="button"
          variant="secondary"
          onClick={handleCancel}
          className="w-max py-2 px-4"
        >
          Cancel
        </CustomButton>
      </div>
    </form>
  );
};

export default SelfBookingForm;