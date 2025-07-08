import React, { useState } from "react";
import { Calendar, FileText } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import BookingForm from "./BookingForm";
import MyAppointments from "./MyAppointments";

const BookAppointment = () => {
  const { currentTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("book");

  const handleBookingSuccess = () => {
    setActiveTab("appointments");
  };

  const tabs = [
    {
      id: "book",
      label: "Book Appointment",
      // icon: Calendar,
      component: BookingForm,
    },
    {
      id: "appointments",
      label: "My Appointments",
      // icon: FileText,
      component: MyAppointments,
    }
  ];

  return (
    <div
      className="p-4 min-h-screen"
      style={{ backgroundColor: currentTheme.background }}
    >
      <>
        {/* Header */}
        <div className="flex justify-between items-center mb-2">
          <h1 
            className="text-xl font-medium"
            style={{ color: currentTheme.text.primary }}
          >
            Appointment Management
          </h1>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-2">
          {tabs.map(tab => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 transition-all duration-200 relative flex items-center gap-2 ${
                  activeTab === tab.id ? 'font-semibold' : 'hover:opacity-80'
                }`}
                style={{
                  color: currentTheme.accent,
                }}
              >
                {/* <IconComponent className="w-4 h-4" /> */}
                <span>{tab.label}</span>
                {activeTab === tab.id && (
                  <div
                    className="absolute bottom-0 left-0 w-full h-0.5"
                    style={{ backgroundColor: currentTheme.accent }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div 
          style={{ backgroundColor: currentTheme.surface }} 
          className="rounded-lg shadow-md p-6"
        >
          {tabs.map(tab => {
            const TabComponent = tab.component;
            return activeTab === tab.id && (
              <TabComponent
                key={tab.id}
                theme={currentTheme}
                onBookingSuccess={tab.id === "book" ? handleBookingSuccess : undefined}
              />
            );
          })}
        </div>
      </>
    </div>
  );
};

export default BookAppointment;