import React, { useState } from "react";
import PageSpeed from "../pages/PageSpeed";
// import GoogleAnalytics from "../pages/GoogleAnalytics";
// import KeywordRankings from "../pages/KeywordRankings";
// import SearchConsole from "../pages/SearchConsole";
// import GoalTrackingDashboard from "../pages/GoalTrackingDashboard";
// import LocalSEODashboard from "../pages/LocalSEODashboard";
import CustomButton from "../components/CustomButton"; // Import your custom button component

// Example placeholder components for each section
const DashboardOverview = () => <div><h2>Dashboard Overview</h2><p>Overview content here...</p></div>;

const Backlinks = () => <div><h2>Backlinks</h2><p>Backlink details here...</p></div>;

const TechnicalIssues = () => <div><h2>Technical Issues</h2><p>Technical SEO issues here...</p></div>;

const SocialSignals = () => <div><h2>Social Signals</h2><p>Social signals and engagement here...</p></div>;

// Sidebar menu items config
const menuItems = [
  { id: "dashboard", label: "Dashboard Overview", component: DashboardOverview },
  // { id: "rankings", label: "Website Rankings", component: KeywordRankings }, // ✅ Corrected line
  // { id: "analytics", label: "Google Analytics", component: GoogleAnalytics },
  { id: "pageSpeed", label: "Page Speed", component: PageSpeed },
  // { id: "backlinks", label: "Backlinks", component: Backlinks },
  // { id: "searchConsole", label: "Search Console", component: SearchConsole },
  // { id: "goalTracking", label: "Goal Tracking", component: GoalTrackingDashboard },
  // { id: "localSEO", label: "Local SEO", component: LocalSEODashboard },
];

export default function AnalyticsIndex() {
  const [activeMenu, setActiveMenu] = useState("dashboard");

  const ActiveComponent = menuItems.find(item => item.id === activeMenu)?.component;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
      {/* Menu buttons */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "15px",
          justifyContent: "center", // Center buttons horizontally
          alignItems: "center", // Center buttons vertically
          marginBottom: "30px",
          padding: "10px", // Add padding to create space around buttons
        }}
      >
        {menuItems.map(({ id, label }) => (
          <CustomButton
            key={id}
            onClick={() => setActiveMenu(id)}
            variant={id === activeMenu ? "primary" : "secondary"} // Active menu gets primary variant
            className="menu-button"
            style={{ minWidth: "180px" }} // Ensure buttons have a reasonable width
          >
            {label}
          </CustomButton>
        ))}
      </div>

      {/* Main content */}
      <main
        style={{
          flexGrow: 1,
          padding: "30px",
          backgroundColor: "#f9f9f9",
          overflowY: "auto",
        }}
      >
        {ActiveComponent ? <ActiveComponent /> : <p>Select a menu item</p>}
      </main>
    </div>
  );
}
