import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { FaUserMd, FaBrain, FaUsers, FaBook, FaGraduationCap, FaAward, FaGlobe } from 'react-icons/fa';

function Stats() {
  const { currentTheme } = useTheme();

  const stats = [
    { icon: <FaUserMd />, count: "15+", label: "Years in Neurosurgery" },
    { icon: <FaBrain />, count: "500+", label: "Brain Tumor Resections" },
    { icon: <FaUsers />, count: "1000+", label: "Patient Consultations" },
    { icon: <FaBook />, count: "30+", label: "Peer-Reviewed Publications" },
    { icon: <FaGraduationCap />, count: "50+", label: "Trained Neurosurgeons" },
    { icon: <FaAward />, count: "3+", label: "National Awards" },
    { icon: <FaGlobe />, count: "15+", label: "International Conferences" },
  ];

  return (
    <div className="py-16 px-4" style={{ backgroundColor: currentTheme.surface }}>
      <div className="container mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="text-center group"
            >
              <div 
                className="text-3xl mb-3 flex justify-center transition-transform duration-300 group-hover:scale-110"
                style={{ color: currentTheme.primary }}
              >
                {stat.icon}
              </div>
              <div className="text-2xl md:text-3xl font-bold mb-2">
                {stat.count}
              </div>
              <p 
                className="text-sm"
                style={{ color: currentTheme.text.secondary }}
              >
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Stats;