const getScoreClass = (score) => {
  if (score === null || score === undefined) return "bg-gray-200 text-gray-700"; // Empty value style
  if (score >= 90) return "bg-green-100 text-green-700"; // Good
  if (score >= 70) return "bg-yellow-100 text-yellow-700"; // Average
  return "bg-red-100 text-red-700"; // Poor
};

const ScoreBadge = ({ score }) => (
  <span
    className={`px-2 py-1 rounded-full text-xs font-semibold ${getScoreClass(
      score
    )}`}
  >
    {score ?? "-"}
  </span>
);

const PagePerformanceTable = ({ data }) => (
  <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-100">
    <table className="min-w-full text-left text-sm">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-4 py-2 font-medium text-gray-600">Page</th>
          <th className="px-4 py-2 font-medium text-gray-600">Performance</th>
          <th className="px-4 py-2 font-medium text-gray-600">SEO</th>
          <th className="px-4 py-2 font-medium text-gray-600">Accessibility</th>
          <th className="px-4 py-2 font-medium text-gray-600">Best Practices</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr
            key={i}
            className="border-t border-gray-100 hover:bg-gray-50 transition"
          >
            <td className="px-4 py-2">{row.page || "-"}</td>
            <td className="px-4 py-2">
              <ScoreBadge score={row.performance} />
            </td>
            <td className="px-4 py-2">
              <ScoreBadge score={row.seo} />
            </td>
            <td className="px-4 py-2">
              <ScoreBadge score={row.accessibility} />
            </td>
            <td className="px-4 py-2">
              <ScoreBadge score={row.bestPractices} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default PagePerformanceTable;

