const MetricCard = ({ title, value, change, reverse }) => {
  const isPositive = reverse ? parseFloat(change) < 0 : parseFloat(change) > 0;
  
  return (
    <div
      style={{
        flex: "1 1 100px",  // Reduced flex size
        backgroundColor: "#fff",
        borderRadius: "8px",  // Smaller border radius
        padding: "10px",  // Reduced padding
        boxShadow: "0 4px 8px rgba(0,0,0,0.1)",  // Subtle shadow
        minWidth: "180px",  // Reduced width for cards
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "100%",
        boxSizing: "border-box",  // Ensure padding is included in width/height
      }}
    >
      {/* Title of the metric */}
      <h4
        style={{
          fontSize: "14px",  // Reduced font size for the title
          color: "#333",
          marginBottom: "8px",  // Reduced margin
          fontWeight: "500",
        }}
      >
        {title}
      </h4>

      {/* Value of the metric */}
      <p
        style={{
          fontSize: "20px",  // Reduced font size for value
          fontWeight: "600",
          color: "#333",
          margin: "0",
        }}
      >
        {value}
      </p>

      {/* Change indicator */}
      <p
        style={{
          color: isPositive ? "#27AE60" : "#E74C3C",  // Green for positive, Red for negative
          fontSize: "12px",  // Smaller font for change percentage
          marginTop: "8px",  // Reduced margin
          display: "flex",
          alignItems: "center",
        }}
      >
        {isPositive ? "▲" : "▼"} {Math.abs(change)}% vs last month
      </p>
    </div>
  );
};
export default MetricCard