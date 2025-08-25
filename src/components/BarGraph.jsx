// components/BarGraph.jsx
import React from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const BarGraph = ({ top3, top10 }) => {
  const data = {
    labels: ["Top 3 Rankings", "Top 10 Rankings"],
    datasets: [
      {
        label: "Rank Count",
        data: [top3, top10],
        backgroundColor: ["#4285F4", "#34A853"],
      },
    ],
  };

  return (
    <div style={{ background: "#fff", padding: 20, borderRadius: 8, marginBottom: 40 }}>
      <h3>Ranking Distribution</h3>
      <Bar data={data} />
    </div>
  );
};

export default BarGraph;
