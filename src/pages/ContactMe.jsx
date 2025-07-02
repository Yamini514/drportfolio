import React, { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../firebase/config";
import { FaPhone, FaWhatsapp, FaEnvelope } from "react-icons/fa";
import emailjs from "@emailjs/browser";
import { useLocation } from "react-router-dom";

function ContactMe({ id }) {
  const { currentTheme } = useTheme();
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    message: "",
    timestamp: null,
  });
  const [errors, setErrors] = useState({
    fullName: "",
    email: "",
    phone: "",
    message: "",
  });
  const location = useLocation();

  useEffect(() => {
    emailjs.init("2pSuAO6tF3T-sejH-");
  }, []);

  useEffect(() => {
    console.log(`Contact section with id "${id}" mounted`);
  }, [id]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location]);

  const validatePhone = (phone) => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone);
  };

  const validateName = (name) => {
    const nameRegex = /^[A-Za-z\s'.\-]+$/;
    return nameRegex.test(name);
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateField = (name, value) => {
    switch (name) {
      case "fullName":
        if (value.length > 25) return "Name cannot exceed 25 characters";
        if (value && !validateName(value)) return "Only letters, spaces, and basic punctuation are allowed";
        if (!value) return "Name is required";
        return "";
      case "email":
        if (!value) return "Email is required";
        if (!validateEmail(value)) return "Please enter a valid email address";
        return "";
      case "phone":
        if (!value) return "Phone number is required";
        if (!validatePhone(value)) return "Please enter a valid 10-digit mobile number starting with 6-9";
        return "";
      case "message":
        if (value.length > 200) return "Message cannot exceed 200 characters";
        if (!value) return "Message is required";
        return "";
      default:
        return "";
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;

    if (name === "fullName") {
      processedValue = value.replace(/[^A-Za-z\s'.\-]/g, "").slice(0, 25);
    } else if (name === "phone") {
      processedValue = value.replace(/[^0-9]/g, "").slice(0, 10);
    } else if (name === "message") {
      processedValue = value.slice(0, 200);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: processedValue,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: validateField(name, processedValue),
    }));
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setErrors((prev) => ({
      ...prev,
      [name]: validateField(name, value),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Form submitted:", formData);

    const newErrors = {
      fullName: validateField("fullName", formData.fullName),
      email: validateField("email", formData.email),
      phone: validateField("phone", formData.phone),
      message: validateField("message", formData.message),
    };

    setErrors(newErrors);

    if (Object.values(newErrors).some((error) => error)) {
      console.log("Validation errors:", newErrors);
      return;
    }

    try {
      const dataToSubmit = {
        ...formData,
        timestamp: new Date(),
      };

      console.log("Saving to Firestore...", dataToSubmit);
      await addDoc(collection(db, "contacts"), dataToSubmit);
      console.log("Firestore save successful");

      console.log("Preparing email parameters...");
      const emailParams = {
        name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        message: formData.message,
        subject: "We've received your message",
      };
      console.log("Email parameters:", emailParams);

      console.log("Sending EmailJS...");
      const response = await emailjs.send("service_l920egs", "template_4t5xy58", emailParams);
      console.log("EmailJS sent successfully:", response);

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setFormData({
          fullName: "",
          email: "",
          phone: "",
          message: "",
          timestamp: null,
        });
        setErrors({
          fullName: "",
          email: "",
          phone: "",
          message: "",
        });
      }, 3000);
    } catch (error) {
      console.error("Error submitting form or sending notifications:", error);
      const errorMessage = error.text || error.message || JSON.stringify(error) || "Unknown error";
      alert(`There was an error submitting your message. Please try again. Details: ${errorMessage}`);
      console.log("Error details:", error);
    }
  };

  return (
    <section id={id}>
      <div className="px-5 md:px-15 pb-12 mt-5 md:pb-10 lg:px-20 p-8" style={{ backgroundColor: currentTheme.background }}>
        <div className="container mx-auto">
          {showSuccess && (
            <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-md shadow-lg z-50 animate-fade-in-out">
              Message sent successfully!
            </div>
          )}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Reach Us</h1>
            <p className="text-lg" style={{ color: currentTheme.text.secondary }}>
              Have questions or want to schedule a consultation? Contact us today for personalized care.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div style={{ backgroundColor: currentTheme.surface, borderColor: currentTheme.border }} className="p-6 rounded-lg border">
              <h2 className="text-2xl font-semibold mb-6 text-center">Enquire</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Full Name</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    style={{
                      backgroundColor: currentTheme.background,
                      borderColor: errors.fullName ? "red" : currentTheme.border,
                      color: currentTheme.text.primary,
                    }}
                    className="w-full px-4 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                    maxLength="25"
                    placeholder="Enter your full name"
                  />
                  {errors.fullName && <p className="text-sm text-red-500 mt-1">{errors.fullName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    style={{
                      backgroundColor: currentTheme.background,
                      borderColor: errors.email ? "red" : currentTheme.border,
                      color: currentTheme.text.primary,
                    }}
                    className="w-full px-4 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                    placeholder="Enter your email"
                  />
                  {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    style={{
                      backgroundColor: currentTheme.background,
                      borderColor: errors.phone ? "red" : currentTheme.border,
                      color: currentTheme.text.primary,
                    }}
                    className="w-full px-4 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                    maxLength="10"
                    placeholder="Enter 10-digit mobile number"
                  />
                  {errors.phone && <p className="text-sm text-red-500 mt-1">{errors.phone}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Message</label>
                  <textarea
                    rows="4"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    style={{
                      backgroundColor: currentTheme.background,
                      borderColor: errors.message ? "red" : currentTheme.border,
                      color: currentTheme.text.primary,
                    }}
                    className="w-full px-4 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                    maxLength="200"
                    placeholder="Enter your message (max 200 characters)"
                  ></textarea>
                  <p className="text-sm text-gray-500 mt-1">{formData.message.length}/200 characters</p>
                  {errors.message && <p className="text-sm text-red-500 mt-1">{errors.message}</p>}
                </div>
                <button
                  type="submit"
                  style={{ backgroundColor: currentTheme.primary }}
                  className="w-32 py-3 text-white rounded-lg font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 transform hover:scale-105 transition-all duration-300 mx-auto flex items-center justify-center shadow-md"
                  disabled={Object.values(errors).some((error) => error)}
                >
                  Send
                </button>
              </form>
            </div>

            <div style={{ backgroundColor: currentTheme.surface, borderColor: currentTheme.border }} className="p-6 rounded-lg border">
              <h2 className="text-2xl font-semibold mb-6 text-center">Contact Information</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-2">Call Us</h3>
                  <div className="space-y-2" style={{ color: currentTheme.text.secondary }}>
                    <a
                      href="tel:+918688423659"
                      className="flex items-center gap-2 hover:text-primary transition-colors"
                      style={{ color: currentTheme.text.primary }}
                    >
                      <FaPhone className="text-lg" />
                      <FaWhatsapp className="text-lg text-violet-500" />
                      <span>+91-86884 23659</span>
                    </a>
                    <a
                      href="https://wa.me/918688423659"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                      style={{ color: currentTheme.primary }}
                    ></a>
                    <a
                      href="tel:+919381453352"
                      className="flex items-center gap-2 hover:text-primary transition-colors"
                      style={{ color: currentTheme.text.primary }}
                    >
                      <FaPhone className="text-lg" />
                      <FaWhatsapp className="text-lg text-violet-500" />
                      <span>+91-93814 53352</span>
                    </a>
                    <a
                      href="https://wa.me/919381453352"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                      style={{ color: currentTheme.primary }}
                    ></a>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium mb-2">General Enquiries</h3>
                  <p style={{ color: currentTheme.text.secondary }}>
                    <a
                      href="mailto:laxminadh.sivaraju@gmail.com"
                      className="flex items-center gap-2 hover:text-primary transition-colors"
                    >
                      <FaEnvelope className="text-lg" style={{ color: currentTheme.text.primary }} />
                      <span>laxminadh.sivaraju@gmail.com</span>
                    </a>
                  </p>
                </div>
                <div>
                  <h3 className="font-medium mb-2 text-lg">Our Locations & Consulting Timings</h3>
                  <div className="space-y-4" style={{ color: currentTheme.text.secondary }}>
                    <div>
                      <p className="font-medium" style={{ color: currentTheme.text.primary }}>CARE Hospitals</p>
                      <p>Timings: 11:00 AM to 05:00 PM</p>
                      <p>CARE Hospitals, HITEC City, Hyderabad,<br />CARE Medical Center, Tolichowki, Hyderabad</p>
                    </div>
                    <div>
                      <p className="font-medium" style={{ color: currentTheme.text.primary }}>Clinic</p>
                      <p>Timings: 06:00 PM to 07:00 PM</p>
                      <p>Jains Carlton Creek Apartments,<br />Sai Aishwarya Layout, Manikonda Jagir,<br />Telangana 500104</p>
                    </div>
                    <p>Sunday: Closed</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {showSuccess && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="p-6 rounded-lg text-center" style={{ backgroundColor: currentTheme.surface }}>
              <h3 className="text-xl font-semibold mb-2">Message Sent Successfully!</h3>
              <p style={{ color: currentTheme.text.secondary }}>Thank you for contacting us.</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default ContactMe;