import React, { useEffect, useState } from "react";
import MetricCard from "../components/MetricCard";
import CoreWebVitalCard from "../components/CoreWebVitalCard";
import PagePerformanceTable from "../components/PagePerformanceTable";
import PerformanceBarChart from "../components/PerformanceBarChart";

const PageSpeed = () => {
  const [metrics, setMetrics] = useState({});
  const [coreVitals, setCoreVitals] = useState([]);
  const [pageData, setPageData] = useState([]);

  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;

  const pages = [
    "https://drlaxminadh-testing.netlify.app/",
    "https://drlaxminadh-testing.netlify.app/services",
    "https://drlaxminadh-testing.netlify.app/about",
    "https://drlaxminadh-testing.netlify.app/contact",
    // "https://drlaxminadh-testing.netlify.app/blog"
  ];

 const fetchPageSpeedData = async () => {
  try {
    const performanceResults = [];

    for (let pageUrl of pages) {
      const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(pageUrl)}&key=${apiKey}&category=performance&category=seo&category=accessibility&category=best-practices&strategy=mobile`;

      try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (!response.ok || data.error || !data.lighthouseResult) {
          console.warn(`❌ Skipped: ${pageUrl}`);
          console.warn("Reason:", data.error?.message || "Unknown error");
          continue; // skip this URL
        }

        const audits = data.lighthouseResult.audits || {};
        const categories = data.lighthouseResult.categories || {};

        const result = {
          page: pageUrl.replace("https://drlaxminadh-testing.netlify.app", "") || "/",
          performance: Math.round((categories.performance?.score ?? 0) * 100),
          seo: Math.round((categories.seo?.score ?? 0) * 100),
          accessibility: Math.round((categories.accessibility?.score ?? 0) * 100),
          bestPractices: Math.round((categories["best-practices"]?.score ?? 0) * 100),
          coreVitals: [
            {
              label: "Largest Contentful Paint",
              value: audits["largest-contentful-paint"]?.displayValue ?? "N/A",
              threshold: "2.5s",
              status: audits["largest-contentful-paint"]?.score >= 0.9 ? "Good" : "Needs Improvement"
            },
            {
              label: "First Contentful Paint",
              value: audits["first-contentful-paint"]?.displayValue ?? "N/A",
              threshold: "1.8s",
              status: audits["first-contentful-paint"]?.score >= 0.9 ? "Good" : "Needs Improvement"
            },
            {
              label: "First Input Delay",
              value: audits["max-potential-fid"]?.displayValue ?? "N/A",
              threshold: "100ms",
              status: audits["max-potential-fid"]?.score >= 0.9 ? "Good" : "Needs Improvement"
            },
            {
              label: "Cumulative Layout Shift",
              value: audits["cumulative-layout-shift"]?.displayValue ?? "N/A",
              threshold: "0.1",
              status: audits["cumulative-layout-shift"]?.score >= 0.9 ? "Good" : "Needs Improvement"
            },
            {
              label: "Speed Index",
              value: audits["speed-index"]?.displayValue ?? "N/A",
              threshold: "4.3s",
              status: audits["speed-index"]?.score >= 0.9 ? "Good" : "Needs Improvement"
            },
            {
              label: "Time to Interactive",
              value: audits["interactive"]?.displayValue ?? "N/A",
              threshold: "3.8s",
              status: audits["interactive"]?.score >= 0.9 ? "Good" : "Needs Improvement"
            }
          ]
        };

        performanceResults.push(result);

      } catch (err) {
        console.error(`🔥 Error fetching data for ${pageUrl}:`, err.message);
      }
    }

    if (performanceResults.length > 0) {
      setMetrics({
        performanceScore: performanceResults[0].performance,
        seoScore: performanceResults[0].seo,
        accessibility: performanceResults[0].accessibility,
        bestPractices: performanceResults[0].bestPractices
      });

      setCoreVitals(performanceResults[0].coreVitals);
    }

    setPageData(performanceResults);

  } catch (globalError) {
    console.error("🔥 Critical Error fetching PageSpeed data:", globalError);
  }
};

  useEffect(() => {
    fetchPageSpeedData();
  }, []);

  return (
    <div className="p-6 space-y-8">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Performance Score" value={metrics.performanceScore} />
        <MetricCard title="SEO Score" value={metrics.seoScore} />
        <MetricCard title="Accessibility" value={metrics.accessibility} />
        <MetricCard title="Best Practices" value={metrics.bestPractices} />
      </div>

      {/* Core Web Vitals */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Core Web Vitals</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {coreVitals.map((vital, index) => (
            <CoreWebVitalCard key={index} {...vital} />
          ))}
        </div>
      </div>

      {/* Table */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Page Performance Breakdown</h3>
        <PagePerformanceTable data={pageData} />
      </div>

      {/* Chart */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Performance Overview</h3>
        <div className="bg-white rounded-xl p-4 shadow">
          <PerformanceBarChart data={pageData} />
        </div>
      </div>
    </div>
  );
};

export default PageSpeed;
