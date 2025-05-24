import React, { useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar, Download, RefreshCw } from 'lucide-react';

// Sample data to use when no stats are provided
const sampleData = {
  weeklyData: [
    { name: 'Mon', visitors: 120, appointments: 18 },
    { name: 'Tue', visitors: 145, appointments: 23 },
    { name: 'Wed', visitors: 130, appointments: 19 },
    { name: 'Thu', visitors: 150, appointments: 25 },
    { name: 'Fri', visitors: 160, appointments: 28 },
    { name: 'Sat', visitors: 180, appointments: 30 },
    { name: 'Sun', visitors: 120, appointments: 15 }
  ],
  monthlyData: [
    { name: 'Week 1', visitors: 850, appointments: 125 },
    { name: 'Week 2', visitors: 740, appointments: 110 },
    { name: 'Week 3', visitors: 900, appointments: 155 },
    { name: 'Week 4', visitors: 1005, appointments: 175 }
  ],
  yearlyData: [
    { name: 'Jan', visitors: 3200, appointments: 480 },
    { name: 'Feb', visitors: 3500, appointments: 520 },
    { name: 'Mar', visitors: 4100, appointments: 640 },
    { name: 'Apr', visitors: 4300, appointments: 710 },
    { name: 'May', visitors: 4800, appointments: 790 },
    { name: 'Jun', visitors: 5200, appointments: 850 },
    { name: 'Jul', visitors: 4900, appointments: 780 },
    { name: 'Aug', visitors: 5100, appointments: 810 },
    { name: 'Sep', visitors: 5500, appointments: 920 },
    { name: 'Oct', visitors: 5800, appointments: 960 },
    { name: 'Nov', visitors: 6000, appointments: 1020 },
    { name: 'Dec', visitors: 6400, appointments: 1080 }
  ]
};

function StatsContent({ stats = {} }) {
  const [timeFrame, setTimeFrame] = useState('month');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Use provided stats or fallback to sample data
  const statsData = stats || {};
  
  const refreshData = () => {
    setIsRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1500);
  };

  // Filter data based on selected time frame with safety fallbacks
  const getTimeFrameData = () => {
    // Use provided stats data or fallback to sample data
    const data = {
      weeklyData: statsData.weeklyData || sampleData.weeklyData,
      monthlyData: statsData.monthlyData || sampleData.monthlyData,
      yearlyData: statsData.yearlyData || sampleData.yearlyData
    };
    
    switch(timeFrame) {
      case 'week':
        return data.weeklyData;
      case 'month':
        return data.monthlyData;
      case 'year':
        return data.yearlyData;
      default:
        return data.monthlyData;
    }
  };

  const visitorData = getTimeFrameData();
  
  // Calculate summary metrics
  const totalVisitors = visitorData.reduce((sum, item) => sum + (item.visitors || 0), 0);
  const totalAppointments = visitorData.reduce((sum, item) => sum + (item.appointments || 0), 0);
  const conversionRate = totalVisitors > 0 ? ((totalAppointments / totalVisitors) * 100).toFixed(1) : 0;

  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-6 mt-15">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-gray-500 text-xs sm:text-sm uppercase font-semibold mb-2">Total Visitors</h3>
          <div className="flex items-end">
            <p className="text-2xl sm:text-3xl font-bold">{totalVisitors.toLocaleString()}</p>
            <span className="ml-2 text-xs sm:text-sm text-green-500">+5.2%</span>
          </div>
          <p className="mt-2 text-xs sm:text-sm text-gray-500">vs. previous period</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-gray-500 text-xs sm:text-sm uppercase font-semibold mb-2">Total Appointments</h3>
          <div className="flex items-end">
            <p className="text-2xl sm:text-3xl font-bold">{totalAppointments.toLocaleString()}</p>
            <span className="ml-2 text-xs sm:text-sm text-green-500">+3.1%</span>
          </div>
          <p className="mt-2 text-xs sm:text-sm text-gray-500">vs. previous period</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4 sm:col-span-2 lg:col-span-1">
          <h3 className="text-gray-500 text-xs sm:text-sm uppercase font-semibold mb-2">Conversion Rate</h3>
          <div className="flex items-end">
            <p className="text-2xl sm:text-3xl font-bold">{conversionRate}%</p>
            <span className="ml-2 text-xs sm:text-sm text-red-500">-0.8%</span>
          </div>
          <p className="mt-2 text-xs sm:text-sm text-gray-500">vs. previous period</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
          <h2 className="text-lg sm:text-xl font-semibold">Analytics Overview</h2>
          <div className="flex flex-wrap gap-3 w-full sm:w-auto">
            <div className="inline-flex border rounded-md shadow-sm">
              <button
                className={`px-3 py-1 text-xs sm:text-sm ${timeFrame === 'week' ? 'bg-blue-100 text-blue-800' : ''}`}
                onClick={() => setTimeFrame('week')}
              >
                Week
              </button>
              <button
                className={`px-3 py-1 text-xs sm:text-sm ${timeFrame === 'month' ? 'bg-blue-100 text-blue-800' : ''}`}
                onClick={() => setTimeFrame('month')}
              >
                Month
              </button>
              <button
                className={`px-3 py-1 text-xs sm:text-sm ${timeFrame === 'year' ? 'bg-blue-100 text-blue-800' : ''}`}
                onClick={() => setTimeFrame('year')}
              >
                Year
              </button>
            </div>
            <div className="inline-flex gap-1">
              <button
                className="p-1 rounded-md text-gray-500 hover:bg-gray-100"
                title="Refresh data"
                onClick={refreshData}
              >
                <RefreshCw size={16} className={`${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                className="p-1 rounded-md text-gray-500 hover:bg-gray-100"
                title="Download report"
              >
                <Download size={16} />
              </button>
              <button
                className="p-1 rounded-md text-gray-500 hover:bg-gray-100"
                title="Select date range"
              >
                <Calendar size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Visitors Line Chart */}
        <div>
          <h3 className="text-base sm:text-lg font-medium mb-4">Visitor Trends</h3>
          <div className="h-56 sm:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={visitorData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={30} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                <Line type="monotone" dataKey="visitors" stroke="#3B82F6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Appointments Bar Chart */}
        <div className="mt-6">
          <h3 className="text-base sm:text-lg font-medium mb-4">Appointment Conversions</h3>
          <div className="h-56 sm:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={visitorData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={30} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                <Bar dataKey="appointments" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <h2 className="text-lg sm:text-xl font-semibold mb-4">Conversion Breakdown</h2>
        <div className="w-full overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 table-fixed sm:table-auto">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Period
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Visitors
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Appointments
                </th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conversion Rate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {visitorData.map((item, index) => {
                const visitors = item.visitors || 0;
                const appointments = item.appointments || 0;
                const itemConversion = visitors > 0 ? ((appointments / visitors) * 100).toFixed(1) : 0;
                return (
                  <tr key={index}>
                    <td className="px-3 py-2 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                      {item.name}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                      {visitors.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                      {appointments.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                      {itemConversion}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default StatsContent;