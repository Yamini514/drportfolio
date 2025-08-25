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

const PerformanceBarChart = ({ data }) => {
  const chartData = {
    labels: data.map((d) => d.page || "-"),
    datasets: [
      {
        label: "Performance",
        backgroundColor: "#34a853",
        borderRadius: 6,
        data: data.map((d) => d.performance),
      },
      {
        label: "SEO",
        backgroundColor: "#1a73e8",
        borderRadius: 6,
        data: data.map((d) => d.seo),
      },
      {
        label: "Accessibility",
        backgroundColor: "#fbbc05",
        borderRadius: 6,
        data: data.map((d) => d.accessibility),
      },
      {
        label: "Best Practices",
        backgroundColor: "#ff6d01",
        borderRadius: 6,
        data: data.map((d) => d.bestPractices),
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          boxWidth: 14,
          padding: 12,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 12 } },
      },
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { stepSize: 20, font: { size: 12 } },
        grid: { color: "#f3f4f6" },
      },
    },
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-96">
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default PerformanceBarChart;
