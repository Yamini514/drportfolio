import React from "react";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale, Tooltip } from "chart.js";

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip);

const LineChart = ({ data }) => {
  const chartData = {
    labels: data.map((d) => d.month),
    datasets: [
      {
        label: "Total Sessions",
        data: data.map((d) => d.sessions),
        borderColor: "#1a73e8",
        tension: 0.4,
        fill: false,
      },
      {
        label: "Users",
        data: data.map((d) => d.users),
        borderColor: "#34a853",
        tension: 0.4,
        fill: false,
      },
      {
        label: "New Users",
        data: data.map((d) => d.newUsers),
        borderColor: "#fbbc05",
        tension: 0.4,
        fill: false,
      },
    ],
  };

  return <Line data={chartData} />;
};

export default LineChart;
