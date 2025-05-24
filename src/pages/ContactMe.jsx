import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase/config';
import { FaPhone, FaWhatsapp, FaEnvelope } from 'react-icons/fa'; // Updated import

function ContactMe() {
  const { currentTheme } = useTheme();
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    message: '',
    timestamp: null
  });
  const [phoneError, setPhoneError] = useState('');
  const [nameError, setNameError] = useState('');

  const validatePhone = (phone) => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone);
  };

  const validateName = (name) => {
    const nameRegex = /^[A-Za-z\s'.\-]+$/;
    return nameRegex.test(name);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'fullName') {
      // Only allow letters and spaces for name field
      const lettersAndSpacesOnly = value.replace(/[^A-Za-z\s]/g, '');
      
      setFormData(prev => ({
        ...prev,
        [name]: lettersAndSpacesOnly
      }));

      if (value !== lettersAndSpacesOnly && value.length > 0) {
        setNameError('Only letters and spaces are allowed in name');
      } else {
        setNameError('');
      }
    } else if (name === 'phone') {
      // Only allow numbers
      const numbersOnly = value.replace(/[^0-9]/g, '');
      
      setFormData(prev => ({
        ...prev,
        [name]: numbersOnly
      }));

      // Validate phone number
      if (numbersOnly.length > 0) {
        if (!validatePhone(numbersOnly)) {
          setPhoneError('Please enter a valid 10-digit mobile number starting with 6-9');
        } else {
          setPhoneError('');
        }
      } else {
        setPhoneError('');
      }
    } else {
      // For email and message fields, allow all characters
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate phone number before submission
    if (!validatePhone(formData.phone)) {
      setPhoneError('Please enter a valid 10-digit mobile number starting with 6-9');
      return;
    }

    try {
      // Add timestamp
      const dataToSubmit = {
        ...formData,
        timestamp: new Date()
      };

      // Add to Firestore
      await addDoc(collection(db, 'contacts'), dataToSubmit);
      
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setFormData({
          fullName: '',
          email: '',
          phone: '',
          message: '',
          timestamp: null
        });
      }, 3000);
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('There was an error submitting your message. Please try again.');
    }
  };

  return (
    <div id="contactme" className="px-5 pb-5 md:px-15 md:pb-5 lg:px-20" style={{ backgroundColor: currentTheme.background }}>
      <div className="container mx-auto">
        {showSuccess && (
          <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-md shadow-lg z-50 animate-fade-in-out">
            Message sent successfully!
          </div>
        )}
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Get in Touch</h1>
          <p className="text-lg" style={{ color: currentTheme.text.secondary }}>
            Have questions or want to schedule a consultation? Contact us today for personalized care.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div style={{ 
            backgroundColor: currentTheme.surface,
            borderColor: currentTheme.border 
          }} className="p-6 rounded-lg border">
            <h2 className="text-2xl font-semibold mb-6">Send us a message</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  style={{ 
                    backgroundColor: currentTheme.background,
                    borderColor: currentTheme.border,
                    color: currentTheme.text.primary 
                  }}
                  className="w-full px-4 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  style={{ 
                    backgroundColor: currentTheme.background,
                    borderColor: currentTheme.border,
                    color: currentTheme.text.primary 
                  }}
                  className="w-full px-4 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  style={{ 
                    backgroundColor: currentTheme.background,
                    borderColor: phoneError ? 'red' : currentTheme.border,
                    color: currentTheme.text.primary 
                  }}
                  className="w-full px-4 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                  maxLength="10"
                  placeholder="Enter 10-digit mobile number"
                />
                {phoneError && (
                  <p className="text-sm text-red-500 mt-1">{phoneError}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Message</label>
                <textarea
                  rows="4"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  style={{ 
                    backgroundColor: currentTheme.background,
                    borderColor: currentTheme.border,
                    color: currentTheme.text.primary 
                  }}
                  className="w-full px-4 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                ></textarea>
              </div>
              <button
                type="submit"
                style={{ backgroundColor: currentTheme.primary }}
                className="w-full py-3 text-white rounded-md hover:opacity-90 transition-opacity"
              >
                Submit Message
              </button>
            </form>
          </div>

          {/* Contact Information */}
          <div style={{ 
            backgroundColor: currentTheme.surface,
            borderColor: currentTheme.border 
          }} className="p-6 rounded-lg border">
            <h2 className="text-2xl font-semibold mb-6">Contact Information</h2>
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
                    <span>+91-86884 23659</span>
                  </a>
                  <a 
                    href="https://wa.me/918688423659" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                    style={{ color: currentTheme.primary }}
                  >
                    <FaWhatsapp className="text-lg" />
                    <span>WhatsApp</span>
                  </a>
                  <a 
                    href="tel:+919381453352" 
                    className="flex items-center gap-2 hover:text-primary transition-colors"
                    style={{ color: currentTheme.text.primary }}
                  >
                    <FaPhone className="text-lg" />
                    <span>+91-93814 53352</span>
                  </a>
                  <a 
                    href="https://wa.me/919381453352" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                    style={{ color: currentTheme.primary }}
                  >
                    <FaWhatsapp className="text-lg" />
                    <span>WhatsApp</span>
                  </a>
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
                    <p>CARE Hospitals, HITEC City, Hyderabad,<br />
                       CARE Medical Center, Tolichowki, Hyderabad</p>
                  </div>
                  <div>
                    <p className="font-medium" style={{ color: currentTheme.text.primary }}>Clinic</p>
                    <p>Timings: 06:00 PM to 07:00 PM</p>
                    <p>Jains Carlton Creek Apartments,<br />
                       Sai Aishwarya Layout, Manikonda Jagir,<br />
                       Telangana 500104</p>
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
          <div 
            className="p-6 rounded-lg text-center"
            style={{ backgroundColor: currentTheme.surface }}
          >
            <h3 className="text-xl font-semibold mb-2">Message Sent Successfully!</h3>
            <p style={{ color: currentTheme.text.secondary }}>Thank you for contacting us.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContactMe;