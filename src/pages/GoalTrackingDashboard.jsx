import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import MetricCard from "../components/MetricCard";
import LineChart from "../components/LineChart";
import BarGraph from "../components/BarGraph";
import PieChart from "../components/PieChart"; // We'll create this

const GoalTrackingDashboard = () => {
  const [metrics, setMetrics] = useState({});
  const [trendData, setTrendData] = useState([]);
  const [funnelData, setFunnelData] = useState({ top3: 0, top10: 0 });
  const [trafficSourceData, setTrafficSourceData] = useState([]);
  const [appointmentTypeData, setAppointmentTypeData] = useState([]);
  const [topPages, setTopPages] = useState([]);

  useEffect(() => {
    const fetchGoalData = async () => {
      const snap = await getDocs(collection(db, "goal_tracking"));
      const data = snap.docs.map(doc => doc.data());

      // Aggregate metrics
      const newMetrics = {
        applyClicks: data.filter(d => d.event === "apply_click").length,
        formSubmissions: data.filter(d => d.event === "contact_form_submit").length,
        phoneCalls: data.filter(d => d.event === "phone_call_click").length,
        brochureDownloads: data.filter(d => d.event === "brochure_download").length,
      };
      setMetrics(newMetrics);

      // Trend by date
      const trendsMap = {};
      data.forEach(d => {
        const day = d.timestamp?.toDate().toISOString().slice(0, 10) || "unknown";
        trendsMap[day] = (trendsMap[day] || 0) + 1;
      });
      setTrendData(Object.entries(trendsMap).map(([date, sessions]) => ({ month: date, sessions })));

      // Funnel data
      setFunnelData({
        top3: data.length,
        top10: data.filter(d => d.event !== "page_view").length,
      });

      // Appointment Types Pie Chart
      const appointmentMap = {};
      data.forEach(d => {
        if (!d.appointmentType) return;
        appointmentMap[d.appointmentType] = (appointmentMap[d.appointmentType] || 0) + 1;
      });
      setAppointmentTypeData(Object.entries(appointmentMap).map(([type, value]) => ({ name: type, value })));

      // Traffic Sources Bar Graph
      const sourceMap = {};
      data.forEach(d => {
        if (!d.source) return;
        sourceMap[d.source] = (sourceMap[d.source] || 0) + 1;
      });
      setTrafficSourceData(Object.entries(sourceMap).map(([source, value]) => ({ source, value })));

      // Top pages
      const pagesMap = {};
      data.forEach(d => {
        if (!d.page) return;
        pagesMap[d.page] = (pagesMap[d.page] || 0) + 1;
      });
      const pagesArray = Object.entries(pagesMap)
        .map(([path, conversions]) => ({ path, conversions, rate: ((conversions / data.length) * 100).toFixed(1) + "%" }))
        .sort((a, b) => b.conversions - a.conversions)
        .slice(0, 5);
      setTopPages(pagesArray);
    };

    fetchGoalData();
  }, []);

  return (
    <div style={{ padding: 20, background: "#f9f9f9", fontFamily: "'Segoe UI', sans-serif" }}>
      {/* Metric Cards */}
      <div style={{ display: "flex", gap: 20, marginBottom: 30 }}>
        <MetricCard title="Appointments Booked" value={metrics.applyClicks || 0} />
        <MetricCard title="Form Submissions" value={metrics.formSubmissions || 0} />
        <MetricCard title="Phone Calls" value={metrics.phoneCalls || 0} />
        <MetricCard title="Brochure Downloads" value={metrics.brochureDownloads || 0} />
      </div>

      {/* Conversion Trends */}
      <div style={{ background: "#fff", padding: 20, borderRadius: 8, marginBottom: 40 }}>
        <h3>Conversion Trends Over Time</h3>
        <LineChart data={trendData} />
      </div>

      {/* Conversion Funnel & Appointment Types */}
      <div style={{ display: "flex", gap: 20, marginBottom: 40 }}>
        <div style={{ flex: 1, background: "#fff", padding: 20, borderRadius: 8 }}>
          <h3>Conversion Funnel</h3>
          <BarGraph top3={funnelData.top3} top10={funnelData.top10} />
        </div>
        <div style={{ flex: 1, background: "#fff", padding: 20, borderRadius: 8 }}>
          <h3>Appointment Types</h3>
          <PieChart data={appointmentTypeData} />
        </div>
      </div>

      {/* Conversions by Traffic Source */}
      <div style={{ background: "#fff", padding: 20, borderRadius: 8, marginBottom: 40 }}>
        <h3>Conversions by Traffic Source</h3>
        <BarGraph
          top3={trafficSourceData.reduce((acc, d) => acc + d.value, 0)}
          top10={0} // optional: can be broken down per source
        />
      </div>

      {/* Top Converting Pages */}
      <div style={{ background: "#fff", padding: 20, borderRadius: 8 }}>
        <h3>Top Converting Pages</h3>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {topPages.map((page, idx) => (
            <li key={idx} style={{ padding: "10px 0", borderBottom: "1px solid #eee" }}>
              <strong>{page.path}</strong> – {page.conversions} conversions ({page.rate})
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default GoalTrackingDashboard;
