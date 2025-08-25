const LandingPagesTable = ({ pages }) => {
  return (
    <div>
      <h3>Top Landing Pages</h3>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f5f5f5" }}>
            <th>Page</th>
            <th>Sessions</th>
            <th>Bounce Rate</th>
            <th>Avg Duration</th>
          </tr>
        </thead>
        <tbody>
          {pages.map((page, idx) => (
            <tr key={idx} style={{ borderBottom: "1px solid #ddd" }}>
              <td>{page.path}</td>
              <td>{page.sessions}</td>
              <td style={{ color: page.bounceRate > 50 ? "red" : "green" }}>{page.bounceRate}%</td>
              <td>{page.avgDuration}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LandingPagesTable;
