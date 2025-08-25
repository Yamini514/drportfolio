// components/KeywordTable.jsx
import React from "react";

const KeywordTable = ({ keywords }) => {
  return (
    <div style={{ background: "#fff", padding: 20, borderRadius: 8 }}>
      <h3>Keyword Position Tracking</h3>
      <table style={{ width: "100%", marginTop: 10, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ backgroundColor: "#f0f0f0" }}>
            <th>Keyword</th>
            <th>Current Position</th>
            <th>Previous Position</th>
            <th>Change</th>
            <th>Traffic Potential</th>
          </tr>
        </thead>
        <tbody>
          {keywords.map((item, index) => (
            <tr key={index} style={{ borderBottom: "1px solid #ddd" }}>
              <td>
                <a href={item.url} target="_blank" rel="noopener noreferrer">
                  {item.keyword}
                </a>
              </td>
              <td>#{item.currentPosition}</td>
              <td>#{item.previousPosition}</td>
              <td>{item.change}</td>
              <td>{item.trafficPotential}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default KeywordTable;
