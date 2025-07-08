import { useState } from "react";
import AddAppointment from "./AddAppointment";
import ScheduleManager from "./ScheduleManager";
import { useTheme } from "../../../context/ThemeContext";
import ViewAppointments from "./ViewAppointments";

function Appointments() {
  const { currentTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("viewappointment");

  const tabs = [
    {
      id: "viewappointment",
      label: "View Appointments",
      component: ViewAppointments,
    },
    {
      id: "addappointment",
      label: "Add Appointment",
      component: AddAppointment,
    },
    {
      id: "schedulemanager",
      label: "Schedule Manager",
      component: ScheduleManager,
    },
  ];

  return (
    <div
      className="p-4 min-h-screen"
      style={{ backgroundColor: currentTheme.background }}
    >
      <div className="flex justify-between items-center mb-2">
        <h1
          className="text-2xl font-bold"
          style={{ color: currentTheme.text.primary }}
        >
          Appointments Management
        </h1>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-6 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-2 py-1 transition-all duration-200 relative ${
              activeTab === tab.id ? "font-semibold" : "hover:opacity-80"
            }`}
            style={{
              color: currentTheme.accent,
            }}
          >
            <span>{tab.label}</span>
            {activeTab === tab.id && (
              <div
                className="absolute bottom-0 left-0 w-full h-0.5"
                style={{ backgroundColor: currentTheme.accent }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div
        style={{ backgroundColor: currentTheme.surface }}
        className="rounded-lg shadow-md p-4"
      >
        {tabs.map((tab) => {
          const TabComponent = tab.component;
          return (
            activeTab === tab.id && (
              <TabComponent key={tab.id} theme={currentTheme} />
            )
          );
        })}
      </div>
    </div>
  );
}

export default Appointments;
