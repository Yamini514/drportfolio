import React, { useState } from "react";
import { useTheme } from "../../../context/ThemeContext";
import AvailablePeriods from "./AvailablePeriods";
import BlockedPeriods from "./BlockedPeriods";
import { Calendar, AlertTriangle } from "lucide-react";

const ScheduleManager = () => {
  const { currentTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("available");

  const tabs = [
    {
      id: "available",
      label: "Available Periods",
      icon: Calendar,
      component: AvailablePeriods,
    },
    {
      id: "blocked",
      label: "Blocked Periods", 
      icon: AlertTriangle,
      component: BlockedPeriods,
    },
  ];

  return (
    <section className="p-0 relative" aria-label="Schedule Management">
      <h2
        className="text-2xl font-medium mb-2"
        style={{ color: currentTheme.text.primary }}
      >
        Schedule Management
      </h2>

      {/* Tab Navigation */}
      <nav
        className="flex border-b mb-4"
        style={{ borderColor: currentTheme.border }}
      >
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              className={`px-4 py-2 mr-2 font-medium rounded-t-lg transition-colors flex items-center ${
                activeTab === tab.id ? "border-b-2" : ""
              }`}
              style={{
                borderColor:
                  activeTab === tab.id ? currentTheme.primary : "transparent",
                color:
                  activeTab === tab.id
                    ? currentTheme.primary
                    : currentTheme.text.secondary,
              }}
              onClick={() => setActiveTab(tab.id)}
              aria-current={activeTab === tab.id ? "page" : undefined}
            >
              <IconComponent size={16} className="mr-2" />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Tab Content */}
      <div>
        {tabs.map((tab) => {
          const TabComponent = tab.component;
          return (
            activeTab === tab.id && (
              <TabComponent key={tab.id} />
            )
          );
        })}
      </div>
    </section>
  );
};

export default ScheduleManager;