const CoreWebVitalCard = ({ label, value, threshold, status }) => {
  const circleColor =
    status === "Good" ? "bg-green-300" : "bg-yellow-400";
  const statusColor =
    status === "Good" ? "text-green-600" : "text-yellow-600";

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
      {/* Circle */}
      <div
        className={`w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-lg ${circleColor}`}
      >
        {value}
      </div>

      {/* Label */}
      <p className="mt-4 font-semibold text-gray-800 text-center">{label}</p>

      {/* Threshold & Status */}
      <small className={`mt-1 text-sm ${statusColor}`}>
        Threshold: {threshold} 
        <br/> {status}
      </small>
    </div>
  );
};

export default CoreWebVitalCard;
