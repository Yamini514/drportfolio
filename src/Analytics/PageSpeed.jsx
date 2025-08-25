import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const API_KEY = import.meta.env.VITE_KEY;
 // Replace with your actual API key
const baseUrl = 'https://drlaxminadh-testing.netlify.app';
const pagesToTest = ['/about', '/services', '/gallery', '/contact', '/publications', '/articles'];

// Helper to check if cache is older than 24 hours
const isCacheExpired = (timestamp) => {
  const oneDay = 24 * 60 * 60 * 1000; // milliseconds
  return !timestamp || (Date.now() - timestamp) > oneDay;
};

export default function PageSpeed() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);

  useEffect(() => {
    const cachedData = localStorage.getItem('pageSpeedResults');
    const cachedTimestamp = localStorage.getItem('pageSpeedTimestamp');

    if (cachedData && !isCacheExpired(cachedTimestamp)) {
      // Use cached data if not expired
      setResults(JSON.parse(cachedData));
      return;
    }

    const fetchAllPages = async () => {
      setLoading(true);
      setError(null);

      try {
        const responses = [];

        // Fetch sequentially to avoid bursts
        for (const path of pagesToTest) {
          console.log('Fetching PageSpeed for URL:', baseUrl + path);

          const res = await axios.get(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed`, {
            params: {
               url: baseUrl + path,
              

              key: API_KEY,
              strategy: 'mobile',
            },
            
          });
          responses.push(res);
          // Small delay between requests (e.g. 500ms)
          await new Promise((r) => setTimeout(r, 2000));
        }

        // Extract needed data for each page
        const extractedResults = responses.map((res, idx) => {
          const categories = res.data.lighthouseResult.categories;
          return {
            path: pagesToTest[idx],
            performance: categories.performance.score,
            seo: categories.seo.score,
            accessibility: categories.accessibility.score,
            bestPractices: categories['best-practices'].score,
          };
        });

        setResults(extractedResults);

        // Cache results and timestamp
        localStorage.setItem('pageSpeedResults', JSON.stringify(extractedResults));
        localStorage.setItem('pageSpeedTimestamp', Date.now().toString());

      } catch (err) {
        setError(err.message || 'Error fetching data');
      } finally {
        setLoading(false);
      }
    };

    fetchAllPages();
  }, []);

  // Chart data setup from results
  const barChartData = {
    labels: results.map((r) => r.path),
    datasets: [
      {
        label: 'Performance',
        backgroundColor: '#34d399',
        data: results.map((r) => Math.round(r.performance * 100)),
      },
      {
        label: 'SEO',
        backgroundColor: '#3b82f6',
        data: results.map((r) => Math.round(r.seo * 100)),
      },
      {
        label: 'Accessibility',
        backgroundColor: '#f59e0b',
        data: results.map((r) => Math.round(r.accessibility * 100)),
      },
      {
        label: 'Best Practices',
        backgroundColor: '#06b6d4',
        data: results.map((r) => Math.round(r.bestPractices * 100)),
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    plugins: { legend: { position: 'top' }, tooltip: { enabled: true } },
    scales: { y: { beginAtZero: true, max: 100 } },
  };

  const getBadgeColor = (score) => {
    if (score >= 0.9) return '#d1fae5'; // light green
    if (score >= 0.8) return '#fef3c7'; // light yellow
    return '#fee2e2'; // light red
  };

  return (
    <div style={{ padding: 30 }}>
      <h2>Page Speed Metrics for Site Pages</h2>

      {loading && <p>Loading all page metrics...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && results.length > 0 && (
        <>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              marginBottom: 40,
              backgroundColor: '#fff',
              borderRadius: 12,
              boxShadow: '0 0 10px rgba(0,0,0,0.05)',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: 12, fontWeight: 600 }}>Page</th>
                <th style={{ padding: 12, fontWeight: 600 }}>Performance</th>
                <th style={{ padding: 12, fontWeight: 600 }}>SEO</th>
                <th style={{ padding: 12, fontWeight: 600 }}>Accessibility</th>
                <th style={{ padding: 12, fontWeight: 600 }}>Best Practices</th>
              </tr>
            </thead>
            <tbody>
              {results.map((page, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: 12 }}>{page.path}</td>
                  {['performance', 'seo', 'accessibility', 'bestPractices'].map((key) => (
                    <td
                      key={key}
                      style={{
                        padding: 12,
                        backgroundColor: getBadgeColor(page[key]),
                        fontWeight: 600,
                        fontSize: 14,
                        color: key === 'accessibility' && page[key] < 0.9 ? '#b45309' : '#065f46',
                      }}
                    >
                      {Math.round(page[key] * 100)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div
            style={{
              maxWidth: 800,
              background: '#fff',
              padding: 20,
              borderRadius: 12,
              boxShadow: '0 0 12px rgba(0,0,0,0.04)',
              marginBottom: 40,
            }}
          >
            <Bar data={barChartData} options={barChartOptions} />
          </div>
        </>
      )}
    </div>
  );
}
