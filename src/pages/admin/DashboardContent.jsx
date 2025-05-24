// src/components/admin/DashboardContent.jsx
import React from 'react';
import { Calendar, MessageSquare, FileText } from 'lucide-react';

function DashboardContent({ stats, appointments, testimonials }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard Overview</h1>
        <div className="flex space-x-2">
          <select className="px-3 py-2 rounded border bg-white">
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
            <option>This Year</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">{stat.title}</h3>
            <div className="flex items-end justify-between mt-2">
              <p className="text-2xl font-bold">{stat.value}</p>
              <span className="text-sm font-medium" style={{ color: stat.color }}>{stat.increase}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium mb-4">Recent Activity</h2>
        <div className="space-y-4">
          <div className="flex items-start space-x-4 p-3 bg-blue-50 rounded-lg">
            <Calendar size={20} className="text-blue-500" />
            <div>
              <p className="font-medium">New appointment scheduled</p>
              <p className="text-sm text-gray-500">Sarah Davis - Tomorrow at 2:30 PM</p>
            </div>
          </div>
          <div className="flex items-start space-x-4 p-3 bg-green-50 rounded-lg">
            <MessageSquare size={20} className="text-green-500" />
            <div>
              <p className="font-medium">New testimonial received</p>
              <p className="text-sm text-gray-500">John Smith from ABC Corp - 2 hours ago</p>
            </div>
          </div>
          <div className="flex items-start space-x-4 p-3 bg-purple-50 rounded-lg">
            <FileText size={20} className="text-purple-500" />
            <div>
              <p className="font-medium">Service updated</p>
              <p className="text-sm text-gray-500">Website Development - Price updated - 5 hours ago</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium mb-4">Upcoming Appointments</h2>
          <div className="space-y-3">
            {appointments.slice(0, 2).map(appointment => (
              <div key={appointment.id} className="p-3 border border-gray-100 rounded-lg">
                <div className="flex justify-between">
                  <p className="font-medium">{appointment.name}</p>
                  <span className="text-sm text-blue-500">{appointment.service}</span>
                </div>
                <p className="text-sm text-gray-500">{appointment.date} - {appointment.time}</p>
              </div>
            ))}
            <button className="text-blue-500 text-sm font-medium mt-2">View All Appointments →</button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium mb-4">Recent Testimonials</h2>
          <div className="space-y-3">
            {testimonials.slice(0, 2).map(testimonial => (
              <div key={testimonial.id} className="p-3 border border-gray-100 rounded-lg">
                <div className="flex justify-between">
                  <p className="font-medium">{testimonial.name} - {testimonial.company}</p>
                  <div className="flex text-yellow-400">
                    {Array(5).fill(0).map((_, i) => (
                      <span key={i}>{i < testimonial.rating ? "★" : "☆"}</span>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-1">"{testimonial.content}"</p>
              </div>
            ))}
            <button className="text-blue-500 text-sm font-medium mt-2">View All Testimonials →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardContent;